"""
drive.py - Direct Google Drive REST API integration using urllib.request.
Supports settings backup, projects syncing, and high-fidelity simulation mode.
"""

from __future__ import annotations

import json
import os
import sys
import time
import urllib.request
import urllib.parse
from pathlib import Path
from typing import Any

import config
import storage

# Global state to keep track of active connection settings
_DRIVE_STATE = {
    "simulation_mode": True,
    "user_email": "demo.user@gmail.com"
}

def get_drive_config() -> dict[str, Any]:
    """Load Drive-specific settings from global config."""
    cfg = config.get_config()
    return {
        "client_id": cfg.get("drive_client_id", ""),
        "client_secret": cfg.get("drive_client_secret", ""),
        "access_token": cfg.get("drive_access_token", ""),
        "refresh_token": cfg.get("drive_refresh_token", ""),
        "token_expiry": cfg.get("drive_token_expiry", 0),
        "connected": bool(cfg.get("drive_refresh_token")),
        "simulation": cfg.get("drive_simulation", True),
        "user_email": cfg.get("drive_user_email", _DRIVE_STATE["user_email"])
    }

def save_drive_config(data: dict[str, Any]) -> None:
    """Save Drive-specific settings back to config."""
    cfg = config.get_config()
    for k, v in data.items():
        cfg[f"drive_{k}"] = v
    # Persist
    config.set_data_dir(config.get_data_dir()) # triggers raw save
    # Update raw config file
    raw = config._load_raw()
    for k, v in data.items():
        raw[f"drive_{k}"] = v
    config._save_raw(raw)

def get_auth_url(client_id: str) -> str:
    """Generate the Google OAuth 2.0 redirect link."""
    redirect_uri = "http://localhost:8765/api/drive/callback"
    params = {
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": "https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.email",
        "access_type": "offline",
        "prompt": "consent"
    }
    return "https://accounts.google.com/o/oauth2/v2/auth?" + urllib.parse.urlencode(params)

def exchange_code_for_tokens(code: str, client_id: str, client_secret: str) -> dict[str, Any]:
    """Exchange authorization code for access and refresh tokens."""
    url = "https://oauth2.googleapis.com/token"
    redirect_uri = "http://localhost:8765/api/drive/callback"
    data = urllib.parse.urlencode({
        "code": code,
        "client_id": client_id,
        "client_secret": client_secret,
        "redirect_uri": redirect_uri,
        "grant_type": "authorization_code"
    }).encode("utf-8")
    
    req = urllib.request.Request(url, data=data, method="POST")
    req.add_header("Content-Type", "application/x-www-form-urlencoded")
    
    try:
        with urllib.request.urlopen(req) as res:
            tokens = json.loads(res.read().decode("utf-8"))
            
            # Fetch user email
            email = _fetch_user_email(tokens["access_token"])
            
            save_data = {
                "access_token": tokens["access_token"],
                "refresh_token": tokens.get("refresh_token", ""),
                "token_expiry": time.time() + tokens["expires_in"],
                "simulation": False,
                "user_email": email
            }
            save_drive_config(save_data)
            return {"success": True, "email": email}
    except Exception as e:
        print(f"[DRIVE] Token exchange failed: {e}")
        return {"success": False, "error": str(e)}

def _fetch_user_email(access_token: str) -> str:
    """Call Google Userinfo API to fetch email."""
    url = "https://www.googleapis.com/oauth2/v2/userinfo"
    req = urllib.request.Request(url)
    req.add_header("Authorization", f"Bearer {access_token}")
    try:
        with urllib.request.urlopen(req) as res:
            info = json.loads(res.read().decode("utf-8"))
            return info.get("email", "connected.user@gmail.com")
    except Exception:
        return "connected.user@gmail.com"

def refresh_access_token() -> str | None:
    """Check and refresh access token if expired."""
    cfg = get_drive_config()
    if not cfg["refresh_token"]:
        return None
    
    # If token still valid for next 5 minutes, skip refresh
    if cfg["access_token"] and cfg["token_expiry"] > time.time() + 300:
        return cfg["access_token"]
        
    print("[DRIVE] Access token expired or close to expiry. Refreshing...")
    url = "https://oauth2.googleapis.com/token"
    data = urllib.parse.urlencode({
        "refresh_token": cfg["refresh_token"],
        "client_id": cfg["client_id"],
        "client_secret": cfg["client_secret"],
        "grant_type": "refresh_token"
    }).encode("utf-8")
    
    req = urllib.request.Request(url, data=data, method="POST")
    req.add_header("Content-Type", "application/x-www-form-urlencoded")
    
    try:
        with urllib.request.urlopen(req) as res:
            tokens = json.loads(res.read().decode("utf-8"))
            cfg["access_token"] = tokens["access_token"]
            cfg["token_expiry"] = time.time() + tokens["expires_in"]
            save_drive_config({
                "access_token": cfg["access_token"],
                "token_expiry": cfg["token_expiry"]
            })
            return cfg["access_token"]
    except Exception as e:
        print(f"[DRIVE] Token refresh failed: {e}")
        return None

def _google_api_call(method: str, path: str, body: dict | None = None, headers: dict | None = None) -> Any:
    """Helper to call Google Drive API using urllib."""
    token = refresh_access_token()
    if not token:
        raise ValueError("Google Drive is not connected or token refresh failed.")
        
    url = f"https://www.googleapis.com{path}"
    req_data = json.dumps(body).encode("utf-8") if body else None
    
    req = urllib.request.Request(url, data=req_data, method=method)
    req.add_header("Authorization", f"Bearer {token}")
    if body:
        req.add_header("Content-Type", "application/json")
        
    if headers:
        for k, v in headers.items():
            req.add_header(k, v)
            
    with urllib.request.urlopen(req) as res:
        return json.loads(res.read().decode("utf-8"))

def get_or_create_parent_folder() -> str:
    """Query or create the main CodonDocuManger parent folder in Drive."""
    query = urllib.parse.quote("name='CodonDocuManger' and mimeType='application/vnd.google-apps.folder' and trashed=false")
    res = _google_api_call("GET", f"/drive/v3/files?q={query}")
    files = res.get("files", [])
    if files:
        return files[0]["id"]
        
    # Create folder
    body = {
        "name": "CodonDocuManger",
        "mimeType": "application/vnd.google-apps.folder"
    }
    created = _google_api_call("POST", "/drive/v3/files", body)
    return created["id"]

def get_or_create_subfolder(parent_id: str, name: str) -> str:
    """Query or create a project subfolder inside parent folder."""
    query = urllib.parse.quote(f"name='{name}' and '{parent_id}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false")
    res = _google_api_call("GET", f"/drive/v3/files?q={query}")
    files = res.get("files", [])
    if files:
        return files[0]["id"]
        
    # Create
    body = {
        "name": name,
        "mimeType": "application/vnd.google-apps.folder",
        "parents": [parent_id]
    }
    created = _google_api_call("POST", "/drive/v3/files", body)
    return created["id"]

def upload_or_update_file(parent_id: str, filename: str, content: str, mime_type: str = "application/json") -> str:
    """Upload new file or update existing file under parents."""
    query = urllib.parse.quote(f"name='{filename}' and '{parent_id}' in parents and trashed=false")
    res = _google_api_call("GET", f"/drive/v3/files?q={query}")
    files = res.get("files", [])
    
    if files:
        # Update existing
        file_id = files[0]["id"]
        url = f"https://www.googleapis.com/upload/drive/v3/files/{file_id}?uploadType=media"
        token = refresh_access_token()
        
        req = urllib.request.Request(url, data=content.encode("utf-8"), method="PATCH")
        req.add_header("Authorization", f"Bearer {token}")
        req.add_header("Content-Type", mime_type)
        with urllib.request.urlopen(req) as r:
            return json.loads(r.read().decode("utf-8"))["id"]
    else:
        # Create metadata first
        body = {
            "name": filename,
            "parents": [parent_id]
        }
        metadata = _google_api_call("POST", "/drive/v3/files", body)
        file_id = metadata["id"]
        
        # Upload media content
        url = f"https://www.googleapis.com/upload/drive/v3/files/{file_id}?uploadType=media"
        token = refresh_access_token()
        
        req = urllib.request.Request(url, data=content.encode("utf-8"), method="PATCH")
        req.add_header("Authorization", f"Bearer {token}")
        req.add_header("Content-Type", mime_type)
        with urllib.request.urlopen(req) as r:
            return file_id

# ─── High-Level APIs ─────────────────────────────────────────────────────────

def sync_all_data() -> dict[str, Any]:
    """Sync all projects, sessions, HTML exports and settings to Google Drive."""
    cfg = get_drive_config()
    if cfg["simulation"]:
        print("[DRIVE] Running manual backup in SIMULATION MODE...")
        time.sleep(1.0) # mock delay
        return {"success": True, "simulation": True}
        
    try:
        parent_id = get_or_create_parent_folder()
        
        # 1. Sync Settings (config.json)
        local_config = config.get_config()
        # strip private tokens before sync
        sync_config = {k: v for k, v in local_config.items() if not k.startswith("drive_")}
        upload_or_update_file(parent_id, "settings.json", json.dumps(sync_config, indent=2))
        
        # 2. Sync Projects & Guides
        projects = storage.load_projects()
        for p in projects:
            p_folder_id = get_or_create_subfolder(parent_id, p["name"])
            
            # Fetch sessions for this project
            sessions = storage.list_sessions(p["id"])
            for s in sessions:
                # Get full detailed session with steps
                full_session = storage.get_session(s["id"])
                if full_session:
                    # Upload session metadata timeline
                    upload_or_update_file(p_folder_id, f"guide_{s['id'][:8]}.json", json.dumps(full_session, indent=2))
                    
        return {"success": True, "simulation": False}
    except Exception as e:
        print(f"[DRIVE] Sync all failed: {e}")
        return {"success": False, "error": str(e)}

def load_settings_from_drive() -> dict[str, Any] | None:
    """Download settings.json from Google Drive and return as config dict."""
    cfg = get_drive_config()
    if cfg["simulation"]:
        return None
        
    try:
        parent_id = get_or_create_parent_folder()
        query = urllib.parse.quote(f"name='settings.json' and '{parent_id}' in parents and trashed=false")
        res = _google_api_call("GET", f"/drive/v3/files?q={query}")
        files = res.get("files", [])
        if not files:
            return None
            
        file_id = files[0]["id"]
        # Download content
        url = f"https://www.googleapis.com/drive/v3/files/{file_id}?alt=media"
        token = refresh_access_token()
        
        req = urllib.request.Request(url)
        req.add_header("Authorization", f"Bearer {token}")
        with urllib.request.urlopen(req) as r:
            return json.loads(r.read().decode("utf-8"))
    except Exception as e:
        print(f"[DRIVE] Failed to load settings from drive: {e}")
        return None

def list_drive_files() -> list[dict[str, Any]]:
    """Return a directory file explorer tree of CodonDocuManger in Google Drive."""
    cfg = get_drive_config()
    if cfg["simulation"]:
        # Mock high-fidelity directory tree
        return [
            {
                "name": "settings.json",
                "type": "file",
                "mimeType": "application/json",
                "size": "512 B",
                "modifiedTime": time.strftime("%Y-%m-%dT%H:%M:%SZ")
            },
            {
                "name": "Operations",
                "type": "folder",
                "children": [
                    {
                        "name": "guide_0a1b2c3d.json",
                        "type": "file",
                        "mimeType": "application/json",
                        "size": "4.2 KB",
                        "modifiedTime": time.strftime("%Y-%m-%dT%H:%M:%SZ")
                    },
                    {
                        "name": "guide_8e9f1a2b.json",
                        "type": "file",
                        "mimeType": "application/json",
                        "size": "12.8 KB",
                        "modifiedTime": time.strftime("%Y-%m-%dT%H:%M:%SZ")
                    }
                ]
            }
        ]
        
    try:
        parent_id = get_or_create_parent_folder()
        
        # Query files in parents
        query = urllib.parse.quote(f"'{parent_id}' in parents and trashed=false")
        res = _google_api_call("GET", f"/drive/v3/files?q={query}&fields=files(id,name,mimeType,size,modifiedTime)")
        files = res.get("files", [])
        
        tree = []
        for f in files:
            node = {
                "id": f["id"],
                "name": f["name"],
                "mimeType": f["mimeType"],
                "modifiedTime": f.get("modifiedTime", "")
            }
            
            if f["mimeType"] == "application/vnd.google-apps.folder":
                node["type"] = "folder"
                # Query subfiles
                sub_query = urllib.parse.quote(f"'{f['id']}' in parents and trashed=false")
                sub_res = _google_api_call("GET", f"/drive/v3/files?q={sub_query}&fields=files(id,name,mimeType,size,modifiedTime)")
                sub_files = sub_res.get("files", [])
                
                children = []
                for sf in sub_files:
                    children.append({
                        "id": sf["id"],
                        "name": sf["name"],
                        "type": "file",
                        "mimeType": sf["mimeType"],
                        "size": f"{int(sf.get('size', 0))/1024:.1f} KB" if sf.get("size") else "N/A",
                        "modifiedTime": sf.get("modifiedTime", "")
                    })
                node["children"] = children
            else:
                node["type"] = "file"
                node["size"] = f"{int(f.get('size', 0))/1024:.1f} KB" if f.get("size") else "N/A"
                
            tree.append(node)
        return tree
    except Exception as e:
        print(f"[DRIVE] Failed to list files: {e}")
        return []
