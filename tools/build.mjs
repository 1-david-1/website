#!/usr/bin/env node
/**
 * Statischer Mini-Generator ohne Abhängigkeiten.
 *
 * Aufruf:  node tools/build.mjs     (oder: npm run build)
 *
 * Was passiert:
 *  - Navigation, Footer, <head>-Metadaten (Title, Description, Canonical, Open Graph, JSON-LD),
 *    Skript-Block, Breadcrumb und "Weitere Leistungen" werden aus site.config.json und partials/
 *    in alle Seiten geschrieben – und zwar zwischen den Markern  <!-- @build:NAME --> … <!-- @end:NAME -->.
 *  - Der Inhalt zwischen den Markern wird bei jedem Lauf ersetzt: dort NICHT von Hand editieren.
 *  - sitemap.xml und robots.txt werden erzeugt.
 *  - Die Tipps-Karten werden als statisches HTML vorgerendert (Quelle: tipsData in tipps/index.html).
 * Das Ergebnis wird committet; der Server liefert reines HTML aus (kein JS nötig für Navigation/Inhalt).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'site.config.json'), 'utf8'));
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const year = cfg.year ?? new Date().getFullYear();

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const stripTags = (s) => s.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim();
const slash = (href) => (/^(https?:|mailto:|#)/.test(href) || /\.[a-z0-9]+$/i.test(href) || href.endsWith('/')) ? href : href + '/';
const norm = (p) => (p.replace(/\/+$/, '') || '/');
const fill = (tpl, vars) => tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => (vars[k] ?? ''));

function setBlock(html, name, content) {
  const re = new RegExp(`<!-- @build:${name} -->[\\s\\S]*?<!-- @end:${name} -->`);
  if (!re.test(html)) return { html, found: false };
  return { html: html.replace(re, () => `<!-- @build:${name} -->\n${content}\n  <!-- @end:${name} -->`), found: true };
}

/* ───────── Navigation ───────── */
function navHtml(page) {
  const here = norm(page.path);
  const isActive = (href) => (norm(href) === '/' ? here === '/' : here === norm(href) || here.startsWith(norm(href) + '/'));
  const items = cfg.nav.map(({ href, label, shape }) => {
    const act = isActive(href);
    return `        <li class="menu-list-item" data-shape="${shape}"><a href="${slash(href)}" class="nav-link w-inline-block${act ? ' active' : ''}"${act ? ' aria-current="page"' : ''}><span class="nav-link-text">${esc(label)}</span><span class="nav-link-hover-bg"></span></a></li>`;
  }).join('\n');
  const services = cfg.services.map(({ href, label }) =>
    `          <li><a href="${slash(href)}"${isActive(href) ? ' aria-current="page"' : ''}>${esc(label)}</a></li>`).join('\n');
  return fill(read('partials/nav.html'), { menuItems: items, serviceLinks: services }).replace(/^/gm, '  ').replace(/^  $/gm, '');
}

function footerHtml() {
  const nav = cfg.nav.map((n) => `      <a href="${slash(n.href)}">${esc(n.label)}</a>`).join('\n');
  const sv = cfg.services.map((n) => `      <a href="${slash(n.href)}">${esc(n.label)}</a>`).join('\n');
  return fill(read('partials/footer.html'), { footerNav: nav, footerServices: sv, tagline: esc(cfg.tagline), email: cfg.email, linkedin: cfg.linkedin, year })
    .replace(/^/gm, '  ').replace(/^  $/gm, '');
}

/* ───────── Head ───────── */
const ld = (obj) => `<script type="application/ld+json">${JSON.stringify(obj).replace(/</g, '\\u003c')}</script>`;

function faqPairs(html) {
  const re = /<button class="faq-q-btn"[^>]*>([\s\S]*?)<span class="faq-icon">[\s\S]*?<\/button>\s*<div class="faq-answer">\s*<div class="faq-answer-inner">([\s\S]*?)<\/div>/g;
  const out = []; let m;
  while ((m = re.exec(html))) out.push([stripTags(m[1]), stripTags(m[2])]);
  return out;
}

function headHtml(page, rawHtml) {
  const url = cfg.url + page.path;
  const img = cfg.url + cfg.ogImage;
  const orgId = cfg.url + '/#organization';
  const org = { '@type': 'Organization', '@id': orgId, name: cfg.siteName, url: cfg.url, logo: cfg.url + '/assets/apple-touch-icon.png', email: cfg.email, sameAs: [cfg.linkedin], description: cfg.tagline, areaServed: { '@type': 'Country', name: 'Deutschland' } };
  const lines = [
    `<title>${esc(page.title)}</title>`,
    `<meta name="description" content="${esc(page.description)}">`,
    `<link rel="canonical" href="${url}">`,
    `<meta name="robots" content="${page.noindex ? 'noindex,follow' : 'index,follow,max-image-preview:large'}">`,
    `<meta name="theme-color" content="${cfg.themeColor}">`,
    `<link rel="icon" type="image/svg+xml" href="/assets/logo-mark.svg">`,
    `<link rel="apple-touch-icon" href="/assets/apple-touch-icon.png">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:site_name" content="${esc(cfg.siteName)}">`,
    `<meta property="og:locale" content="de_DE">`,
    `<meta property="og:title" content="${esc(page.title)}">`,
    `<meta property="og:description" content="${esc(page.description)}">`,
    `<meta property="og:url" content="${url}">`,
    `<meta property="og:image" content="${img}">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<link rel="preload" href="/assets/fonts/bricolage-grotesque-latin-opsz-normal.woff2" as="font" type="font/woff2" crossorigin>`,
    `<link rel="preload" href="/assets/fonts/instrument-sans-latin-400-normal.woff2" as="font" type="font/woff2" crossorigin>`,
    `<link rel="stylesheet" href="/css/fonts.css">`,
    `<noscript><style>.sr,.sr-l,.sr-r{opacity:1!important;transform:none!important}</style></noscript>`,
  ];
  const kinds = new Set(page.schema || []);
  if (kinds.has('organization')) lines.push(ld({ '@context': 'https://schema.org', ...org }));
  if (kinds.has('website')) lines.push(ld({ '@context': 'https://schema.org', '@type': 'WebSite', name: cfg.siteName, url: cfg.url, inLanguage: 'de-DE', publisher: { '@id': orgId } }));
  if (kinds.has('service')) lines.push(ld({ '@context': 'https://schema.org', '@type': 'Service', name: page.title.split(' – ')[0], description: page.description, serviceType: page.serviceType, url, areaServed: { '@type': 'Country', name: 'Deutschland' }, provider: { '@type': 'Organization', '@id': orgId, name: cfg.siteName, url: cfg.url } }));
  if (kinds.has('faq')) {
    const pairs = faqPairs(rawHtml);
    if (pairs.length) lines.push(ld({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: pairs.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) }));
  }
  if (kinds.has('breadcrumb') && page.crumbs) lines.push(ld({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: page.crumbs.map(([name, href], i) => ({ '@type': 'ListItem', position: i + 1, name, item: cfg.url + href })) }));
  return lines.map((l) => '  ' + l).join('\n');
}

function scriptsHtml(page) {
  const vendor = ['gsap', 'CustomEase', ...(page.scripts || [])];
  return [...vendor.map((v) => `  <script src="/vendor/${v}.min.js"></script>`), `  <script src="/js/main.js" defer></script>`].join('\n');
}

function breadcrumbHtml(page) {
  const c = page.crumbs || [];
  const parts = c.map(([name, href], i) => i === c.length - 1
    ? `<span class="breadcrumb-current" aria-current="page">${esc(name)}</span>`
    : `<a href="${href}">${esc(name)}</a><span class="breadcrumb-sep" aria-hidden="true">/</span>`);
  return `    <nav class="breadcrumb" aria-label="Brotkrumen">\n      ${parts.join('\n      ')}\n    </nav>`;
}

function spokeNextHtml(page) {
  const others = cfg.services.filter((s) => norm(s.href) !== norm(page.path));
  const links = others.map((s) => `        <a class="spoke-next-link" href="${slash(s.href)}"><span class="spoke-next-name">${esc(s.label)}</span><span class="spoke-next-teaser">${esc(s.teaser)}</span></a>`).join('\n');
  return `    <section class="spoke-next" aria-labelledby="spokeNextTitle">\n      <h2 id="spokeNextTitle">Weitere Leistungen</h2>\n      <div class="spoke-next-grid">\n${links}\n      </div>\n      <a class="spoke-next-all" href="/leistungen/">Alle Leistungen im Überblick</a>\n    </section>`;
}

/* ───────── Tipps (statisch vorgerendert) ───────── */
function parseTips(html) {
  const m = html.match(/const tipsData = (\[[\s\S]*?\n    \]);/);
  if (!m) return [];
  return new Function('return ' + m[1])();
}
function tipsGridHtml(tips) {
  return tips.map((tip, i) => `      <article class="tipp-card" data-index="${i}">
        <div class="tipp-icon"><img src="${tip.icon}" alt="" loading="lazy" width="48" height="48"></div>
        <p class="tipp-category">${esc(tip.cat)}</p>
        <h3 class="tipp-title">${esc(tip.title)}</h3>
        <p class="tipp-excerpt">${esc(stripTags(tip.body))}</p>
        <div class="tipp-footer"><span class="tipp-impact">Wirkung: ${esc(tip.impact)}</span></div>
      </article>`).join('\n');
}

/* ───────── Lauf ───────── */
let changed = 0;
for (const page of cfg.pages) {
  const file = path.join(ROOT, page.file);
  if (!fs.existsSync(file)) { console.warn(`! Datei fehlt: ${page.file}`); continue; }
  let html = fs.readFileSync(file, 'utf8');
  const before = html;
  const raw = html;
  const steps = [
    ['head', headHtml(page, raw)],
    ['nav', navHtml(page)],
    ['footer', footerHtml()],
    ['scripts', scriptsHtml(page)],
    ['breadcrumb', breadcrumbHtml(page)],
    ['spoke-next', spokeNextHtml(page)],
  ];
  if (page.path === '/tipps/') {
    const tips = parseTips(raw);
    steps.push(['tipps-grid', tipsGridHtml(tips)]);
    steps.push(['tipps-count', `${tips.length} Tipps`]);
  }
  steps.push(['headend', '  <link rel="stylesheet" href="/css/components.css">\n  <link rel="stylesheet" href="/css/type.css">']);
  for (const [name, content] of steps) html = setBlock(html, name, content).html;
  if (html !== before) { fs.writeFileSync(file, html); changed++; }
}

/* sitemap.xml + robots.txt */
const urls = cfg.pages.filter((p) => !p.noindex && p.sitemap !== false);
fs.writeFileSync(path.join(ROOT, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((p) => `  <url><loc>${cfg.url}${p.path}</loc></url>`).join('\n')}\n</urlset>\n`);
fs.writeFileSync(path.join(ROOT, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${cfg.url}/sitemap.xml\n`);

console.log(`Build fertig: ${cfg.pages.length} Seiten geprüft, ${changed} aktualisiert, ${urls.length} URLs in sitemap.xml.`);
