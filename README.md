# CodonDocuManger

> **Visual Guide Maker** — Automatically capture, annotate, and publish step-by-step process guides with screenshots, powered by a local AI-assisted recorder and a Microsoft Edge companion extension.

---

## ✨ Features

| Feature | Description |
|---|---|
| 🎥 **Screen / Browser Recording** | Capture entire screen or browser-only with one click |
| 📄 **Auto-generated Guides** | Steps and screenshots automatically compiled into a visual guide |
| ☁️ **Google Drive Cloud Sync** | Back up projects and guides to your Google Drive via OAuth 2.0 |
| 🗂️ **Project Management** | Organise guides under team projects (Operations) |
| 🧩 **Edge Companion Extension** | Persistent floating window that stays open while you work |
| 🔐 **Webapp Session Sharing** | Sign in once on the web app — extension auto-authenticates |
| 🔄 **Session Persistence** | Login retained across extension opens via `chrome.storage.local` |
| 🚀 **Auto-Start Server** | Opening the extension automatically launches the local server |
| 📑 **Single-Tab Navigation** | Settings, guides, and sign-up open in existing tab, never duplicates |
| 📝 **Guide Editor** | Edit, reorder, and annotate captured steps |
| 📤 **HTML / Markdown Export** | Export guides to HTML or Markdown |
| 👥 **Team Members & Roles** | Admin / Editor / Viewer access per project |
| 🏷️ **Project Branding** | Custom logo, colours, and fonts per project |
| 🔢 **Auto Version Bumping** | Automated semver-style versioning for every release |

---

## 🗂️ Project Structure

```
D:\CodonDocuManger\
├── CodonDocuManger.exe          ← Standalone compiled app (run this!)
├── run_scribe.bat               ← Dev launcher (builds frontend + runs server)
├── bump_version.py              ← Version auto-bumper script
├── register_native_host.py      ← Registers extension native messaging in registry
├── native_host.py               ← Native messaging bridge (server autostart)
├── native_host.bat              ← Batch wrapper for native_host.py
├── com.codondocumanger.companion.json  ← Native messaging host manifest
│
├── edge_extension/              ← Microsoft Edge unpacked extension
│   ├── manifest.json            ← Extension manifest (version, permissions)
│   ├── background.js            ← Service worker (toolbar click, session store)
│   ├── content.js               ← Injected into webapp tab (session watcher)
│   ├── popup.html               ← Extension UI
│   ├── popup.css                ← Extension styles
│   ├── popup.js                 ← Extension controller
│   └── icon.png
│
└── scribe/                      ← Source code
    ├── frontend/                ← React + TypeScript + Vite webapp
    │   └── src/
    │       ├── App.tsx          ← Main application component
    │       ├── api.ts           ← API client
    │       ├── types.ts         ← TypeScript types
    │       └── components/      ← ControlPanel, Timeline, ExportModal
    ├── backend/                 ← FastAPI Python backend
    │   ├── main.py              ← API server entry point
    │   ├── storage.py           ← Project/session JSON storage
    │   ├── drive.py             ← Google Drive REST API integration
    │   └── config.py            ← App config & portable paths
    ├── build_executable.py      ← Build script (npm build + PyInstaller)
    └── .venv/                   ← Python virtual environment
```

---

## 🚀 Quick Start

### Option A — Run the Standalone Executable (Recommended)
```
Double-click:  CodonDocuManger.exe
```
The app starts on **http://localhost:8765** and opens automatically in your browser.

### Option B — Run from Source (Development)
```bat
run_scribe.bat
```
This builds the React frontend and starts the FastAPI backend server.

---

## 🧩 Edge Companion Extension

### Installation (One-time Setup)
1. Open Microsoft Edge → navigate to **`edge://extensions/`**
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked** → select the folder:
   ```
   D:\CodonDocuManger\edge_extension
   ```
4. The **CodonDocuManger Companion** icon appears in your toolbar.

### Register Native Messaging (One-time Setup)
This allows the extension to auto-start the local server:
```bat
D:\CodonDocuManger\scribe\.venv\Scripts\python.exe register_native_host.py
```

### How It Works

```
Click Extension Icon
        │
        ├─► Auto-starts CodonDocuManger.exe (if not running)
        ├─► Opens persistent floating popup window
        │
        └─► Reads login session from open webapp tab
                    │
                    ▼
            Auto-signs in to extension
            (no username/password needed)
```

### Extension Flow
| Step | Action |
|---|---|
| 1 | Click the extension icon in Edge toolbar |
| 2 | Extension auto-launches `CodonDocuManger.exe` if offline |
| 3 | If already signed in to the web app → companion auto-signs in |
| 4 | If not signed in → click **🔑 Sign In via Web App** |
| 5 | Select a guide name and capture scope (Screen / Browser) |
| 6 | Click **⚡ Start Capture Session** |
| 7 | Perform the steps you want to document |
| 8 | Click **🛑 Stop Capture Session** |
| 9 | The guide opens automatically in the browser tab |

### Session Persistence
- Login is stored in `chrome.storage.local` — survives popup close and browser restarts.
- Sign in once on the web app; the extension syncs automatically via the injected `content.js` watcher.
- Logging out from the extension also logs out the web app tab (bidirectional sync).

---

## ☁️ Google Drive Integration

1. Open **Settings** (⚙️ button in the extension, or the web app)
2. Enter your Google **Client ID** and **Client Secret** from [Google Cloud Console](https://console.cloud.google.com/)
3. Click **Connect Drive** → authorise via the Google OAuth screen
4. Use **Sync to Drive** to back up all projects and guides

> **Note:** Google Drive uses OAuth 2.0. Direct username/password login is not supported by Google for third-party apps.

---

## 🔢 Version Management

The extension version is managed automatically via `bump_version.py`.

| Release Type | Format | Command |
|---|---|---|
| Minor fix / small update | `1.0.xx` | `python bump_version.py` |
| Major feature release | `1.YY.01` | `python bump_version.py --major` |

```bat
REM Minor update (e.g. 1.0.02 → 1.0.03)
.\scribe\.venv\Scripts\python.exe bump_version.py

REM Major update (e.g. 1.0.03 → 1.01.01)
.\scribe\.venv\Scripts\python.exe bump_version.py --major
```

After bumping, reload the extension in `edge://extensions/` for the version to take effect.

---

## 🔨 Building from Source

### Prerequisites
- Python 3.11+
- Node.js 18+
- Windows 10/11

### Setup
```bat
REM Create virtual environment
cd scribe
py -m venv .venv
.venv\Scripts\pip install -r requirements.txt

REM Install frontend dependencies
cd frontend
npm install
```

### Build Standalone Executable
```bat
cd D:\CodonDocuManger\scribe
.\.venv\Scripts\python.exe build_executable.py
```
Output: `D:\CodonDocuManger\CodonDocuManger.exe`

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, TypeScript, Vite |
| **Backend** | Python, FastAPI, Uvicorn |
| **Recording** | `mss` (screenshots), `pynput` (keyboard/mouse hooks) |
| **Packaging** | PyInstaller (single `.exe`) |
| **Extension** | Manifest V3, Chrome Storage API, Native Messaging |
| **Cloud** | Google Drive REST API (OAuth 2.0) |

---

## 🔑 Default Accounts

| Username | Password | Role |
|---|---|---|
| `admin` | `admin123` | Admin |

> To create additional accounts, use the **Sign Up** link in the web app or extension.

---

## 📋 Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| **F9** | Stop active recording session from anywhere on screen |

---

## 📁 Data Storage

All data is stored locally at:
```
D:\CodonDocuManger\data\
├── projects.json     ← Project metadata
├── users.json        ← User accounts
├── sessions\         ← Individual guide sessions
└── screenshots\      ← Captured screenshots per session
```

---

## 🔄 Changelog

| Version | Type | Changes |
|---|---|---|
| `1.0.02` | Minor | Webapp session auto-sync to extension via `content.js`; `chrome.storage.local` persistence |
| `1.0.01` | Minor | Sign Up tab redirection; native messaging server autostart; tab reuse; webapp login sharing |
| `1.0.0` | Major | Initial release: recording, guide editor, Google Drive, Edge extension, project management |
