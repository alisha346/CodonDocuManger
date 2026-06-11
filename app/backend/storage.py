"""
storage.py — JSON session/step persistence layer with multi-project & user support.

Sessions are stored as directories under ./data/<session_id>/
Each directory contains:
  - session.json  (metadata + list of step dicts)
  - screenshots/  (step_1.png, step_2.png, …)
"""

from __future__ import annotations

import json
import os
import shutil
import time
import uuid
from pathlib import Path
from typing import Any

import config

def _get_base() -> Path:
    """Always returns the current user-configured data directory."""
    p = config.get_data_dir()
    p.mkdir(parents=True, exist_ok=True)
    return p


# Expose BASE_DIR as a property so exporter and main.py can reference it
class _BaseDirProxy:
    def __truediv__(self, other: str) -> Path:
        return _get_base() / other
    def iterdir(self):
        return _get_base().iterdir()
    def __str__(self) -> str:
        return str(_get_base())
    def __fspath__(self) -> str:
        return str(_get_base())

BASE_DIR = _BaseDirProxy()  # type: ignore[assignment]


def _session_dir(session_id: str) -> Path:
    return _get_base() / session_id


def _screenshots_dir(session_id: str) -> Path:
    d = _session_dir(session_id) / "screenshots"
    d.mkdir(parents=True, exist_ok=True)
    return d


def _meta_path(session_id: str) -> Path:
    return _session_dir(session_id) / "session.json"


# ─── Default Data for Multi-Project / Multi-User ─────────────────────────────

DEFAULT_USERS = [
    {"username": "admin", "email": "admin@codon.team", "password": "admin123", "global_role": "Admin", "verified": True},
    {"username": "editor", "email": "editor@codon.team", "password": "editor123", "global_role": "User", "verified": True},
    {"username": "viewer", "email": "viewer@codon.team", "password": "viewer123", "global_role": "User", "verified": True}
]

DEFAULT_PROJECTS = [
    {
        "id": "operations-project-id",
        "name": "Operations",
        "team_url": "https://codon.team/operations",
        "admin_name": "Admin User",
        "branding": {"logo": "", "colors": ["#a855f7", "#7c3aed"], "font": "Default Font"},
        "members": [
            {"username": "admin", "role": "Admin"},
            {"username": "editor", "role": "Editor"},
            {"username": "viewer", "role": "Viewer"}
        ]
    }
]


def _users_file() -> Path:
    return _get_base() / "users.json"


def _projects_file() -> Path:
    return _get_base() / "projects.json"


def load_users() -> list[dict]:
    f = _users_file()
    if not f.exists():
        f.write_text(json.dumps(DEFAULT_USERS, indent=2), encoding="utf-8")
        return DEFAULT_USERS
    try:
        return json.loads(f.read_text(encoding="utf-8"))
    except Exception:
        return DEFAULT_USERS


def save_users(users: list[dict]) -> None:
    _users_file().write_text(json.dumps(users, indent=2), encoding="utf-8")


def load_projects() -> list[dict]:
    f = _projects_file()
    if not f.exists():
        f.write_text(json.dumps(DEFAULT_PROJECTS, indent=2), encoding="utf-8")
        return DEFAULT_PROJECTS
    try:
        return json.loads(f.read_text(encoding="utf-8"))
    except Exception:
        return DEFAULT_PROJECTS


def save_projects(projects: list[dict]) -> None:
    _projects_file().write_text(json.dumps(projects, indent=2), encoding="utf-8")


# ─── Auth & Projects API Helpers ─────────────────────────────────────────────

def authenticate_user(username_or_email: str, password: str) -> dict | None:
    users = load_users()
    for u in users:
        is_user_match = u["username"].lower() == username_or_email.lower()
        is_email_match = u.get("email", "").lower() == username_or_email.lower()
        if (is_user_match or is_email_match) and u["password"] == password:
            return {
                "username": u["username"], 
                "email": u.get("email", ""), 
                "global_role": u["global_role"],
                "verified": u.get("verified", False)
            }
    return None


def create_user(username: str, password: str, email: str) -> dict | None:
    users = load_users()
    for u in users:
        if u["username"].lower() == username.lower():
            raise ValueError("Username already taken")
        if u.get("email", "").lower() == email.lower():
            raise ValueError("Email ID already registered")
            
    new_user = {
        "username": username,
        "email": email,
        "password": password,
        "global_role": "User",
        "verified": True
    }
    users.append(new_user)
    save_users(users)

    return {"username": username, "email": email, "global_role": "User", "verified": True}


def verify_user(username: str) -> bool:
    users = load_users()
    for u in users:
        if u["username"].lower() == username.lower():
            u["verified"] = True
            save_users(users)
            return True
    return False


def list_projects_for_user(username: str) -> list[dict]:
    projects = load_projects()
    users = load_users()
    
    global_role = "User"
    for u in users:
        if u["username"].lower() == username.lower():
            global_role = u["global_role"]
            break
            
    if global_role == "Admin":
        return projects
        
    user_projects = []
    for p in projects:
        for m in p.get("members", []):
            if m["username"].lower() == username.lower():
                user_projects.append(p)
                break
    return user_projects


def create_project(name: str, creator_username: str) -> dict:
    projects = load_projects()
    pid = str(uuid.uuid4())
    proj = {
        "id": pid,
        "name": name,
        "team_url": f"https://codon.team/{name.lower().replace(' ', '')}",
        "admin_name": creator_username,
        "branding": {"logo": "", "colors": ["#a855f7", "#7c3aed"], "font": "Default Font"},
        "members": [{"username": creator_username, "role": "Admin"}]
    }
    projects.append(proj)
    save_projects(projects)
    return proj


def delete_project(project_id: str) -> bool:
    projects = load_projects()
    before = len(projects)
    projects = [p for p in projects if p["id"] != project_id]
    if len(projects) == before:
        return False
    save_projects(projects)
    
    # Delete all sessions belonging to this project
    sessions = list_sessions(project_id)
    for s in sessions:
        delete_session(s["id"])
    return True


def get_project(project_id: str) -> dict | None:
    for p in load_projects():
        if p["id"] == project_id:
            return p
    return None


def update_project_settings(project_id: str, name: str, team_url: str, admin_name: str) -> dict | None:
    projects = load_projects()
    for p in projects:
        if p["id"] == project_id:
            p["name"] = name
            p["team_url"] = team_url
            p["admin_name"] = admin_name
            save_projects(projects)
            return p
    return None


def update_project_branding(project_id: str, logo: str, colors: list[str], font: str) -> dict | None:
    projects = load_projects()
    for p in projects:
        if p["id"] == project_id:
            p["branding"] = {
                "logo": logo,
                "colors": colors,
                "font": font
            }
            save_projects(projects)
            return p
    return None


def add_project_member(project_id: str, email_or_username: str, role: str) -> dict | None:
    users = load_users()
    user = None
    
    is_email = "@" in email_or_username
    for u in users:
        if is_email:
            if u.get("email", "").lower() == email_or_username.lower():
                user = u
                break
        else:
            if u["username"].lower() == email_or_username.lower():
                user = u
                break
                
    if not user:
        if is_email:
            username = email_or_username.split("@")[0]
            email = email_or_username
        else:
            username = email_or_username
            email = f"{username.lower()}@codon.team"
            
        user = {
            "username": username,
            "email": email,
            "password": "password123",
            "global_role": "User",
            "verified": True
        }
        users.append(user)
        save_users(users)
        
        # Log/Print invitation email containing credentials
        print("\n" + "="*80)
        print(f"[EMAIL] [EMAIL SIMULATOR] INVITATION EMAIL SENT TO: {email}")
        print(f"Subject: Invite to CodonDocuManger Project")
        print(f"Hello,")
        print(f"You have been invited to collaborate on a CodonDocuManger project.")
        print(f"Temporary credentials:")
        print(f"  Username: {username}")
        print(f"  Password: password123")
        print("="*80 + "\n")
    else:
        print(f"\n[EMAIL] [EMAIL SIMULATOR] Notification sent to {user.get('email')}: You have been added to the project.\n")
        
    projects = load_projects()
    for p in projects:
        if p["id"] == project_id:
            members = p.get("members", [])
            updated = False
            for m in members:
                if m["username"].lower() == user["username"].lower():
                    m["role"] = role
                    updated = True
                    break
            if not updated:
                members.append({"username": user["username"], "role": role})
            p["members"] = members
            save_projects(projects)
            return p
    return None


def remove_project_member(project_id: str, username: str) -> dict | None:
    projects = load_projects()
    for p in projects:
        if p["id"] == project_id:
            members = p.get("members", [])
            p["members"] = [m for m in members if m["username"].lower() != username.lower()]
            save_projects(projects)
            return p
    return None


# ─── Sessions ────────────────────────────────────────────────────────────────

def create_session(name: str = "", project_id: str = "operations-project-id") -> dict[str, Any]:
    sid = str(uuid.uuid4())
    now = time.time()
    meta: dict[str, Any] = {
        "id": sid,
        "name": name or f"Guide – {time.strftime('%b %d %H:%M')}",
        "project_id": project_id or "operations-project-id",
        "created_at": now,
        "updated_at": now,
        "steps": [],
    }
    _session_dir(sid).mkdir(parents=True, exist_ok=True)
    _screenshots_dir(sid)
    _save_meta(sid, meta)
    return meta


def list_sessions(project_id: str | None = None) -> list[dict[str, Any]]:
    result = []
    base = _get_base()
    for p in sorted(base.iterdir(), key=lambda x: x.stat().st_ctime, reverse=True):
        mp = p / "session.json"
        if mp.exists():
            try:
                data = json.loads(mp.read_text(encoding="utf-8"))
                sess_proj = data.get("project_id", "operations-project-id")
                if project_id is None or sess_proj == project_id:
                    data["project_id"] = sess_proj
                    result.append(data)
            except Exception:
                pass
    return result


def get_session(session_id: str) -> dict[str, Any] | None:
    mp = _meta_path(session_id)
    if not mp.exists():
        return None
    try:
        data = json.loads(mp.read_text(encoding="utf-8"))
        if "project_id" not in data:
            data["project_id"] = "operations-project-id"
        return data
    except Exception:
        return None


def update_session_name(session_id: str, name: str) -> dict[str, Any] | None:
    meta = get_session(session_id)
    if meta is None:
        return None
    meta["name"] = name
    meta["updated_at"] = time.time()
    _save_meta(session_id, meta)
    return meta


def delete_session(session_id: str) -> bool:
    d = _session_dir(session_id)
    if d.exists():
        shutil.rmtree(d)
        return True
    return False


# ─── Steps ───────────────────────────────────────────────────────────────────

def add_step(
    session_id: str,
    action_type: str,       # "click" | "type" | "scroll"
    description: str,
    app_name: str,
    window_title: str,
    screenshot_path: str | None,
    x: int = 0,
    y: int = 0,
    typed_text: str = "",
) -> dict[str, Any] | None:
    meta = get_session(session_id)
    if meta is None:
        return None
    step_num = len(meta["steps"]) + 1
    step: dict[str, Any] = {
        "id": str(uuid.uuid4()),
        "order": step_num,
        "type": action_type,
        "description": description,
        "app_name": app_name,
        "window_title": window_title,
        "x": x,
        "y": y,
        "typed_text": typed_text,
        "screenshot": screenshot_path,
        "timestamp": time.time(),
    }
    meta["steps"].append(step)
    meta["updated_at"] = time.time()
    _save_meta(session_id, meta)
    return step


def update_step_description(session_id: str, step_id: str, description: str) -> bool:
    meta = get_session(session_id)
    if meta is None:
        return False
    for s in meta["steps"]:
        if s["id"] == step_id:
            s["description"] = description
            meta["updated_at"] = time.time()
            _save_meta(session_id, meta)
            return True
    return False


def delete_step(session_id: str, step_id: str) -> bool:
    meta = get_session(session_id)
    if meta is None:
        return False
    before = len(meta["steps"])
    meta["steps"] = [s for s in meta["steps"] if s["id"] != step_id]
    if len(meta["steps"]) == before:
        return False
    # Renumber
    for i, s in enumerate(meta["steps"]):
        s["order"] = i + 1
    meta["updated_at"] = time.time()
    _save_meta(session_id, meta)
    return True


def reorder_steps(session_id: str, step_ids: list[str]) -> bool:
    meta = get_session(session_id)
    if meta is None:
        return False
    id_to_step = {s["id"]: s for s in meta["steps"]}
    new_steps = []
    for i, sid in enumerate(step_ids):
        if sid in id_to_step:
            id_to_step[sid]["order"] = i + 1
            new_steps.append(id_to_step[sid])
    meta["steps"] = new_steps
    meta["updated_at"] = time.time()
    _save_meta(session_id, meta)
    return True


def get_screenshot_path(session_id: str, step_order: int) -> Path:
    return _screenshots_dir(session_id) / f"step_{step_order}.png"


def _save_meta(session_id: str, meta: dict[str, Any]) -> None:
    _meta_path(session_id).write_text(
        json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8"
    )
