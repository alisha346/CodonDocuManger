// JavaScript Controller for CodonDocuManger Companion Extension

const BASE_URL = 'http://localhost:8765/api';

// UI Panels
const loginPanel = document.getElementById('login-panel');
const mainPanel = document.getElementById('main-panel');

// Header / Footer Elements
const settingsBtn = document.getElementById('settings-btn');
const logoutBtn = document.getElementById('logout-btn');
const statusBadge = document.getElementById('status-badge');
const loggedUserLabel = document.getElementById('logged-user-label');
const aliveDot = document.getElementById('alive-dot');

// Login elements
const connectWebappBtn = document.getElementById('connect-webapp-btn');
const signupLink = document.getElementById('signup-link');

// Recording Controls
const connectionWarning = document.getElementById('connection-warning');
const driveStatusCard = document.getElementById('drive-status-card');
const driveStatusText = document.getElementById('drive-status-text');
const connectDriveBtn = document.getElementById('connect-drive-btn');
const controlsPanel = document.getElementById('controls-panel');
const projectSelect = document.getElementById('project-select');
const guideNameInput = document.getElementById('guide-name');
const guideNameError = document.getElementById('guide-name-error');
const actionBtn = document.getElementById('action-btn');

// New project form elements
const newProjectBtn = document.getElementById('new-project-btn');
const newProjectForm = document.getElementById('new-project-form');
const newProjectName = document.getElementById('new-project-name');
const createProjectBtn = document.getElementById('create-project-btn');
const cancelProjectBtn = document.getElementById('cancel-project-btn');

let isConnected = false;
let isRecording = false;
let loadedProjects = [];

// ─── Init ────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  // Inject extension version into footer
  const extVersionEl = document.getElementById('ext-version');
  if (extVersionEl) {
    const { version } = chrome.runtime.getManifest();
    extVersionEl.textContent = `v${version}`;
  }

  // Load persisted session from chrome.storage.local, then begin polling
  chrome.storage.local.get(['currentUser', 'activeProjectId'], (data) => {
    if (data.currentUser) {
      applyLoggedIn(data.currentUser);
    } else {
      applyLoggedOut();
    }
    pollStatus();
    setInterval(pollStatus, 1500);
  });

  // Button event bindings
  connectWebappBtn.addEventListener('click', () => {
    openOrFocusTab('http://localhost:8765/');
  });
  logoutBtn.addEventListener('click', handleLogout);
  settingsBtn.addEventListener('click', () => openOrFocusTab('http://localhost:8765/?view=settings'));
  connectDriveBtn.addEventListener('click', () => openOrFocusTab('http://localhost:8765/?view=settings'));
  projectSelect.addEventListener('change', handleProjectChange);
  actionBtn.addEventListener('click', handleAction);
  guideNameInput.addEventListener('input', () => {
    if (guideNameInput.value.trim()) {
      guideNameInput.classList.remove('input-error');
      guideNameError.style.display = 'none';
    }
  });
  signupLink.addEventListener('click', (e) => {
    e.preventDefault();
    openOrFocusTab('http://localhost:8765/?view=signup');
  });

  // New project form toggle
  newProjectBtn.addEventListener('click', () => {
    const isVisible = newProjectForm.style.display !== 'none';
    newProjectForm.style.display = isVisible ? 'none' : 'flex';
    if (!isVisible) {
      newProjectName.value = '';
      newProjectName.focus();
    }
  });

  cancelProjectBtn.addEventListener('click', () => {
    newProjectForm.style.display = 'none';
    newProjectName.value = '';
  });

  createProjectBtn.addEventListener('click', handleCreateProject);

  newProjectName.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleCreateProject();
    if (e.key === 'Escape') {
      newProjectForm.style.display = 'none';
      newProjectName.value = '';
    }
  });
});

// Listen for session sync messages pushed from content.js running in the webapp tab
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'SYNC_SESSION') {
    if (message.user) {
      chrome.storage.local.set({ currentUser: message.user }, () => {
        applyLoggedIn(message.user);
      });
    } else {
      chrome.storage.local.remove(['currentUser', 'activeProjectId'], () => {
        applyLoggedOut();
      });
    }
  }
});

// ─── Auth UI ─────────────────────────────────────────────────────────────────

function applyLoggedIn(user) {
  loginPanel.style.display = 'none';
  mainPanel.style.display = 'block';
  logoutBtn.style.display = 'inline-block';
  loggedUserLabel.textContent = `Logged in: ${user.username}`;
}

function applyLoggedOut() {
  loginPanel.style.display = 'block';
  mainPanel.style.display = 'none';
  logoutBtn.style.display = 'none';
  loggedUserLabel.textContent = 'Not logged in';
  isConnected = false;
  isRecording = false;
  loadedProjects = [];
}

// ─── Logout ──────────────────────────────────────────────────────────────────

function handleLogout() {
  // Clear chrome.storage.local session
  chrome.storage.local.remove(['currentUser', 'activeProjectId'], () => {
    applyLoggedOut();
  });

  // Push LOGOUT message to webapp tab content script
  chrome.tabs.query({}, (tabs) => {
    if (tabs && tabs.length > 0) {
      tabs.forEach(tab => {
        if (tab.url && (tab.url.includes('localhost:8765') || tab.url.includes('127.0.0.1:8765'))) {
          chrome.tabs.sendMessage(tab.id, { type: 'LOGOUT' }, () => {
            if (chrome.runtime.lastError) {}
          });
        }
      });
    }
  });
}

// ─── Tab Helpers ─────────────────────────────────────────────────────────────

// Open url in existing localhost tab if one is open, otherwise create a new tab
function openOrFocusTab(url) {
  chrome.tabs.query({}, (tabs) => {
    const targetTab = tabs && tabs.find(tab => tab.url && (tab.url.includes('localhost:8765') || tab.url.includes('127.0.0.1:8765')));
    if (targetTab) {
      chrome.tabs.update(targetTab.id, { url: url, active: true }, () => {
        chrome.windows.update(targetTab.windowId, { focused: true });
      });
    } else {
      chrome.tabs.create({ url: url });
    }
  });
}

// ─── Server Autostart ────────────────────────────────────────────────────────

function startLocalServer() {
  chrome.runtime.sendNativeMessage(
    'com.codondocumanger.companion',
    { command: 'start_server' },
    function(response) {
      if (chrome.runtime.lastError) {
        console.warn('Could not start local server via native messaging:', chrome.runtime.lastError.message);
      } else {
        console.log('Local server start status:', response);
      }
    }
  );
}

// ─── Project Selection ───────────────────────────────────────────────────────

function handleProjectChange() {
  chrome.storage.local.set({ activeProjectId: this.value });
}

// ─── Create Project ───────────────────────────────────────────────────────────

async function handleCreateProject() {
  const name = newProjectName.value.trim();
  if (!name) {
    newProjectName.focus();
    return;
  }

  const stored = await new Promise(resolve =>
    chrome.storage.local.get(['currentUser'], resolve)
  );
  if (!stored.currentUser) return;

  createProjectBtn.textContent = '...';
  createProjectBtn.setAttribute('disabled', 'true');

  try {
    const res = await fetch(`${BASE_URL}/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, creator: stored.currentUser.username })
    });

    if (!res.ok) throw new Error('Failed to create project');
    const newProject = await res.json();

    // Hide form and clear input
    newProjectForm.style.display = 'none';
    newProjectName.value = '';

    // Force reload projects and select the new one
    loadedProjects = []; // reset cache so loadProjects() re-fetches
    await loadProjects();

    // Select the newly created project
    if (newProject.id) {
      projectSelect.value = newProject.id;
      chrome.storage.local.set({ activeProjectId: newProject.id });
    }
  } catch (err) {
    alert(`Error: ${err.message}`);
  } finally {
    createProjectBtn.textContent = 'Create';
    createProjectBtn.removeAttribute('disabled');
  }
}

// ─── Polling ─────────────────────────────────────────────────────────────────

async function pollStatus() {
  // Only poll if we have a stored user session
  const stored = await new Promise(resolve =>
    chrome.storage.local.get(['currentUser'], resolve)
  );

  if (!stored.currentUser) return;

  try {
    // 1. Fetch recording status
    const res = await fetch(`${BASE_URL}/recording/status`);
    if (!res.ok) throw new Error('Offline');
    const statusData = await res.json();

    if (!isConnected) {
      isConnected = true;
      connectionWarning.style.display = 'none';
      controlsPanel.classList.remove('disabled-opacity');
      aliveDot.classList.add('dot-connected');
      actionBtn.classList.remove('btn-disabled');
      actionBtn.removeAttribute('disabled');
      await loadProjects();
    }

    updateRecordingState(statusData.active);

    // 2. Fetch Google Drive config status
    const driveRes = await fetch(`${BASE_URL}/drive/config`);
    if (driveRes.ok) {
      const driveConfig = await driveRes.json();
      driveStatusCard.style.display = 'flex';
      if (driveConfig.connected) {
        driveStatusText.textContent = `☁️ Drive: Connected (${driveConfig.user_email})`;
        connectDriveBtn.textContent = 'Manage';
      } else if (driveConfig.simulation) {
        driveStatusText.textContent = '☁️ Drive: Simulation Mode';
        connectDriveBtn.textContent = 'Setup';
      } else {
        driveStatusText.textContent = '☁️ Drive: Disconnected';
        connectDriveBtn.textContent = 'Link';
      }
    }
  } catch (err) {
    // Connection lost or offline
    isConnected = false;
    isRecording = false;
    connectionWarning.style.display = 'block';
    driveStatusCard.style.display = 'none';
    controlsPanel.classList.add('disabled-opacity');
    aliveDot.classList.remove('dot-connected');
    statusBadge.textContent = 'Offline';
    statusBadge.className = 'badge status-disconnected';
    actionBtn.textContent = 'Connecting...';
    actionBtn.className = 'btn btn-disabled';
    actionBtn.setAttribute('disabled', 'true');
  }
}

// ─── Projects ─────────────────────────────────────────────────────────────────

async function loadProjects() {
  const stored = await new Promise(resolve =>
    chrome.storage.local.get(['currentUser', 'activeProjectId'], resolve)
  );
  if (!stored.currentUser) return;

  try {
    const res = await fetch(`${BASE_URL}/projects?username=${encodeURIComponent(stored.currentUser.username)}`);
    const projects = await res.json();

    if (projects.length !== loadedProjects.length) {
      loadedProjects = projects;
      projectSelect.innerHTML = '';

      projects.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = p.name;
        projectSelect.appendChild(opt);
      });

      // Restore previous project selection from chrome.storage.local
      const rememberedProj = stored.activeProjectId;
      if (rememberedProj && projects.some(p => p.id === rememberedProj)) {
        projectSelect.value = rememberedProj;
      } else if (projects.length > 0) {
        projectSelect.value = projects[0].id;
        chrome.storage.local.set({ activeProjectId: projects[0].id });
      }
    }
  } catch (err) {
    console.error('Failed to load projects:', err);
  }
}

// ─── Recording State ─────────────────────────────────────────────────────────

function updateRecordingState(active) {
  isRecording = active;

  if (isRecording) {
    statusBadge.textContent = 'Recording';
    statusBadge.className = 'badge status-recording';
    actionBtn.textContent = '🛑 Stop Capture Session';
    actionBtn.className = 'btn btn-danger';
    projectSelect.setAttribute('disabled', 'true');
    guideNameInput.setAttribute('disabled', 'true');
    document.querySelectorAll('input[name="scope-mode"]').forEach(r => r.setAttribute('disabled', 'true'));
  } else {
    statusBadge.textContent = 'Ready';
    statusBadge.className = 'badge status-ready';
    actionBtn.textContent = '⚡ Start Capture Session';
    actionBtn.className = 'btn btn-primary';
    projectSelect.removeAttribute('disabled');
    guideNameInput.removeAttribute('disabled');
    document.querySelectorAll('input[name="scope-mode"]').forEach(r => r.removeAttribute('disabled'));
  }
}

// ─── Recording Action ────────────────────────────────────────────────────────

async function handleAction() {
  if (!isConnected) return;

  actionBtn.setAttribute('disabled', 'true');
  actionBtn.textContent = 'Processing...';

  try {
    if (!isRecording) {
      const projectId = projectSelect.value;
      const guideName = guideNameInput.value.trim();
      const scopeMode = document.querySelector('input[name="scope-mode"]:checked').value;

      if (!projectId) {
        alert('Please configure a project.');
        actionBtn.removeAttribute('disabled');
        actionBtn.textContent = '⚡ Start Capture Session';
        return;
      }

      if (!guideName) {
        guideNameInput.classList.add('input-error');
        guideNameError.style.display = 'block';
        guideNameInput.focus();
        actionBtn.removeAttribute('disabled');
        actionBtn.textContent = '⚡ Start Capture Session';
        return;
      }

      // 1. Create session
      const createRes = await fetch(`${BASE_URL}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: guideName, project_id: projectId })
      });
      const session = await createRes.json();

      // 2. Start recording trigger
      const startRes = await fetch(`${BASE_URL}/sessions/${session.id}/start?mode=${scopeMode}`, {
        method: 'POST'
      });

      if (startRes.ok) {
        updateRecordingState(true);
        guideNameInput.value = '';
      } else {
        throw new Error('Failed to start recording');
      }
    } else {
      // Stop Recording flow
      const stopRes = await fetch(`${BASE_URL}/sessions/active/stop`, {
        method: 'POST'
      });

      if (stopRes.ok) {
        const data = await stopRes.json();
        updateRecordingState(false);

        // Navigate the existing tab (or open a new one) to the guide
        if (data.session_id) {
          openOrFocusTab(`http://localhost:8765/?session=${data.session_id}`);
        }
      } else {
        throw new Error('Failed to stop recording');
      }
    }
  } catch (err) {
    alert(`Error: ${err.message}`);
  } finally {
    actionBtn.removeAttribute('disabled');
  }
}
