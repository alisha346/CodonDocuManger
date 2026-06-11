"""
recorder.py — Global mouse/keyboard listener + screenshot capture + Pillow highlight.
Upgraded with uiautomation, CodonDocuManger filtering, browser tab polling, and browser-only capture modes.
"""

from __future__ import annotations

import threading
import time
import ctypes
import ctypes.wintypes
from pathlib import Path
from typing import Any, Callable

import mss
from PIL import Image, ImageDraw
from pynput import keyboard, mouse
import uiautomation as auto

import storage

# ─── State ────────────────────────────────────────────────────────────────────

_state: dict[str, Any] = {
    "active": False,
    "session_id": None,
    "key_buffer": [],
    "key_timer": None,
    "scroll_timer": None,
    "scroll_direction": "down",   # tracks last scroll direction
    "last_x": 0,
    "last_y": 0,
    "mouse_listener": None,
    "keyboard_listener": None,
    "notify_cb": None,
    "mode": "screen",             # "screen" or "browser"
    "polling_thread": None,
    "polling_stop_event": None,
}

_lock = threading.Lock()

# Keys that flush the typing buffer
FLUSH_KEYS = {
    keyboard.Key.enter,
    keyboard.Key.tab,
    keyboard.Key.esc,
}

# Keys that are ignored for text buffering
SKIP_KEYS = {
    keyboard.Key.shift, keyboard.Key.shift_l, keyboard.Key.shift_r,
    keyboard.Key.ctrl, keyboard.Key.ctrl_l, keyboard.Key.ctrl_r,
    keyboard.Key.alt, keyboard.Key.alt_l, keyboard.Key.alt_r,
    keyboard.Key.caps_lock, keyboard.Key.cmd,
    keyboard.Key.f9,
}

KEY_DEBOUNCE = 1.5
SCROLL_DEBOUNCE = 1.0

# UIA Control Types mapping to human-readable names
_UIA_LABELS: dict[str, str] = {
    "ButtonControl": "Button",
    "EditControl": "text box",
    "ComboBoxControl": "dropdown",
    "ListControl": "list",
    "ListItemControl": "list item",
    "TextControl": "label",
    "CheckBoxControl": "checkbox",
    "RadioButtonControl": "radio button",
    "TabItemControl": "tab",
    "HyperlinkControl": "link",
    "DocumentControl": "document",
}

# URL regex
import re
_URL_RE = re.compile(r'https?://[^\s"<>]+|www\.[^\s"<>]+')


# ─── Helper: Check Browser Focus ──────────────────────────────────────────────

def _is_browser_focused() -> bool:
    try:
        import win32gui
        hwnd = win32gui.GetForegroundWindow()
        if not hwnd:
            return False
        class_name = win32gui.GetClassName(hwnd)
        return class_name in ["Chrome_WidgetWin_1", "MozillaWindowClass"]
    except Exception:
        return False


def _is_our_app_window(win_title: str) -> bool:
    title = win_title.lower()
    return (
        "codondocumanger" in title 
        or "localhost:8765" in title 
        or "127.0.0.1:8765" in title
        or "visual guide maker" in title
    )


# ─── Public API ───────────────────────────────────────────────────────────────

def start_recording(session_id: str, notify_cb: Callable[[dict], None] | None = None, mode: str = "screen") -> None:
    with _lock:
        if _state["active"]:
            return
        _state["active"] = True
        _state["session_id"] = session_id
        _state["key_buffer"] = []
        _state["notify_cb"] = notify_cb
        _state["mode"] = mode

        # Setup and start background tab/URL polling thread
        stop_event = threading.Event()
        _state["polling_stop_event"] = stop_event
        t = threading.Thread(target=_poll_active_window, args=(stop_event,), daemon=True)
        _state["polling_thread"] = t
        t.start()

    m_listener = mouse.Listener(
        on_click=_on_click,
        on_scroll=_on_scroll,
    )
    k_listener = keyboard.Listener(
        on_press=_on_key_press,
    )
    _state["mouse_listener"] = m_listener
    _state["keyboard_listener"] = k_listener
    m_listener.start()
    k_listener.start()


def stop_recording() -> str | None:
    with _lock:
        if not _state["active"]:
            return None
        _state["active"] = False
        sid = _state["session_id"]
        _state["session_id"] = None
        stop_event = _state.get("polling_stop_event")
        poll_thread = _state.get("polling_thread")

    # Stop polling thread
    if stop_event:
        stop_event.set()
    if poll_thread:
        try:
            poll_thread.join(timeout=1.0)
        except Exception:
            pass

    # Flush any remaining keystrokes
    _flush_key_buffer()

    for listener in (_state["mouse_listener"], _state["keyboard_listener"]):
        if listener:
            try:
                listener.stop()
            except Exception:
                pass
    _state["mouse_listener"] = None
    _state["keyboard_listener"] = None

    # Clean up last step if it is of our app
    if sid:
        session = storage.get_session(sid)
        if session and session["steps"]:
            last_step = session["steps"][-1]
            title = last_step.get("window_title", "").lower()
            desc = last_step.get("description", "").lower()
            if (
                _is_our_app_window(title)
                or "stop recording" in desc
                or "stop" in desc
            ):
                storage.delete_step(sid, last_step["id"])

    return sid


def is_recording() -> bool:
    return _state["active"]


# ─── Mouse handlers ───────────────────────────────────────────────────────────

def _on_click(x: int, y: int, button: mouse.Button, pressed: bool) -> None:
    if not pressed:
        return
    with _lock:
        if not _state["active"]:
            return
            
    # Ignore actions inside the CodonDocuManger window
    _, win_title = _active_window()
    if _is_our_app_window(win_title):
        return

    # In Browser-Only mode, ignore click if it occurred in non-browser window
    with _lock:
        mode = _state.get("mode", "screen")
    if mode == "browser" and not _is_browser_focused():
        return

    with _lock:
        _state["last_x"] = x
        _state["last_y"] = y
        sid = _state["session_id"]

    # Flush any pending keystrokes first
    _flush_key_buffer()

    _, win_title = _active_window()

    # Check if this looks like a URL navigation (browser address bar click)
    url_match = _URL_RE.search(win_title)
    if url_match and button == mouse.Button.left:
        url = url_match.group(0)
        desc = f'Navigate to URL "{url}"'
    else:
        # Get the control label under the cursor using nearest button search
        ctypes.windll.ole32.CoInitialize(None)
        ctrl_label = ""
        is_button = False
        try:
            control = auto.ControlFromPoint(x, y)
            if control:
                ctrl_label, is_button = _find_nearest_button_or_name(x, y, control)
        except Exception as e:
            print(f"[recorder] UI Automation failed: {e}")
        finally:
            ctypes.windll.ole32.CoUninitialize()

        if button == mouse.Button.right:
            verb = "Right-clicking"
        else:
            verb = "Clicking"

        if ctrl_label:
            if is_button:
                desc = f'{verb} {ctrl_label} button'
            else:
                desc = f'{verb} {ctrl_label}'
        else:
            desc = verb

    screenshot_path = _capture_screen(x, y, sid, action="click")

    step = storage.add_step(
        session_id=sid,
        action_type="click",
        description=desc,
        app_name="",
        window_title=win_title,
        screenshot_path=str(screenshot_path) if screenshot_path else None,
        x=x,
        y=y,
    )
    if step and _state["notify_cb"]:
        _state["notify_cb"](step)


def _on_scroll(x: int, y: int, dx: int, dy: int) -> None:
    with _lock:
        if not _state["active"]:
            return
            
    # Ignore scroll inside CodonDocuManger window
    _, win_title = _active_window()
    if _is_our_app_window(win_title):
        return

    # Browser-Only mode check
    with _lock:
        mode = _state.get("mode", "screen")
    if mode == "browser" and not _is_browser_focused():
        return

    with _lock:
        _state["last_x"] = x
        _state["last_y"] = y
        # dy > 0 = scroll up, dy < 0 = scroll down (Windows convention)
        _state["scroll_direction"] = "up" if dy > 0 else "down"

    # Debounce: reset timer
    if _state["scroll_timer"]:
        _state["scroll_timer"].cancel()
    _state["scroll_timer"] = threading.Timer(SCROLL_DEBOUNCE, _flush_scroll, args=(x, y))
    _state["scroll_timer"].start()


def _flush_scroll(x: int, y: int) -> None:
    with _lock:
        if not _state["active"]:
            return
        sid = _state["session_id"]
        direction = _state.get("scroll_direction", "down")

    _, win_title = _active_window()
    screenshot_path = _capture_screen(x, y, sid, action="scroll", direction=direction)
    desc = f"Scroll {direction}"

    step = storage.add_step(
        session_id=sid,
        action_type="scroll",
        description=desc,
        app_name="",
        window_title=win_title,
        screenshot_path=str(screenshot_path) if screenshot_path else None,
        x=x,
        y=y,
    )
    if step and _state["notify_cb"]:
        _state["notify_cb"](step)


# ─── Keyboard handlers ────────────────────────────────────────────────────────

def _on_key_press(key: keyboard.Key) -> None:
    with _lock:
        if not _state["active"]:
            return
        sid = _state["session_id"]

    # Global stop hotkey - check first so it works even inside our app
    if key == keyboard.Key.f9:
        threading.Thread(target=stop_recording, daemon=True).start()
        return

    # Ignore keystrokes inside CodonDocuManger window
    _, win_title = _active_window()
    if _is_our_app_window(win_title):
        return

    # Browser-Only mode check
    with _lock:
        mode = _state.get("mode", "screen")
    if mode == "browser" and not _is_browser_focused():
        return

    if key in SKIP_KEYS:
        return

    if key in FLUSH_KEYS:
        _flush_key_buffer()
        return

    # Accumulate printable characters
    try:
        char = key.char
        if char:
            with _lock:
                _state["key_buffer"].append(char)
    except AttributeError:
        pass

    # Reset debounce timer
    if _state["key_timer"]:
        _state["key_timer"].cancel()
    _state["key_timer"] = threading.Timer(KEY_DEBOUNCE, _flush_key_buffer)
    _state["key_timer"].start()


def _flush_key_buffer() -> None:
    with _lock:
        if not _state["key_buffer"]:
            return
        text = "".join(_state["key_buffer"])
        _state["key_buffer"] = []
        if _state["key_timer"]:
            _state["key_timer"].cancel()
            _state["key_timer"] = None
        sid = _state["session_id"]
        x = _state["last_x"]
        y = _state["last_y"]
        active = _state["active"]

    if not active and not sid:
        return

    _, win_title = _active_window()
    screenshot_path = _capture_screen(x, y, sid, action="type")

    # Get the focused control's label/name for context
    field_name = _control_under_cursor(x, y, prefer_class=True)
    short = text if len(text) <= 40 else text[:40] + "…"

    if field_name:
        desc = f'Enter text "{short}" in {field_name}'
    else:
        desc = f'Enter text "{short}"'

    step = storage.add_step(
        session_id=sid,
        action_type="type",
        description=desc,
        app_name="",
        window_title=win_title,
        screenshot_path=str(screenshot_path) if screenshot_path else None,
        x=x,
        y=y,
        typed_text=text,
    )
    if step and _state["notify_cb"]:
        _state["notify_cb"](step)


# ─── Screen capture ───────────────────────────────────────────────────────────

def _capture_screen(x: int, y: int, session_id: str, action: str = "click", direction: str | None = None) -> Path | None:
    try:
        session = storage.get_session(session_id)
        if session is None:
            return None
        step_num = len(session["steps"]) + 1
        out_path = storage.get_screenshot_path(session_id, step_num)

        with mss.mss() as sct:
            # Find monitor that contains (x, y)
            monitor = sct.monitors[0]  # full virtual screen
            for m in sct.monitors[1:]:
                if m["left"] <= x < m["left"] + m["width"] and m["top"] <= y < m["top"] + m["height"]:
                    monitor = m
                    break
            raw = sct.grab(monitor)
            img = Image.frombytes("RGB", raw.size, raw.bgra, "raw", "BGRX")

        # Translate global coords to monitor-relative
        rx = x - monitor["left"]
        ry = y - monitor["top"]

        # Draw highlight overlay on the monitor screenshot
        img = _draw_highlight(img, rx, ry, action, direction=direction)

        # Get active window rect to crop to the window boundary
        import win32gui
        hwnd = win32gui.GetForegroundWindow()
        if hwnd:
            try:
                rect = win32gui.GetWindowRect(hwnd)
                # Convert global coords to monitor-relative coordinates
                wl = rect[0] - monitor["left"]
                wt = rect[1] - monitor["top"]
                wr = rect[2] - monitor["left"]
                wb = rect[3] - monitor["top"]
                
                # Check that the window has valid size
                if wr > wl and wb > wt:
                    # Clip boundaries to monitor dimensions
                    crop_left = max(0, wl)
                    crop_top = max(0, wt)
                    crop_right = min(img.width, wr)
                    crop_bottom = min(img.height, wb)
                    
                    if crop_right > crop_left and crop_bottom > crop_top:
                        img = img.crop((crop_left, crop_top, crop_right, crop_bottom))
            except Exception as e:
                print(f"[recorder] Failed to crop to active window: {e}")

        img.save(str(out_path), "PNG", optimize=True)
        return out_path
    except Exception as e:
        print(f"[recorder] Screenshot failed: {e}")
        return None


def _draw_highlight(img: Image.Image, x: int, y: int, action: str, direction: str | None = None) -> Image.Image:
    overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    if action == "click":
        # 1. Soft red translucent outer ripple
        draw.ellipse([x - 25, y - 25, x + 25, y + 25], fill=(239, 68, 68, 50), outline=(239, 68, 68, 180), width=2)
        # 2. High-contrast inner white ring with solid red border
        draw.ellipse([x - 12, y - 12, x + 12, y + 12], fill=(255, 255, 255, 180), outline=(239, 68, 68, 255), width=2)
        # 3. Core red dot
        draw.ellipse([x - 5, y - 5, x + 5, y + 5], fill=(239, 68, 68, 255))
        
        # 4. Standard mouse cursor arrow pointing directly at (x, y)
        cursor_points = [
            (x, y),
            (x + 1, y + 17),
            (x + 5, y + 13),
            (x + 9, y + 21),
            (x + 12, y + 19),
            (x + 8, y + 11),
            (x + 13, y + 11)
        ]
        # Draw the black outline shadow and white pointer
        draw.polygon(cursor_points, fill=(255, 255, 255, 255), outline=(0, 0, 0, 255), width=2)

    elif action == "scroll":
        # 1. Soft blue translucent outer ripple
        draw.ellipse([x - 25, y - 25, x + 25, y + 25], fill=(59, 130, 246, 50), outline=(59, 130, 246, 180), width=2)
        # 2. High-contrast inner white ring with solid blue border
        draw.ellipse([x - 12, y - 12, x + 12, y + 12], fill=(255, 255, 255, 180), outline=(59, 130, 246, 255), width=2)

        # 3. Draw swipe directional arrow
        arrow_len = 24
        head_size = 7
        if direction == "up":
            # Arrow pointing UP
            draw.line(
                [(x, y + arrow_len // 2), (x, y - arrow_len // 2)],
                fill=(59, 130, 246, 255),
                width=4,
            )
            draw.line(
                [(x - head_size, y - arrow_len // 2 + head_size), (x, y - arrow_len // 2), (x + head_size, y - arrow_len // 2 + head_size)],
                fill=(59, 130, 246, 255),
                width=4,
            )
        else:
            # Arrow pointing DOWN (default)
            draw.line(
                [(x, y - arrow_len // 2), (x, y + arrow_len // 2)],
                fill=(59, 130, 246, 255),
                width=4,
            )
            draw.line(
                [(x - head_size, y + arrow_len // 2 - head_size), (x, y + arrow_len // 2), (x + head_size, y + arrow_len // 2 - head_size)],
                fill=(59, 130, 246, 255),
                width=4,
            )

    elif action == "type":
        # 1. Soft green translucent outer ripple
        draw.ellipse([x - 25, y - 25, x + 25, y + 25], fill=(16, 185, 129, 50), outline=(16, 185, 129, 180), width=2)
        # 2. High-contrast inner white ring with solid green border
        draw.ellipse([x - 12, y - 12, x + 12, y + 12], fill=(255, 255, 255, 180), outline=(16, 185, 129, 255), width=2)
        
        # 3. Standard text I-beam cursor outline and draw
        # Drawing a 3px wide black background and 1px wide white line for perfect readability
        for width, color in [(3, (0, 0, 0, 255)), (1, (255, 255, 255, 255))]:
            draw.line([(x, y - 8), (x, y + 8)], fill=color, width=width)
            draw.line([(x - 4, y - 8), (x + 4, y - 8)], fill=color, width=width)
            draw.line([(x - 4, y + 8), (x + 4, y + 8)], fill=color, width=width)

    # Composite
    base = img.convert("RGBA")
    combined = Image.alpha_composite(base, overlay)
    return combined.convert("RGB")


# ─── Window info ──────────────────────────────────────────────────────────────

def _active_window() -> tuple[str, str]:
    """Returns ("", window_title) of the currently focused window."""
    try:
        import win32gui
        hwnd = win32gui.GetForegroundWindow()
        title = win32gui.GetWindowText(hwnd)
        return "", title
    except Exception:
        pass
    try:
        buf = ctypes.create_unicode_buffer(512)
        hwnd = ctypes.windll.user32.GetForegroundWindow()
        ctypes.windll.user32.GetWindowTextW(hwnd, buf, 512)
        return "", buf.value
    except Exception:
        return "", ""


def _find_nearest_button_or_name(x: int, y: int, control) -> tuple[str, bool]:
    if not control:
        return "", False
        
    # Helper to check if type name is button-like
    def is_button_type(ctrl) -> bool:
        try:
            return (ctrl.ControlType == auto.ControlType.ButtonControl or 
                    ctrl.ControlTypeName == "ButtonControl" or
                    ctrl.ControlType == auto.ControlType.HyperlinkControl or
                    ctrl.ControlTypeName == "HyperlinkControl")
        except Exception:
            return False

    # 1. If control itself is a button
    if is_button_type(control) and control.Name and control.Name.strip():
        return control.Name.strip(), True
        
    # 2. Walk up parent chain to find if we are inside a button
    try:
        curr = control
        for _ in range(4):
            curr = curr.GetParentControl()
            if not curr:
                break
            if is_button_type(curr) and curr.Name and curr.Name.strip():
                return curr.Name.strip(), True
    except Exception:
        pass
                
    # 3. Check if the control itself has a name
    if control.Name and control.Name.strip():
        return control.Name.strip(), False
        
    # 4. Check siblings of the control
    try:
        parent = control.GetParentControl()
        if parent:
            best_name = ""
            best_is_btn = False
            min_dist = float('inf')
            siblings = parent.GetChildren()
            for sib in siblings:
                if not sib:
                    continue
                is_sib_btn = is_button_type(sib)
                name = sib.Name
                if name and name.strip():
                    name = name.strip()
                    rect = sib.BoundingRectangle
                    if rect:
                        # Find closest point on bounding rect
                        dx = max(0, rect.left - x, x - rect.right)
                        dy = max(0, rect.top - y, y - rect.bottom)
                        dist = dx*dx + dy*dy
                        
                        if is_sib_btn:
                            dist = dist / 2.0  # prioritize buttons/links
                            
                        if dist < min_dist:
                            min_dist = dist
                            best_name = name
                            best_is_btn = is_sib_btn
                            
            if best_name and min_dist < 200 * 200:
                return best_name, best_is_btn
    except Exception:
        pass
            
    return "", False


def _control_under_cursor(x: int, y: int, prefer_class: bool = False) -> str:
    """
    Use uiautomation ControlFromPoint to find the control under (x, y)
    and return a human-readable label.
    """
    ctypes.windll.ole32.CoInitialize(None)
    try:
        control = auto.ControlFromPoint(x, y)
        if not control:
            return ""

        name = control.Name
        if name and len(name.strip()) < 80:
            return name.strip()

        if prefer_class:
            type_name = control.ControlTypeName
            if type_name in _UIA_LABELS:
                return _UIA_LABELS[type_name]
            clean_type = type_name.replace("Control", "")
            if clean_type == "Edit":
                return "text box"
            return clean_type.lower()
        return ""
    except Exception:
        # Fallback to win32 WindowFromPoint
        try:
            import win32gui
            point = ctypes.wintypes.POINT(x, y)
            hwnd = ctypes.windll.user32.WindowFromPoint(point)
            if hwnd:
                buf = ctypes.create_unicode_buffer(256)
                ctypes.windll.user32.GetWindowTextW(hwnd, buf, 256)
                text = buf.value.strip()
                if text and len(text) < 60:
                    return text
        except Exception:
            pass
        return ""
    finally:
        ctypes.windll.ole32.CoUninitialize()


# ─── Background Active Browser Tab URL Polling ────────────────────────────────

def _poll_active_window(stop_event: threading.Event) -> None:
    import win32gui
    
    ctypes.windll.ole32.CoInitialize(None)
    last_url = None
    last_hwnd = None
    
    try:
        while not stop_event.is_set():
            with _lock:
                active = _state["active"]
                sid = _state["session_id"]
                notify_cb = _state["notify_cb"]
                
            if not active or not sid:
                break
                
            try:
                hwnd = win32gui.GetForegroundWindow()
                if hwnd:
                    # Get title
                    win_title = win32gui.GetWindowText(hwnd)
                    
                    # Ignore our own app window
                    if _is_our_app_window(win_title):
                        last_hwnd = hwnd
                        time.sleep(0.5)
                        continue
                        
                    # Get class name
                    try:
                        class_name = win32gui.GetClassName(hwnd)
                    except Exception:
                        class_name = ""
                        
                    is_browser = class_name in ["Chrome_WidgetWin_1", "MozillaWindowClass"]
                    
                    if is_browser:
                        # Find URL from DocumentControl or EditControl
                        url = None
                        control = auto.ControlFromHandle(hwnd)
                        if control:
                            # Search for DocumentControl
                            for child, _ in auto.WalkControl(control, maxDepth=10):
                                if child.ControlType == auto.ControlType.DocumentControl:
                                    try:
                                        val = child.GetValuePattern().Value
                                        if val and (val.startswith("http://") or val.startswith("https://")):
                                            url = val
                                            break
                                    except Exception:
                                        pass
                            # Fallback search for EditControl with Address and search bar
                            if not url:
                                for child, _ in auto.WalkControl(control, maxDepth=8):
                                    if child.ControlType == auto.ControlType.EditControl:
                                        if child.Name == "Address and search bar":
                                            try:
                                                val = child.GetValuePattern().Value
                                                if val:
                                                    if not val.startswith("http://") and not val.startswith("https://"):
                                                        val = "https://" + val
                                                    url = val
                                                    break
                                            except Exception:
                                                pass
                        
                        if url and url != last_url:
                            # Ignore local server requests
                            if "127.0.0.1:8765" in url or "localhost:8765" in url:
                                last_url = url
                                last_hwnd = hwnd
                                time.sleep(0.5)
                                continue
                                
                            last_url = url
                            last_hwnd = hwnd
                            
                            # Capture tab change event
                            try:
                                x, y = win32gui.GetCursorPos()
                            except Exception:
                                x, y = 0, 0
                                
                            screenshot_path = _capture_screen(x, y, sid, action="tab_change")
                            desc = f'Navigate to URL "{url}"'
                            
                            step = storage.add_step(
                                session_id=sid,
                                action_type="click", # using click type for general action list rendering
                                description=desc,
                                app_name="",
                                window_title=win_title,
                                screenshot_path=str(screenshot_path) if screenshot_path else None,
                                x=x,
                                y=y,
                            )
                            if step and notify_cb:
                                notify_cb(step)
                    else:
                        last_hwnd = hwnd
                        last_url = None # Reset so returning to a browser tab triggers URL logging
            except Exception:
                pass
                
            time.sleep(0.5)
    finally:
        ctypes.windll.ole32.CoUninitialize()
