# Änderungen aus dem Review (November 2026)

Alle Fixes wurden im Headless-Browser gegengeprüft (Desktop 1440 px und Mobil 390 px, alle 12 Seiten):
feste Navigation auch am Seitenende erreichbar, kein horizontaler Überlauf, genau ein H1, 0 Kontrast-Verstöße (WCAG AA, automatisch gemessen),
keine HTTP-Fehler, keine Konsolenfehler, keine Anfragen an Fremdserver.

## 1. Menü / Navigation (Ursache des „kein Weg zurück zum Menü“)
- **Ursache behoben:** `body>* { position: relative }` (main.css) überschrieb `nav { position: fixed }`. Die Kopfzeile ist jetzt `#nav` (höhere Spezifität) und bleibt beim Scrollen sichtbar.
- **Menü-Panel:** Die globale `nav {}`-Regel traf auch das Overlay und setzte es nach links. Jetzt rechts verankert; **eigener Schließen-Button im Panel** (vorher auf dem Handy vom Panel verdeckt), Esc und Klick auf den Hintergrund schließen ebenfalls.
- Overlay ist ein echter Dialog (`role="dialog"`, `aria-modal`), Fokus-Falle, Fokus-Rückgabe, Hintergrund `inert`; Sicherheitsnetz, falls die Schließ-Animation nicht endet.
- Menü kennt jetzt die drei Leistungs-Unterseiten; in der Kopfzeile steht ein dauerhafter „Anfrage stellen“-Button (ab 720 px).
- **Alle drei Leistungs-Unterseiten:** Breadcrumb, Footer mit Hauptnavigation und Block „Weitere Leistungen“ (Webseiten hatte vorher weder Footer noch Breadcrumb).
- Skip-Link „Zum Inhalt springen“, `<main id="main">` auf jeder Seite (Prozess und Kontakt hatten kein `<main>`).

## 2. Layout-Fehler
- `--nav-h` war nirgends definiert → Hero der Webseiten-Seite ohne Padding (Text am Rand), Tipps-Sidebar nicht sticky. Jetzt `--nav-h: 68px` in `:root`.
- **Mobile Startseite:** Hero lief aus dem Bild (`min-width: 23ch` + `nowrap` am getippten Wort). Wort darf jetzt umbrechen; weiche Trennstellen in langen Begriffen; alle 10 Begriffe bei 360–1440 px gemessen ohne Abschneiden.
- Typewriter: Tippfehler/Grammatik entfernt („Videoueberwachung-Dienste“ usw.), Begriffe neu; H1 enthält statischen, zugänglichen Text (vorher `aria-live` auf jedem Buchstaben).
- Tipps auf dem Handy einspaltig (vorher feste 280-px-Sidebar → Seite doppelt so breit wie das Handy). Überlauf auf Prozess und Webseiten beseitigt.
- Doppeltes Logo im Footer entfernt, Footer-Texte mit lesbarem Kontrast.

## 3. Architektur
- **Ein Footer, eine Navigation, ein `<head>`-Block** aus `partials/` + `site.config.json` (Build-Skript `tools/build.mjs`, keine Abhängigkeiten). Die Navigation ist statisches HTML und funktioniert ohne JavaScript; Inhalte mit `.sr` sind ohne JS sichtbar (`<noscript>`).
- Einheitliche Texte: Antwortzeit überall **48 Stunden** (Startseite sagte 24 h), „Webseiten“ statt „Webentwicklung“, Copyright-Jahr automatisch.
- `main.js` von 1238 auf rund 560 Zeilen: entfernt wurden JS-Navigation/-Footer, totes SPA-Erbe, Hero-Orb (war deaktiviert), Scramble-Text, Logo-Tilt/Partikel-Effekt (lief nie, siehe unten) und das Mausrad-Scroll-Hijacking.
- Totes CSS entfernt (Cursor/SPA-Seitensystem inkl. abgerissenem Selektor `button:hover ~ .page`).

## 4. Fremdressourcen / Performance / Datenschutz
- Google Fonts → **lokal** (`assets/fonts/`, gleiche Achsen wie zuvor). GSAP und opentype.js → **lokal** (`vendor/`). three.js, Draco, Draggable, Inertia/Physics2D entfernt (die beiden Plugins existieren in GSAP 3.12.2 nicht → vorher 404 auf jeder Seite).
- Unsplash-Stockfoto → **eigene SVG-Illustration** (Beispiel-Layout einer Sicherheitsfirmen-Seite).
- Fehlende Webfonts auf Prozess/Kontakt/Datenschutz behoben.
- Über-uns: 3D-Relief entfernt, weil `relief_model.glb` im Repo fehlte (leere schwarze Box). Block zum Wiedereinbauen: `docs/about-model-snippet.html`, Skript `js/about-model.js` liegt noch im Repo.

## 5. SEO
- Title, Meta-Description, Canonical, Open Graph, Twitter-Card auf **jeder** Seite aus einer Quelle; `og-image.png`, `apple-touch-icon.png`.
- JSON-LD: Organization, WebSite, Service, FAQPage (aus den FAQ-Akkordeons), BreadcrumbList.
- `sitemap.xml`, `robots.txt`, `404.html` (mit Navigation), Favicon auf allen Seiten.
- Kontakt: H1 ergänzt. Tipps: H1 „Marketing-Tipps für Sicherheitsunternehmen“ (statt „Resource Center“), Platzhalter-H2 „Titel hier“ entfernt, **Tipps-Karten als statisches HTML vorgerendert** (vorher nur per JS), Karten per Tastatur bedienbar, Modal mit Fokus-Rückgabe.

## 6. Repo-Hygiene / Sicherheit
- **Cloudflare-Security-Export (CSV) aus dem Repo entfernt** und `*.csv` in `.gitignore`. ⚠ Die Datei steckt weiter in der Git-Historie – siehe „Offen“.
- `CNAME` korrigiert (nur Hostname). `security.txt` nach `/.well-known/` verschoben, `.nojekyll` ergänzt (sonst liefert GitHub Pages den Ordner nicht aus).

## 7. Barrierefreiheit / Typografie / Gestaltung
- Kontrast: Textgrün `#0a7c42` (4,76:1 auf Creme), Flächengrün bleibt `#109e56`; auf dunklem Grund automatisch helles Grün. Grau-Text, Footer, Prozess-Tags, KI-Terminal angehoben.
- Typografie-System (`css/type.css`): Display / H1 / H2 / H3 / Eyebrow mit je eigener Familie, Gewicht und Laufweite statt neun H1- und acht H2-Größen; Hero-Größe bleibt groß (≈ 120 px), nur Laufweite −0,05 → −0,035 em und Zeilenhöhe 1,0.
- Zweifarbige Akzente nur noch im H1 (vorher 12 Überschriften). Eyebrows in normaler Schreibweise statt Mono-Versalien mit Strich.
- 29 Emojis → einheitliches Linien-Icon-Set (Lucide, ISC-Lizenz; `assets/icons.svg`). Nummern 01/02/03 nur noch dort, wo es eine Reihenfolge gibt (KI-Prozess). Nachgestellte „→“ an Buttons entfernt, Karten-Pfeile als SVG.
- Formular: Labels mit `for`/`id`, `autocomplete`, Datenschutz-Hinweis am Button, Honeypot-Feld gegen Spam.

## 8. Neu: Impressum und Datenschutzerklärung (ENTWÜRFE)
`/impressum/` und eine neu geschriebene `/datenschutz/` auf Basis dessen, was die Seite tatsächlich tut (keine Cookies, kein Tracking, lokale Schriften, Formspree, Server-Logs). **Gelb markierte Platzhalter `[[…]]` müssen ausgefüllt werden**, ich bin kein Anwalt – bitte rechtlich prüfen lassen.

---

## Offen (braucht deine Angaben oder Entscheidung)
1. **Impressum/Datenschutz ausfüllen:** ladungsfähige Anschrift, ggf. USt-IdNr., Hosting-Anbieter (und ob Cloudflare davor sitzt), Formspree-Auftragsverarbeitung/USA-Übermittlung, zuständige Datenschutzbehörde. `npm run check` listet alle Stellen.
2. **Git-Historie bereinigen** (die CSV ist dort noch abrufbar):
   `git filter-repo --path-glob 'Cloudflare_*SecurityInsights*.csv' --invert-paths` und anschließend `git push --force`. Inhalt als „bekannt geworden“ behandeln: die Befunde im Cloudflare-Dashboard abarbeiten.
3. **Antwortzeit:** ich habe überall 48 Stunden vereinheitlicht (Mehrheit der Seiten). Wenn 24 h stimmt: in `index.html` (Zahlenleiste), `site.config.json` (Kontakt-Description), `kontakt/index.html`, `prozess/index.html`, `leistungen/paid-ads/index.html` ändern.
4. **Telefonnummer:** Eure Tipps raten Kunden zur klickbaren Telefonnummer im Header, die Seite hat selbst keine. Wenn gewünscht: in `partials/nav.html` und `partials/footer.html` ergänzen.
5. **Echte Fotos:** Gründerfoto, Beispiel-Projekte – kein einziges echtes Foto auf der Seite. Die SVG-Illustration ist nur ein Stockfoto-Ersatz.
6. **3D-Relief:** nur wieder einbauen, wenn `relief_model.glb` im Repo liegt (Anleitung in `docs/about-model-snippet.html`).
7. **Formspree testen:** Das neue Honeypot-Feld heißt `_gotcha` (Formspree-Standard) – einmal Testanfrage absenden.
8. **Nicht umgesetzt (Ideen aus dem Review, Gestaltungsarbeit):** Dienstplan statt drei Karten, Prozess als Streifengang, „Verpasster-Anruf“-Rechner, Signalorange als Akzent.
