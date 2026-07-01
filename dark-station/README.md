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

## Live-Backend (optional, Phase 2)

Es gibt jetzt ein WebSocket-Backend in `server/`. Es ist **optional**:

- Läuft **nur das Frontend** → oben rechts steht **`◦ SIM`** (eingebaute
  Simulation, gratis).
- Startest du zusätzlich das Backend, verbindet sich das Frontend automatisch
  und zeigt **`● LIVE`** — die Events kommen dann vom Server.

Backend starten (zweites Terminal, [Python 3.10+](https://www.python.org)):

```bash
cd dark-station/server
pip install -r requirements.txt
python main.py
```

Details in `server/README.md`.

## Struktur

```
dark-station/
├─ index.html          # Einstieg
├─ src/
│  ├─ main.tsx         # mountet die App
│  ├─ Station.tsx      # die komplette Station (Canvas + Panels + WS-Client)
│  └─ index.css        # Reset + Font
├─ server/             # optionales FastAPI-WebSocket-Backend (Phase 2)
│  ├─ main.py
│  └─ requirements.txt
├─ public/             # optionales station-bg.jpg
├─ package.json
└─ vite.config.ts
```

## Phasen

- **Phase 1:** rein optisch, simulierter Stream, gratis. ✅
- **Phase 2 (jetzt):** WebSocket-Backend streamt den Workflow live — noch
  simuliert, kein LLM, gratis. ✅
- **Phase 3+:** `server/main.py` auf echte Agenten (LangGraph + LLM-API)
  umstellen — braucht API-Schlüssel und verursacht Kosten.
