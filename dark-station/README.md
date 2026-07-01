# ULTRON-08 — Dark Station

Eigenständige Version der **Dark Station** (Phase 1: simulierter Event-Stream,
kein echtes LLM, Kosten $0). Läuft komplett für sich — unabhängig von der
Dev·Dash-App im Rest des Repos.

Top-down-Ansicht einer Raumstation: **Räume = Agenten**, **Korridore =
Nachrichten**, **Leuchtpunkte = Übergaben**. Grüner Terminal-Look, Alien-Crew,
Sprechblasen, Missions-Queue und Event-Log.

## Starten

Voraussetzung: [Node.js](https://nodejs.org) (v18+) **oder** [Bun](https://bun.sh).

```bash
cd dark-station
npm install      # oder: bun install
npm run dev      # oder: bun run dev
```

Danach die in der Konsole gezeigte URL öffnen (Standard:
`http://127.0.0.1:5174`).

## Eigenes Sternen-Foto

Lege ein Bild als `public/station-bg.jpg` ab — es wird automatisch als
Hintergrund benutzt (sonst läuft ein prozeduraler Milchstraßen-Himmel).

## Struktur

```
dark-station/
├─ index.html          # Einstieg
├─ src/
│  ├─ main.tsx         # mountet die App
│  ├─ Station.tsx      # die komplette Station (Canvas + Panels + Simulation)
│  └─ index.css        # Reset + Font
├─ public/             # optionales station-bg.jpg
├─ package.json
└─ vite.config.ts
```

## Phasen

- **Phase 1 (hier):** rein optisch, simulierter Stream, gratis.
- **Phase 2+:** echtes Backend (WebSocket) + echte Agenten — noch nicht Teil
  dieses Ordners.
