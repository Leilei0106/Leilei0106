# Transcript

Deutsches Textkorrektur-Tool mit Buchdesign. Du gibst Text ein, das Tool korrigiert Rechtschreibung und Grammatik automatisch und zeigt das Ergebnis im Stil einer Buchseite.

## Features

- Eingabe beliebiger deutscher Texte
- Automatische Korrektur über die [LanguageTool](https://languagetool.org)-API (de-DE)
- Übersicht der angewendeten Änderungen (Original → Ersetzung)
- Darstellung im Buchdesign (Serifenschrift, Initial, Papier-Optik)
- Komplett statisch — läuft im Browser, ohne Backend

## Verwenden

Öffne `index.html` direkt im Browser oder hoste das Verzeichnis statisch (z. B. via GitHub Pages).

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
