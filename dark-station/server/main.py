"""
ULTRON-08 — Dark Station backend (Phase 2 scaffold).

A FastAPI WebSocket server that streams the science-crew workflow to the
frontend. Right now the events are *simulated* (no LLM, no cost) — this proves
the live pipeline. In a later phase the `next_event()` generator is replaced by
a real LangGraph run that calls actual LLM APIs and emits the same event shape.

Event shape (JSON) — identical to the frontend's FlowEv:
    {"from": "cmd", "to": "resA", "type": "DISPATCH",
     "text": "dispatch -> recherche a", "color": "#39ff9c"}

Run:
    cd dark-station/server
    pip install -r requirements.txt
    python main.py
    # -> ws://127.0.0.1:8000/ws
"""

from __future__ import annotations

import asyncio
import random

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse

app = FastAPI(title="Dark Station Backend", version="0.1.0")

# ── palette (matches the frontend C object) ───────────────────────────────
GREEN = "#39ff9c"
STEEL = "#4aa3ff"
AMBER = "#ffb347"
DEEP = "#ff2f52"
TOXIC = "#57e08a"
EMBER = "#ff7a4d"

RES_ROOMS = ["resA", "resB", "resG"]
ROOM_LABEL = {
    "cmd": "commander",
    "resA": "recherche a",
    "resB": "recherche b",
    "resG": "recherche g",
    "fact": "faktencheck",
    "confl": "widerspruch",
    "synth": "synthese",
    "crit": "kritiker",
    "cite": "zitation",
    "rep": "report",
}


def next_event() -> dict:
    """One plausible step of the science-crew pipeline (mirrors the frontend)."""
    roll = random.random()
    if roll < 0.28:
        to = random.choice(RES_ROOMS)
        return {"from": "cmd", "to": to, "type": "DISPATCH",
                "text": f"dispatch -> {ROOM_LABEL[to]}", "color": GREEN}
    if roll < 0.50:
        frm = random.choice(RES_ROOMS)
        return {"from": frm, "to": "fact", "type": "RESULT",
                "text": f"{ROOM_LABEL[frm]} returns findings", "color": STEEL}
    if roll < 0.62:
        return {"from": "fact", "to": "confl", "type": "CHECK",
                "text": "facts verified -> conflict scan", "color": AMBER}
    if roll < 0.72:
        return {"from": "confl", "to": "cmd", "type": "CONFLICT",
                "text": "contradiction flagged", "color": DEEP}
    if roll < 0.82:
        return {"from": "cmd", "to": "synth", "type": "SYNTH",
                "text": "synthesis started", "color": GREEN}
    if roll < 0.90:
        return {"from": "synth", "to": "crit", "type": "CRITIQUE",
                "text": "argument -> critique", "color": TOXIC}
    if roll < 0.96:
        return {"from": "cite", "to": "rep", "type": "CITE",
                "text": "citations verified", "color": AMBER}
    return {"from": "rep", "to": "cmd", "type": "REPORT",
            "text": "report section sealed", "color": EMBER}


@app.get("/")
async def root() -> JSONResponse:
    return JSONResponse({"service": "dark-station-backend", "ws": "/ws", "status": "ok"})


@app.websocket("/ws")
async def ws(sock: WebSocket) -> None:
    await sock.accept()
    print("[dark-station] client connected")
    try:
        # a small opening burst so the map lights up immediately
        for _ in range(3):
            await sock.send_json(next_event())
            await asyncio.sleep(0.3)
        while True:
            await sock.send_json(next_event())
            await asyncio.sleep(0.7 + random.random() * 0.9)
    except WebSocketDisconnect:
        print("[dark-station] client disconnected")
    except Exception as exc:  # keep the server alive on any per-socket error
        print(f"[dark-station] socket closed: {exc!r}")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=8000)
