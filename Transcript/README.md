# Transcript

Deutsches Diktier- und Textkorrektur-Tool mit Buchdesign — als installierbare Web-App (PWA). Sprich oder tippe deinen Text, das Tool transkribiert live, korrigiert Rechtschreibung und Grammatik automatisch und zeigt das Ergebnis im Stil einer Buchseite.

**Live-Demo:** https://leilei0106.github.io/leilei0106/

## Features

- **Diktieren** per Mikrofon über die Web Speech API (de-DE, Chrome / Edge / Safari)
- **Live-Transkription** mit animierter Aufnahme-Anzeige (Equalizer, blinkender Rahmen)
- **Automatische Korrektur** über die [LanguageTool](https://languagetool.org)-API (de-DE)
- **Änderungsliste** — zeigt jede Korrektur (Original → Ersetzung)
- **Buchdesign** — Serifenschrift, Initial, Papier-Optik
- **PWA** — als App installierbar (Android / Desktop), funktioniert offline weiter

## Auf Android als App installieren

1. Öffne https://leilei0106.github.io/leilei0106/ in **Chrome** (oder Edge / Samsung Internet)
2. Es erscheint entweder unten der Banner „App installieren“, oder du nutzt den Knopf **„App installieren“** im UI
3. Alternativ: Chrome-Menü (⋮) → **„App installieren“** bzw. **„Zum Startbildschirm hinzufügen“**
4. Bestätigen — das Transcript-Icon erscheint auf dem Homescreen und startet die App im Vollbild ohne Browser-Leiste.

## Auf iPhone / iPad installieren

1. Öffne die Seite in **Safari**
2. Teilen-Knopf (↑-Symbol) → **„Zum Home-Bildschirm“**
3. Bestätigen

## Bedienung

1. Auf **„Diktieren“** drücken und beim ersten Mal Mikrofonzugriff erlauben.
2. Sprechen — der Text erscheint live im Eingabefeld, ein Equalizer animiert die Aufnahme.
3. Auf **„Aufnahme stoppen“** drücken. Bei aktivem Haken wird automatisch korrigiert.
4. Der korrigierte Text erscheint rechts als Buchseite, darunter die Liste aller Änderungen.

## Browser-Unterstützung für Diktat

| Browser | Diktat | PWA-Installation |
| --- | --- | --- |
| Android · Chrome / Edge / Samsung | Ja | Ja |
| iPhone · Safari (iOS ≥ 14.5) | Ja | Ja (Home-Bildschirm) |
| Desktop · Chrome / Edge | Ja | Ja |
| Desktop · Safari | Ja | Begrenzt |
| Firefox | Nein | Nein |

## Projektstruktur

```
Transcript/
├── index.html
├── style.css
├── script.js
├── sw.js                  # Service Worker (Offline-Cache)
├── manifest.webmanifest   # PWA-Manifest
├── icon.svg               # App-Icon
├── icon-maskable.svg      # Maskable-Icon (Android Adaptive)
└── README.md
```

## Hinweis zur API

Die kostenlose öffentliche LanguageTool-API hat ein Limit von ca. 20 Anfragen pro Minute und 20.000 Zeichen pro Tag pro IP. Für mehr lässt sich ein LanguageTool-Server selbst hosten.
