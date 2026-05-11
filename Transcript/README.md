# Transcript

Deutsches Diktier- und Textkorrektur-Tool mit Buchdesign. Du sprichst (oder tippst) Text ein, das Tool transkribiert live, korrigiert Rechtschreibung und Grammatik automatisch und zeigt das Ergebnis im Stil einer Buchseite.

**Live-Demo:** https://leilei0106.github.io/leilei0106/

## Features

- **Diktieren** per Mikrofon über die Web Speech API (de-DE, Chrome / Edge / Safari)
- **Live-Transkription** — Zwischenergebnisse werden während des Sprechens angezeigt
- **Automatische Korrektur** über die [LanguageTool](https://languagetool.org)-API (de-DE)
- **Änderungsliste** — zeigt jede Korrektur (Original → Ersetzung)
- **Buchdesign** — Serifenschrift, Initial, Papier-Optik
- Komplett statisch — läuft im Browser, ohne Backend

## Bedienung

1. Auf **„Diktieren“** drücken und beim ersten Mal Mikrofonzugriff erlauben.
2. Sprechen — der Text erscheint live im Eingabefeld.
3. Auf **„Aufnahme stoppen“** drücken. Bei aktivem Haken wird automatisch korrigiert.
4. Der korrigierte Text erscheint rechts als Buchseite, darunter die Liste aller Änderungen.

## Browser-Unterstützung für Diktat

| Browser | Unterstützung |
| --- | --- |
| Chrome / Edge | Ja |
| Safari (macOS, iOS ≥ 14.5) | Ja |
| Firefox | Nein (Web Speech API nicht implementiert) |

Wenn der Browser die Erkennung nicht unterstützt, ist der Diktier-Button deaktiviert — Tippen und Korrigieren funktionieren weiterhin.

## Projektstruktur

```
Transcript/
├── index.html
├── style.css
├── script.js
└── README.md
```

## Hinweis zur API

Die kostenlose öffentliche LanguageTool-API hat ein Limit von ca. 20 Anfragen pro Minute und 20.000 Zeichen pro Tag pro IP. Für mehr lässt sich ein LanguageTool-Server selbst hosten.
