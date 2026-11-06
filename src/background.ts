async function enable(tab: chrome.tabs.Tab) {
  if (!tab.id) return;
  if (!tab.url || !/^https?:/.test(tab.url)) {
    await chrome.runtime
      .sendMessage({
        type: "GLANCE_FAILURE",
        tabId: tab.id,
        error:
          "This page cannot be inspected. Open a regular HTTP or HTTPS website and click the toolbar icon.",
      })
      .catch(() => {});
    return;
  }
  try {
    try {
      await chrome.tabs.sendMessage(tab.id, { type: "GLANCE_GET" });
    } catch {
      await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["content.js"] });
    }
    await chrome.tabs.sendMessage(tab.id, { type: "GLANCE_ENABLE" });
  } catch {
    await chrome.runtime
      .sendMessage({
        type: "GLANCE_FAILURE",
        tabId: tab.id,
        error:
          "Chrome did not allow inspection here. Try a regular web page, then click the toolbar icon again.",
      })
      .catch(() => {});
  }
}

chrome.action.onClicked.addListener((tab) => {
  // Opening must remain in the toolbar's user gesture, before asynchronous injection.
  void chrome.sidePanel
    .open({ windowId: tab.windowId })
    .then(() => enable(tab))
    .catch(() => {});
});

chrome.runtime.onMessage.addListener((message, sender) => {
  if (sender.id === chrome.runtime.id && sender.tab && message?.type === "GLANCE_OPEN") {
    void chrome.sidePanel.open({ windowId: sender.tab.windowId }).catch(() => {});
  }
});
