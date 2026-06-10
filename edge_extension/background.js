// Background Service Worker for CodonDocuManger Edge Extension

chrome.action.onClicked.addListener(() => {
  // Try starting the local server immediately when extension is clicked
  chrome.runtime.sendNativeMessage(
    'com.codondocumanger.companion',
    { command: 'start_server' }
  );

  chrome.windows.create({
    url: "popup.html",
    type: "popup",
    width: 340,
    height: 520
  });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "SYNC_SESSION") {
    if (message.user) {
      chrome.storage.local.set({ currentUser: message.user }, () => {
        if (chrome.runtime.lastError) {}
      });
    } else {
      chrome.storage.local.remove(["currentUser", "activeProjectId"], () => {
        if (chrome.runtime.lastError) {}
      });
    }
    sendResponse({ status: "success" });
  }
  return true;
});
