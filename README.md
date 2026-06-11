# CodonDocuManger

> **Visual Guide Maker** — Automatically capture, annotate, and publish step-by-step process guides with screenshots, powered by a local AI-assisted recorder and a Microsoft Edge companion extension.

---

## ✨ Features

| Feature | Description |
|---|---|
| 🎥 **Screen / Browser Recording** | Capture entire screen or browser-only with one click |
| 📄 **Auto-generated Guides** | Steps and screenshots automatically compiled into a visual guide |
| ☁️ **Google Drive Cloud Sync** | Back up projects and guides to your Google Drive via OAuth 2.0 |
| 🗂️ **Project Management** | Organise guides under team projects |
| 🧩 **Edge Companion Extension** | Persistent floating window that stays open while you work |
| 🔐 **Webapp Session Sharing** | Sign in once on the web app — extension auto-authenticates |
| 🔄 **Session Persistence** | Login retained across extension opens via `chrome.storage.local` |
| 🚀 **Auto-Start Server** | Opening the extension automatically launches the local server |
| 📑 **Single-Tab Navigation** | Settings, guides, and sign-up open in existing tab, never duplicates |
| 📝 **Guide Editor** | Edit, reorder, and annotate captured steps |
| 📤 **HTML / Markdown Export** | Export guides to HTML or Markdown |
| 👥 **Team Members & Roles** | Admin / Editor / Viewer access per project |
| 🏷️ **Project Branding** | Custom logo, colours, and fonts per project |

---

## 🚀 Quick Start

### Option A — Run the Standalone Executable (Recommended)
```
Double-click:  CodonDocuManger.exe
```
The app starts on **http://localhost:8765** and opens automatically in your browser.

### Option B — Run from Source (Development)
```bat
run_app.bat
```
This builds the React frontend and starts the FastAPI backend server.

---

## 🧩 Companion Extension

> **This extension is built for Chromium-based browsers and works best there.**
> Supported browsers: **Google Chrome**, **Microsoft Edge**, **Brave**, **Opera**, **Vivaldi**, and any other Chromium-based browser.

---

### Step 1 — Get the Source Code

Clone the repository or download the ZIP from GitHub:

```bash
# Clone
git clone https://github.com/alisha346/CodonDocuManger.git

# Or download the ZIP and extract it anywhere you like
# https://github.com/alisha346/CodonDocuManger/archive/refs/heads/main.zip
```

---

### Step 2 — Load the Extension in Your Browser (One-time Setup)

Open the extensions page for your browser and follow the same steps:

| Browser | Extensions Page |
|---|---|
| **Google Chrome** | `chrome://extensions/` |
| **Microsoft Edge** | `edge://extensions/` |
| **Brave** | `brave://extensions/` |
| **Opera** | `opera://extensions/` |
| **Vivaldi** | `vivaldi://extensions/` |

**Steps (same for all browsers above):**
1. Open your browser and navigate to the extensions page from the table above
2. Enable **Developer mode** (toggle in the top-right corner)
3. Click **Load unpacked** → browse into your cloned/extracted folder and select:
   ```
   <your-folder>/edge_extension
   ```
   *(e.g. if you cloned to `C:\Projects\CodonDocuManger`, select `C:\Projects\CodonDocuManger\edge_extension`)*
4. The **CodonDocuManger Companion** icon appears in your toolbar

---

### Step 3 — Register Native Messaging (One-time Setup)
This allows the extension to auto-start the local server:
```bat
REM Run from inside your cloned folder
cd <your-folder>
app\.venv\Scripts\python.exe register_native_host.py
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

## 🔨 Building from Source

### Prerequisites
- Python 3.11+
- Node.js 18+
- Windows 10/11

### Setup
```bat
REM Create virtual environment
cd app
py -m venv .venv
.venv\Scripts\pip install -r requirements.txt

REM Install frontend dependencies
cd frontend
npm install
```

### Build Standalone Executable
```bat
REM Run from inside your cloned folder
cd <your-folder>\app
.\.venv\Scripts\python.exe build_executable.py
```
Output: `<your-folder>\CodonDocuManger.exe`

---

## 📋 Changelog

| Version | Type | Changes |
|---|---|---|
| `1.02.01` | Enhancement | Auto-version system with watcher and footer version display |
| `1.01.01` | Enhancement | Added + New Project button to extension popup |
| `1.0.02` | Minor | Webapp session auto-sync to extension via `content.js`; `chrome.storage.local` persistence |
| `1.0.01` | Minor | Sign Up tab redirection; native messaging server autostart; tab reuse; webapp login sharing |
| `1.0.0` | Major | Initial release: recording, guide editor, Google Drive, Edge extension, project management |
