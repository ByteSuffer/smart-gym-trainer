"""
backend/main.py
FastAPI application entry point.
"""

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from backend.database import engine, Base
from backend.routes import sessions
import json

# Create all database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Smart Gym Trainer API",
    description="AI-powered fitness tracking backend",
    version="1.0.0"
)

# Allow React frontend to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routes
app.include_router(sessions.router)


@app.get("/")
def root():
    return {"message": "Smart Gym Trainer API", "status": "running"}


@app.get("/health")
def health():
    return {"status": "ok"}


# ── WebSocket for live workout data ──────────────────────────────────────────
connected_clients = []


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    connected_clients.append(websocket)
    print(f"[WS] Client connected. Total: {len(connected_clients)}")
    try:
        while True:
            data = await websocket.receive_text()
            # Broadcast to all connected clients
            for client in connected_clients:
                if client != websocket:
                    await client.send_text(data)
    except WebSocketDisconnect:
        connected_clients.remove(websocket)
        print(f"[WS] Client disconnected. Total: {len(connected_clients)}")