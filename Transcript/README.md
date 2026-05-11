# Transcript

Deutsches Diktier- und Lektorat-Tool mit Buchdesign — als installierbare Web-App (PWA). Sprich oder tippe deinen Text, das Tool transkribiert live und korrigiert ihn automatisch zu sauberem Schriftdeutsch.

**Live-Demo:** https://leilei0106.github.io/leilei0106/

## Features

- **Diktieren** per Mikrofon über die Web Speech API (de-DE, Chrome / Edge / Safari)
- **Live-Transkription** mit animierter Aufnahme-Anzeige (Equalizer, blinkender Rahmen)
- **Zwei Korrektur-Engines:**
  - **LanguageTool** (Standard, kein Schlüssel nötig) — Rechtschreibung, Grammatik, Zeichensetzung
  - **Claude KI** (Anthropic, eigener API-Schlüssel) — voller Lektoratsstil: Satzstellung, Schriftsprache, umgangssprachliche Wendungen umformulieren
- **Wort-genaue Änderungsanzeige** (Original → Ersetzung, oder farbig markierter Diff)
- **Buchdesign** — Serifenschrift, Initial, Papier-Optik
- **PWA** — als App installierbar (Android / iOS / Desktop), funktioniert offline weiter

## Bedienung

1. Auf **„Diktieren“** drücken und beim ersten Mal Mikrofonzugriff erlauben.
2. Sprechen — der Text erscheint live im Eingabefeld, ein Equalizer animiert die Aufnahme.
3. Auf **„Aufnahme stoppen“** drücken. Bei aktivem Haken wird automatisch korrigiert.
4. Der korrigierte Text erscheint rechts als Buchseite, darunter eine Liste / ein Diff der Änderungen.

## Claude-KI-Korrektur aktivieren

Für volle Satzumstellung und Umwandlung von gesprochener zu geschriebener Sprache:

1. Anthropic API-Schlüssel erstellen unter https://console.anthropic.com/settings/keys (kostenloser Free-Tier verfügbar).
2. In der App **Einstellungen → Korrektur-Engine → „Claude KI“** auswählen.
3. Schlüssel ins Feld einfügen.
4. Modell wählen:
   - **Opus 4.7** — höchste Qualität, Stand der Technik (empfohlen)
   - **Sonnet 4.6** — ausgewogen zwischen Geschwindigkeit und Qualität
   - **Haiku 4.5** — schnell und günstig für einfache Korrekturen

### Sicherheitshinweis

Der Schlüssel wird **nur im lokalen Browser** gespeichert (`localStorage`) und direkt an Anthropic gesendet. Er verlässt dein Gerät nicht in Richtung dieses Repositories. **Aber:** Wer die Web-App im selben Browser-Profil öffnet (z. B. nach Teilen des Links auf demselben Gerät), kann den Schlüssel über die DevTools auslesen. Verwende Claude-KI-Korrektur deshalb nur auf Geräten, die du allein nutzt.

## Installation als App

### Android (Chrome / Edge / Samsung Internet)

1. https://leilei0106.github.io/leilei0106/ öffnen
2. Banner „App installieren“, oder Button **„App installieren“** in der Toolbar, oder Chrome-Menü (⋮) → **„App installieren“**

### iPhone / iPad (Safari)

1. Seite in **Safari** öffnen
2. Teilen-Knopf (↑-Symbol) → **„Zum Home-Bildschirm“** → Bestätigen

## Browser-Unterstützung

| Browser | Diktat | PWA-Installation | Claude-API |
| --- | --- | --- | --- |
| Android · Chrome / Edge / Samsung | Ja | Ja | Ja |
| iPhone · Safari (iOS ≥ 14.5) | Ja | Ja (Home-Bildschirm) | Ja |
| Desktop · Chrome / Edge | Ja | Ja | Ja |
| Desktop · Safari | Ja | Begrenzt | Ja |
| Firefox | Nein | Nein | Ja |

## Projektstruktur

```
Transcript/
├── index.html
├── style.css
├── script.js              # Speech, LanguageTool, Claude API, Word-Diff
├── sw.js                  # Service Worker (Offline-Cache)
├── manifest.webmanifest   # PWA-Manifest
├── icon.svg               # App-Icon
├── icon-maskable.svg      # Maskable-Icon (Android Adaptive)
└── README.md
```

## Hinweise zu den APIs

- **LanguageTool:** Kostenlose öffentliche API mit Limit von ca. 20 Anfragen pro Minute und 20.000 Zeichen pro Tag pro IP.
- **Claude KI:** Kosten pro Aufruf abhängig vom Modell (siehe https://www.anthropic.com/pricing). Eine durchschnittliche Korrektur (ca. 200 Wörter) kostet im Free-Tier bzw. mit Opus 4.7 wenige Cent.
