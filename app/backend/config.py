"""
config.py — Persists user preferences (especially the chosen data directory).

Config is stored in config.json next to this file.
On first run, a native folder picker dialog is shown.
"""

from __future__ import annotations

import json
import os
import sys
import threading
from pathlib import Path

if getattr(sys, 'frozen', False):
    CONFIG_FILE = Path(sys.executable).parent / "config.json"
    _DEFAULT_DATA_DIR = Path(sys.executable).parent / "data"
else:
    CONFIG_FILE = Path(__file__).parent / "config.json"
    _DEFAULT_DATA_DIR = Path(__file__).parent / "data"


def _load_raw() -> dict:
    if CONFIG_FILE.exists():
        try:
            return json.loads(CONFIG_FILE.read_text(encoding="utf-8"))
        except Exception:
            pass
    return {}


def _save_raw(data: dict) -> None:
    CONFIG_FILE.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")


def get_data_dir() -> Path:
    """Return the user-chosen data directory. Falls back to ./data."""
    cfg = _load_raw()
    p = cfg.get("data_dir")
    if p and Path(p).exists():
        return Path(p)
    return _DEFAULT_DATA_DIR


def set_data_dir(path: str | Path) -> None:
    """Persist a new data directory path."""
    p = Path(path)
    p.mkdir(parents=True, exist_ok=True)
    cfg = _load_raw()
    cfg["data_dir"] = str(p)
    _save_raw(cfg)


def get_config() -> dict:
    """Return full config dict (for API exposure)."""
    cfg = _load_raw()
    cfg["data_dir"] = str(get_data_dir())
    return cfg


def is_first_run() -> bool:
    """True if the user has never chosen a data directory."""
    cfg = _load_raw()
    return not cfg.get("data_dir")


def ask_folder_and_save() -> Path:
    """
    Open a native Windows folder picker dialog on the main thread
    and save the result. Returns the chosen (or default) path.
    Falls back to ./data if the user cancels.
    """
    chosen: list[str] = []

    def _pick() -> None:
        try:
            import tkinter as tk
            from tkinter import filedialog, messagebox

            root = tk.Tk()
            root.withdraw()
            root.attributes("-topmost", True)

            messagebox.showinfo(
                "CodonDocuManger — Choose Storage Folder",
                "Please choose a folder where CodonDocuManger will save all your captured guides "
                "and screenshots.\n\nYou can change this later from Settings in the app.",
                parent=root,
            )

            folder = filedialog.askdirectory(
                title="CodonDocuManger — Choose Guide Storage Folder",
                mustexist=False,
                parent=root,
            )
            root.destroy()
            if folder:
                chosen.append(folder)
        except Exception as e:
            print(f"[config] Folder picker failed: {e}")

    # Run on main thread (required for tkinter on Windows)
    if threading.current_thread() is threading.main_thread():
        _pick()
    else:
        t = threading.Thread(target=_pick, daemon=False)
        t.start()
        t.join(timeout=120)

    if chosen:
        set_data_dir(chosen[0])
        print(f"[config] Data directory set to: {chosen[0]}")
        return Path(chosen[0])
    else:
        # User cancelled — use default
        p = _DEFAULT_DATA_DIR
        set_data_dir(str(p))
        print(f"[config] Using default data directory: {p}")
        return p
