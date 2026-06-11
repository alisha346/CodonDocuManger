"""
main.py - FastAPI server for CodonDocuManger.
Upgraded with authentication, multi-project, branding, and role validation.
"""

from __future__ import annotations

import asyncio
import json
import threading
import webbrowser
from pathlib import Path
from typing import Any

import uvicorn
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, Query, Header, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse, PlainTextResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

import exporter
import recorder
import storage
import drive

# ─── App setup ───────────────────────────────────────────────────────────────

app = FastAPI(title="CodonDocuManger API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── WebSocket manager ────────────────────────────────────────────────────────

class ConnectionManager:
    def __init__(self) -> None:
        self._clients: list[WebSocket] = []

    async def connect(self, ws: WebSocket) -> None:
        await ws.accept()
        self._clients.append(ws)

    def disconnect(self, ws: WebSocket) -> None:
        if ws in self._clients:
            self._clients.remove(ws)

    def broadcast_sync(self, data: dict[str, Any]) -> None:
        """Thread-safe broadcast called from recorder thread."""
        msg = json.dumps(data)
        for ws in list(self._clients):
            try:
                asyncio.run_coroutine_threadsafe(
                    ws.send_text(msg), _loop
                )
            except Exception:
                pass


manager = ConnectionManager()
_loop: asyncio.AbstractEventLoop


@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket) -> None:
    await manager.connect(ws)
    try:
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(ws)


# ─── Pydantic models ──────────────────────────────────────────────────────────

class LoginBody(BaseModel):
    username: str
    password: str


class SignupBody(BaseModel):
    username: str
    email: str
    password: str


class CreateProjectBody(BaseModel):
    name: str
    creator: str


class UpdateProjectSettingsBody(BaseModel):
    name: str
    team_url: str
    admin_name: str


class UpdateProjectBrandingBody(BaseModel):
    logo: str
    colors: list[str]
    font: str


class ProjectMemberBody(BaseModel):
    username: str
    role: str


class CreateSessionBody(BaseModel):
    name: str = ""
    project_id: str = "operations-project-id"


class RenameSessionBody(BaseModel):
    name: str


class UpdateStepBody(BaseModel):
    description: str


class ReorderBody(BaseModel):
    step_ids: list[str]


# ─── Authentication Endpoint ──────────────────────────────────────────────────

@app.post("/api/login")
def login(body: LoginBody) -> dict:
    user = storage.authenticate_user(body.username, body.password)
    if not user:
        raise HTTPException(401, "Invalid username or password")
    return {"ok": True, "user": user}


@app.post("/api/signup")
def signup(body: SignupBody) -> dict:
    try:
        user = storage.create_user(body.username, body.password, body.email)
        if not user:
            raise HTTPException(400, "Registration failed")
        return {"ok": True, "user": user}
    except ValueError as e:
        raise HTTPException(400, str(e))


@app.get("/api/verify")
def verify_email(username: str) -> RedirectResponse:
    if storage.verify_user(username):
        return RedirectResponse("/?verified=true")
    raise HTTPException(404, "User not found")


# ─── Project Management Endpoints ─────────────────────────────────────────────

@app.get("/api/projects")
def list_projects(username: str = Query(...)) -> list:
    return storage.list_projects_for_user(username)


@app.post("/api/projects")
def create_project(body: CreateProjectBody) -> dict:
    # Only Admin users should create projects, validated at frontend or simple backend check
    return storage.create_project(body.name, body.creator)


@app.delete("/api/projects/{project_id}")
def delete_project(project_id: str, x_user_username: str = Header(None)) -> dict:
    proj = storage.get_project(project_id)
    if not proj:
        raise HTTPException(404, "Project not found")
        
    # Check if user is global Admin or project Admin
    users = storage.load_users()
    global_role = "User"
    for u in users:
        if u["username"].lower() == x_user_username.lower():
            global_role = u["global_role"]
            break
            
    is_proj_admin = any(m["username"].lower() == x_user_username.lower() and m["role"] == "Admin" for m in proj.get("members", []))
    
    if global_role != "Admin" and not is_proj_admin:
        raise HTTPException(403, "Access denied: Only project administrators can delete projects")

    if not storage.delete_project(project_id):
        raise HTTPException(404, "Project not found")
    return {"ok": True}


@app.patch("/api/projects/{project_id}/settings")
def update_project_settings(project_id: str, body: UpdateProjectSettingsBody) -> dict:
    p = storage.update_project_settings(project_id, body.name, body.team_url, body.admin_name)
    if not p:
        raise HTTPException(404, "Project not found")
    return p


@app.patch("/api/projects/{project_id}/branding")
def update_project_branding(project_id: str, body: UpdateProjectBrandingBody) -> dict:
    p = storage.update_project_branding(project_id, body.logo, body.colors, body.font)
    if not p:
        raise HTTPException(404, "Project not found")
    return p


@app.get("/api/projects/{project_id}/members")
def get_project_members(project_id: str) -> list:
    p = storage.get_project(project_id)
    if not p:
        raise HTTPException(404, "Project not found")
    return p.get("members", [])


@app.post("/api/projects/{project_id}/members")
def add_project_member(project_id: str, body: ProjectMemberBody) -> dict:
    p = storage.add_project_member(project_id, body.username, body.role)
    if not p:
        raise HTTPException(404, "Project not found")
    return p


@app.delete("/api/projects/{project_id}/members/{username}")
def remove_project_member(project_id: str, username: str) -> dict:
    p = storage.remove_project_member(project_id, username)
    if not p:
        raise HTTPException(404, "Project not found")
    return p


# ─── Session endpoints ────────────────────────────────────────────────────────

@app.post("/api/sessions")
def create_session(body: CreateSessionBody) -> dict:
    name = body.name.strip()
    if not name:
        raise HTTPException(400, "Guide name is mandatory")
    return storage.create_session(name, body.project_id)


@app.get("/api/sessions")
def list_sessions(project_id: str | None = None) -> list:
    return storage.list_sessions(project_id)


@app.get("/api/sessions/{session_id}")
def get_session(session_id: str) -> dict:
    s = storage.get_session(session_id)
    if not s:
        raise HTTPException(404, "Session not found")
    return s


@app.patch("/api/sessions/{session_id}")
def rename_session(session_id: str, body: RenameSessionBody) -> dict:
    s = storage.update_session_name(session_id, body.name)
    if not s:
        raise HTTPException(404, "Session not found")
    return s


@app.delete("/api/sessions/{session_id}")
def delete_session(session_id: str) -> dict:
    if not storage.delete_session(session_id):
        raise HTTPException(404, "Session not found")
    return {"ok": True}


# ─── Recording endpoints ──────────────────────────────────────────────────────

@app.post("/api/sessions/{session_id}/start")
def start_recording(session_id: str, mode: str = "screen") -> dict:
    s = storage.get_session(session_id)
    if not s:
        raise HTTPException(404, "Session not found")
    if recorder.is_recording():
        raise HTTPException(409, "Already recording")

    def _notify(step: dict) -> None:
        manager.broadcast_sync({"event": "new_step", "step": step})

    recorder.start_recording(session_id, notify_cb=_notify, mode=mode)
    return {"ok": True, "session_id": session_id}


@app.post("/api/sessions/{session_id}/stop")
def stop_recording(session_id: str) -> dict:
    sid = recorder.stop_recording()
    if not sid:
        raise HTTPException(409, "Not recording")
    manager.broadcast_sync({"event": "stopped", "session_id": sid})
    return {"ok": True, "session_id": sid}


@app.get("/api/recording/status")
def recording_status() -> dict:
    return {"active": recorder.is_recording()}


# ─── Step endpoints ───────────────────────────────────────────────────────────

@app.patch("/api/sessions/{session_id}/steps/{step_id}")
def update_step(session_id: str, step_id: str, body: UpdateStepBody) -> dict:
    ok = storage.update_step_description(session_id, step_id, body.description)
    if not ok:
        raise HTTPException(404, "Step not found")
    return {"ok": True}


@app.delete("/api/sessions/{session_id}/steps/{step_id}")
def delete_step(session_id: str, step_id: str) -> dict:
    ok = storage.delete_step(session_id, step_id)
    if not ok:
        raise HTTPException(404, "Step not found")
    return {"ok": True}


@app.post("/api/sessions/{session_id}/steps/reorder")
def reorder_steps(session_id: str, body: ReorderBody) -> dict:
    ok = storage.reorder_steps(session_id, body.step_ids)
    if not ok:
        raise HTTPException(404, "Session not found")
    return {"ok": True}


# ─── Export endpoints ─────────────────────────────────────────────────────────

@app.get("/api/sessions/{session_id}/export/html")
def export_html(session_id: str) -> HTMLResponse:
    s = storage.get_session(session_id)
    if not s:
        raise HTTPException(404)
    html = exporter.to_html(s)
    return HTMLResponse(
        content=html,
        headers={"Content-Disposition": f'attachment; filename="guide_{session_id[:8]}.html"'},
    )


@app.get("/api/sessions/{session_id}/export/markdown")
def export_markdown(session_id: str) -> PlainTextResponse:
    s = storage.get_session(session_id)
    if not s:
        raise HTTPException(404)
    md = exporter.to_markdown(s)
    return PlainTextResponse(
        content=md,
        headers={"Content-Disposition": f'attachment; filename="guide_{session_id[:8]}.md"'},
    )


@app.get("/api/sessions/{session_id}/export/pdf")
def export_pdf(session_id: str, background_tasks: BackgroundTasks) -> FileResponse:
    s = storage.get_session(session_id)
    if not s:
        raise HTTPException(404, "Session not found")
        
    html_content = exporter.to_html(s)
    
    import tempfile
    import subprocess
    import os
    from pathlib import Path
    
    # Write to a temporary HTML file
    temp_dir = Path(tempfile.gettempdir())
    html_path = temp_dir / f"guide_{session_id}.html"
    pdf_path = temp_dir / f"guide_{session_id}.pdf"
    
    with open(html_path, "w", encoding="utf-8") as f:
        f.write(html_content)
        
    # Helper to find Chrome/Edge
    def find_chrome_or_edge():
        paths = [
            r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
            r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
            r"C:\Program Files\Google\Chrome\Application\chrome.exe",
            r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
        ]
        for p in paths:
            if os.path.exists(p):
                return p
        return None
        
    browser_exe = find_chrome_or_edge()
    if not browser_exe:
        if html_path.exists():
            html_path.unlink()
        raise HTTPException(500, "No Chromium-based browser (Edge/Chrome) found to generate PDF")
        
    cmd = [
        browser_exe,
        "--headless",
        "--disable-gpu",
        "--no-sandbox",
        f"--print-to-pdf={pdf_path}",
        f"file:///{html_path.resolve()}"
    ]
    
    try:
        subprocess.run(cmd, check=True, timeout=20)
    except Exception as e:
        if html_path.exists():
            html_path.unlink()
        if pdf_path.exists():
            pdf_path.unlink()
        raise HTTPException(500, f"PDF generation failed: {e}")
        
    # Background cleanup
    def cleanup():
        try:
            if html_path.exists():
                html_path.unlink()
            if pdf_path.exists():
                pdf_path.unlink()
        except Exception:
            pass
            
    background_tasks.add_task(cleanup)
    
    return FileResponse(
        str(pdf_path),
        media_type="application/pdf",
        filename=f"guide_{session_id[:8]}.pdf"
    )



# ─── Screenshot serving ───────────────────────────────────────────────────────

@app.get("/api/screenshots/{session_id}/{filename}")
def get_screenshot(session_id: str, filename: str) -> FileResponse:
    p = storage.BASE_DIR / session_id / "screenshots" / filename
    if not p.exists():
        raise HTTPException(404, "Screenshot not found")
    return FileResponse(str(p), media_type="image/png")


# ─── Google Drive Endpoints ───────────────────────────────────────────────────

class DriveConfigBody(BaseModel):
    client_id: str
    client_secret: str
    simulation: bool = True

@app.get("/api/drive/config")
def get_drive_config() -> dict:
    return drive.get_drive_config()

@app.post("/api/drive/config")
def save_drive_config(body: DriveConfigBody) -> dict:
    drive.save_drive_config({
        "client_id": body.client_id,
        "client_secret": body.client_secret,
        "simulation": body.simulation
    })
    return {"ok": True}

@app.get("/api/drive/auth")
def get_drive_auth(client_id: str) -> dict:
    return {"url": drive.get_auth_url(client_id)}

@app.get("/api/drive/callback")
def drive_callback(code: str) -> RedirectResponse:
    import urllib.parse
    cfg = drive.get_drive_config()
    res = drive.exchange_code_for_tokens(code, cfg["client_id"], cfg["client_secret"])
    if res.get("success"):
        return RedirectResponse("/?drive=connected")
    return RedirectResponse(f"/?drive=error&detail={urllib.parse.quote(res.get('error','Unknown error'))}")

@app.get("/api/drive/files")
def list_drive_files() -> list:
    return drive.list_drive_files()

@app.post("/api/drive/sync")
def sync_drive() -> dict:
    res = drive.sync_all_data()
    return res

@app.post("/api/drive/disconnect")
def disconnect_drive() -> dict:
    drive.save_drive_config({
        "access_token": "",
        "refresh_token": "",
        "token_expiry": 0,
        "connected": False,
        "simulation": True,
        "user_email": "demo.user@gmail.com"
    })
    return {"ok": True}


# ─── Frontend static files ────────────────────────────────────────────────────

import sys
if getattr(sys, 'frozen', False):
    FRONTEND_DIST = Path(sys._MEIPASS) / "frontend" / "dist"
else:
    FRONTEND_DIST = Path(__file__).parent.parent / "frontend" / "dist"

if FRONTEND_DIST.exists():
    app.mount("/", StaticFiles(directory=str(FRONTEND_DIST), html=True), name="frontend")
else:
    @app.get("/")
    def root() -> PlainTextResponse:
        return PlainTextResponse(
            "Frontend not built yet. Run: cd frontend && npm run build"
        )


# ─── Startup ──────────────────────────────────────────────────────────────────

@app.on_event("startup")
async def startup() -> None:
    global _loop
    _loop = asyncio.get_running_loop()
    
    # Try restoring settings from Google Drive settings.json
    try:
        remote_settings = drive.load_settings_from_drive()
        if remote_settings:
            print("[DRIVE] Restoring config from Google Drive settings.json...")
            if "data_dir" in remote_settings:
                config.set_data_dir(remote_settings["data_dir"])
    except Exception as e:
        print(f"[DRIVE] Failed to load remote settings on startup: {e}")
        
    # Open browser after short delay so server is ready
    threading.Timer(1.2, lambda: webbrowser.open("http://localhost:8765")).start()


# ─── Entry point ─────────────────────────────────────────────────────────────

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8765)
