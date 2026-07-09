# Tankrechner

Eine kleine Web-App im iPhone-Look zur Berechnung des Spritverbrauchs deines Autos.
Funktioniert als Progressive Web App (PWA) und kann auf dem iPhone über
„Zum Home-Bildschirm hinzufügen" wie eine echte App installiert werden.

## Funktionen

- **Tanken erfassen:** Datum, Kilometerstand, getankte Liter, Preis/Liter oder
  Gesamtkosten, Volltankung ja/nein, optionale Notiz.
- **Sofortige Berechnung:** Strecke seit letzter Tankung, Verbrauch in L/100 km,
  Kosten pro 100 km.
- **Statistik:** Durchschnittsverbrauch (basierend auf Volltankungen),
  Durchschnittspreis pro Liter, gefahrene Kilometer, getankte Menge,
  Gesamtausgaben, Kosten pro km.
- **Verlauf:** Liste aller Tankungen mit Lösch-Option.
- **Offline-fähig** dank Service Worker.
- **Lokale Speicherung** im Browser (localStorage) — keine Cloud, keine Konten.

## Installation auf dem iPhone

1. Die `index.html` auf einem Webserver oder per GitHub Pages bereitstellen.
2. In Safari die Seite öffnen.
3. Auf das Teilen-Symbol tippen → „Zum Home-Bildschirm".
4. Die App startet im Vollbild mit eigenem Icon.

## Lokales Testen

```bash
cd Tankrechner
python3 -m http.server 8080
# Browser: http://localhost:8080
```

## Berechnung des Verbrauchs

Der Verbrauch in L/100 km wird zwischen zwei **Volltankungen** berechnet:

```
Verbrauch = (Summe der Liter zwischen den Volltankungen) / Strecke × 100
```

Teiltankungen werden in der Summe berücksichtigt, aber nur an einer Volltankung
„abgerechnet". So bleibt die Durchschnittsberechnung mathematisch korrekt.
