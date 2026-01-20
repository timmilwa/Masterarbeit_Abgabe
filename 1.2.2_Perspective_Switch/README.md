# Perspektiven-Generator

Eine React-Anwendung, die kreatives Denken fördert, indem sie Objekte aus verschiedenen Expertenperspektiven betrachtet.

## Funktionen

- **8 verschiedene Expertenrollen**: Von Anthropologin bis Zukunftsforscherin
- **KI-gestützte Perspektiven**: Generiert einzigartige Blickwinkel auf alltägliche Objekte
- **Moderne UI**: Responsive Design mit Tailwind CSS
- **Echtzeit-Generierung**: Sofortige Feedback von der Gemini AI

## Installation

```bash
npm install
```

## Verwendung

1. **API-Key einrichten**: Erstelle eine `.env`-Datei im Projektroot und füge deinen Google Gemini API-Key hinzu:
   ```
   VITE_GEMINI_API_KEY=dein_google_gemini_api_key_hier
   ```

2. **Entwicklungsserver starten**:
   ```bash
   npm run dev
   ```

3. **Build für Produktion**:
   ```bash
   npm run build
   ```

## Wie es funktioniert

1. Gib ein alltägliches Objekt in das Eingabefeld ein
2. Wähle eine Expertenrolle aus (z.B. "Anthropologin", "Musikerin")
3. Die KI generiert einen kurzen, prägnanten Wahrnehmungs-Impuls aus der Perspektive dieser Expertin
4. Verwende diesen "Filter", um das Objekt neu zu sehen

## Technologie-Stack

- **React 19** - Frontend Framework
- **Vite** - Build-Tool und Dev-Server
- **Tailwind CSS** - Styling
- **Lucide React** - Icons
- **Google Gemini AI** - KI-generierte Inhalte

## Projekt-Struktur

```
src/
├── App.jsx          # Hauptkomponente
├── main.jsx         # App-Einstiegspunkt
└── index.css        # Tailwind CSS Imports
```

## API-Anforderungen

Die App verwendet die Google Gemini API. Du benötigst:
- Einen gültigen API-Key von [Google AI Studio](https://makersuite.google.com/app/apikey)
- Eine stabile Internetverbindung für die KI-Anfragen