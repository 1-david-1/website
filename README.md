# InboxElevate – Website (statisch)

Reines HTML/CSS/JS, ausgeliefert z. B. über GitHub Pages. Kein Framework, **kein Laufzeit-Build**.
Nur beim Ändern von Navigation, Footer, Titeln/Descriptions oder Tipps wird einmal lokal gebaut (Node ≥ 18, keine Abhängigkeiten).

## Arbeiten an der Seite

```bash
npm run build   # schreibt Navigation, Footer, <head>-Metadaten, Skripte, Breadcrumbs, Sitemap, robots.txt in alle Seiten
npm run check   # Qualitäts-Check: Links, Meta-Tags, ein H1, keine Fremdserver, offene Platzhalter
```

Danach die geänderten Dateien committen – der Server liefert fertiges HTML aus.

| Was ändern? | Wo? |
|---|---|
| Menüpunkte, Leistungs-Links, Tagline, E-Mail, LinkedIn | `site.config.json` |
| Title, Description, Schema.org-Typ je Seite | `site.config.json` → `pages` |
| Aufbau von Menü / Footer | `partials/nav.html`, `partials/footer.html` |
| Neue Seite | Datei anlegen (Marker aus einer bestehenden Seite kopieren), Eintrag in `site.config.json`, `npm run build` |
| Tipps (Texte, Kategorien) | `tipsData` in `tipps/index.html` (die Karten werden beim Build als HTML vorgerendert) |

**Wichtig:** Zwischen `<!-- @build:… -->` und `<!-- @end:… -->` wird bei jedem Build alles überschrieben – dort nicht von Hand editieren.

## Struktur

```
css/main.css          Basis (Tokens, Layout, Komponenten der Startseite/Prozess/Über uns/Kontakt)
css/leistungen.css    Leistungs-Hub und Webseiten-Unterseite
css/components.css    Bausteine des Umbaus (Skip-Link, Menü-Zusatz, Breadcrumb, „Weitere Leistungen“, Fixes)
css/type.css          Typografie-System (Rollen Display / H1 / H2 / H3 / Eyebrow) – wird zuletzt geladen
css/fonts.css         Lokal gehostete Schriften (assets/fonts/)
js/main.js            Menü (Dialog, Fokus-Falle), Reveal, Zähler, Typewriter, Handschrift-Versprechen, Formular
vendor/               GSAP 3.12.2 (Core, CustomEase, ScrollTrigger) und opentype.js – lokal statt CDN
```

Keine Verbindung zu Fremdservern beim Seitenaufruf (Schriften und Skripte liegen lokal). Einzige externe Ziele: Formular-Versand (formspree.io) und der LinkedIn-Link.

## Vor dem Livegang ausfüllen

`npm run check` listet offene Platzhalter `[[…]]` (gelb markiert) in `impressum/` und `datenschutz/`. Diese Texte sind ein **Entwurf auf Basis der tatsächlichen Datenflüsse** und ersetzen keine Rechtsberatung – bitte prüfen lassen.
