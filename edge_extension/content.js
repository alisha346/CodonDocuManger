// content.js - Runs inside http://localhost:8765/* to sync authentication session

let lastUser = undefined;

function checkAndSyncSession() {
  const userStr = localStorage.getItem('user');
  if (userStr !== lastUser) {
    lastUser = userStr;
    
    // Parse the user object if it exists
    let parsedUser = null;
    if (userStr) {
      try {
        parsedUser = JSON.parse(userStr);
      } catch (e) {
        console.error("Failed to parse user session:", e);
      }
    }
    
    chrome.runtime.sendMessage({
      type: "SYNC_SESSION",
      user: parsedUser
    }, () => {
      // Suppress errors when background or popup is closed
      if (chrome.runtime.lastError) {}
    });
  }
}

// Initial check on load
checkAndSyncSession();

// Periodically check for changes (e.g., SPA route login without reloading page)
setInterval(checkAndSyncSession, 1000);

// Listen to local storage events across other tabs
window.addEventListener('storage', (e) => {
  if (e.key === 'user') {
    checkAndSyncSession();
  }
});

// Listen to messages from the extension (like logout request)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "LOGOUT") {
    localStorage.removeItem('user');
    checkAndSyncSession();
    sendResponse({ status: "success" });
  }
  return true;
});
