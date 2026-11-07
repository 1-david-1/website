#!/usr/bin/env node
/**
 * Qualitäts-Check vor dem Veröffentlichen:   node tools/check.mjs   (oder: npm run check)
 *  - Build aktuell?  Genau ein <h1>, Title/Description/Canonical, <main id="main">, Skip-Link
 *  - Interne Links, Bilder, CSS/JS und Anker existieren
 *  - Keine Ressourcen von Fremdservern (Datenschutz): erlaubt sind nur Links (<a>) zu linkedin.com und das Formular-Ziel formspree.io
 *  - Offene Platzhalter [[…]] (Impressum/Datenschutz) werden als WARNUNG gelistet – vor dem Livegang ausfüllen!
 * Exit-Code 1 bei Fehlern.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'site.config.json'), 'utf8'));
const errors = [], warnings = [];
const err = (p, m) => errors.push(`${p}: ${m}`);

// 1) Build aktuell?
const b = spawnSync(process.execPath, [path.join(ROOT, 'tools/build.mjs')], { encoding: 'utf8' });
const m = /(\d+) aktualisiert/.exec(b.stdout || '');
if (m && m[1] !== '0') err('build', `war nicht aktuell (${m[1]} Seiten neu geschrieben) – bitte erneut prüfen und committen`);

const fileFor = (urlPath) => {
  const clean = decodeURIComponent(urlPath.split('#')[0].split('?')[0]);
  const rel = clean.replace(/^\//, '');
  const cands = [rel, path.join(rel, 'index.html'), rel + '.html'];
  return cands.map((c) => path.join(ROOT, c)).find((c) => fs.existsSync(c) && fs.statSync(c).isFile());
};
const idsCache = {};
const idsOf = (file) => (idsCache[file] ??= new Set([...fs.readFileSync(file, 'utf8').matchAll(/\bid="([^"]+)"/g)].map((x) => x[1])));

for (const page of cfg.pages) {
  const html = fs.readFileSync(path.join(ROOT, page.file), 'utf8');
  const P = page.file;
  const h1 = (html.match(/<h1[\s>]/g) || []).length;
  if (h1 !== 1) err(P, `${h1} <h1> gefunden (erwartet: genau 1)`);
  if (!/<title>[^<]+<\/title>/.test(html)) err(P, 'kein <title>');
  if (!/<meta name="description" content="[^"]{40,}"/.test(html)) err(P, 'Meta-Description fehlt oder ist zu kurz');
  if (!/<link rel="canonical"/.test(html)) err(P, 'Canonical fehlt');
  if (!/<html lang="de"/.test(html)) err(P, 'lang="de" fehlt');
  if (!/<main id="main"/.test(html)) err(P, '<main id="main"> fehlt');
  if (!/class="skip-link"/.test(html)) err(P, 'Skip-Link fehlt');
  for (const t of html.matchAll(/<img\b[^>]*>/g)) if (!/\balt=/.test(t[0])) err(P, `<img> ohne alt: ${t[0].slice(0, 60)}`);
  for (const mk of html.matchAll(/<!-- @build:([\w-]+) -->/g)) if (!html.includes(`<!-- @end:${mk[1]} -->`)) err(P, `Marker @build:${mk[1]} ohne @end`);

  // Interne Referenzen (a, link, script, img, use) und Fremdressourcen
  for (const r of html.matchAll(/<(a|link|script|img|use|form)\b[^>]*?\b(href|src|action)="([^"]+)"/g)) {
    const [, tag, , url] = r;
    if (/^(mailto:|tel:|javascript:|data:)/.test(url) || url.includes('${')) continue;
    if (/^https?:\/\//.test(url)) {
      const host = new URL(url).host;
      const ok = (tag === 'a' && /(^|\.)linkedin\.com$/.test(host)) || (tag === 'form' && host === 'formspree.io') || (tag === 'a' && host === 'inbox-elevate.de') || (tag === 'link' && host === 'inbox-elevate.de');
      if (!ok) err(P, `Fremdressource <${tag}> → ${url.slice(0, 70)}`);
      continue;
    }
    if (url.startsWith('#')) { if (url.length > 1 && !idsOf(path.join(ROOT, P)).has(url.slice(1))) err(P, `Anker ${url} existiert nicht`); continue; }
    const target = fileFor(url.startsWith('/') ? url : '/' + path.posix.join(path.posix.dirname('/' + P.replace(/index\.html$/, '')), url));
    if (!target) err(P, `kaputter Link/Pfad: ${url}`);
    else if (url.includes('#') && target.endsWith('.html') && !idsOf(target).has(url.split('#')[1])) err(P, `Anker fehlt: ${url}`);
  }
  // Fremdhosts in Inline-CSS/JS
  for (const u of html.matchAll(/url\((['"]?)(https?:\/\/[^)'"]+)\1\)/g)) err(P, `Fremd-URL in CSS: ${u[2].slice(0, 60)}`);

  const todo = (html.match(/\[\[/g) || []).length;
  if (todo) warnings.push(`${P}: ${todo} offene Platzhalter [[…]] – vor dem Livegang ausfüllen`);
}
for (const f of ['css/main.css', 'css/components.css', 'css/type.css', 'css/fonts.css', 'css/leistungen.css', 'css/tipps.css', 'js/main.js']) {
  const t = fs.readFileSync(path.join(ROOT, f), 'utf8');
  for (const u of t.matchAll(/(?:url\(\s*['"]?|['"`])(https?:\/\/[^)'"`\s]+)/g)) if (!/(w3\.org|schema\.org|linkedin\.com|formspree\.io)/.test(u[1])) err(f, `Fremd-URL: ${u[1].slice(0, 70)}`);
}
for (const f of ['sitemap.xml', 'robots.txt', 'CNAME', '.nojekyll', '.well-known/security.txt', 'assets/og-image.png', 'assets/apple-touch-icon.png']) if (!fs.existsSync(path.join(ROOT, f))) err(f, 'Datei fehlt');
if (fs.readFileSync(path.join(ROOT, 'CNAME'), 'utf8').trim().includes('/')) err('CNAME', 'darf nur den Hostnamen enthalten');
if (fs.readdirSync(ROOT).some((f) => f.endsWith('.csv'))) err('root', 'CSV-Datei im Repo-Root (würde veröffentlicht)');

console.log(`${cfg.pages.length} Seiten geprüft.`);
warnings.forEach((w) => console.log('⚠ ' + w));
if (errors.length) { console.log(`\n${errors.length} FEHLER:`); errors.forEach((e) => console.log('✗ ' + e)); process.exit(1); }
console.log('✓ Keine Fehler.');
