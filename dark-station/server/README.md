# Dark Station — Backend (Phase 2 scaffold)

FastAPI + WebSocket server that streams the workflow to the frontend.
Currently **simulated** (no LLM, no cost) — it proves the live pipeline. Later
the event generator is swapped for a real LangGraph run.

## Start

Voraussetzung: [Python 3.10+](https://www.python.org/downloads/).

```bash
cd dark-station/server
pip install -r requirements.txt
python main.py
```

→ Server läuft auf `http://127.0.0.1:8000` (WebSocket: `ws://127.0.0.1:8000/ws`).

## Zusammenspiel mit dem Frontend

- Läuft **nur das Frontend** (`npm run dev`) → oben rechts steht **`◦ SIM`**
  (die eingebaute Simulation, gratis).
- Läuft **auch dieser Server** → das Frontend verbindet sich automatisch und
  oben rechts steht **`● LIVE`** — die Events kommen jetzt vom Server.
- Stoppt der Server, schaltet das Frontend automatisch zurück auf `SIM`.

Es ist also egal, ob der Server läuft — das Frontend funktioniert immer.

## Nächster Schritt (Phase 3)

`next_event()` in `main.py` durch einen echten **LangGraph**-Durchlauf ersetzen,
der echte LLM-APIs aufruft und dieselbe Event-Form sendet. Braucht dann einen
API-Schlüssel und verursacht Kosten.
