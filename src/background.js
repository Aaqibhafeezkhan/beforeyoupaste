'use strict';
/*
 * BeforeYouPaste service worker.
 * Seeds default settings and the empty vault on install, and asks Chrome to
 * open the side panel from the toolbar action. Note: while a default_popup
 * is set in the manifest, action clicks open the popup instead, and the
 * popup has its own Open Vault button. The onClicked handler below covers
 * contexts where no popup is shown. No network requests, ever.
 */

var DEFAULT_POLICIES = {}; // every type defaults to "warn" when unset

function seedStorage() {
  chrome.storage.local.get(['byp_settings', 'byp_vault'], function (items) {
    var updates = {};
    if (!items.byp_settings) {
      updates.byp_settings = { enabled: true, policies: DEFAULT_POLICIES };
    }
    if (!items.byp_vault) {
      updates.byp_vault = {};
    }
    if (Object.keys(updates).length) {
      chrome.storage.local.set(updates);
    }
  });
}

chrome.runtime.onInstalled.addListener(function () {
  seedStorage();
  try {
    if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
      chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false });
    }
  } catch (e) {
    // Side panel API differences must never break install.
  }
});

chrome.runtime.onStartup.addListener(function () {
  seedStorage();
});

chrome.action.onClicked.addListener(function (tab) {
  try {
    if (chrome.sidePanel && tab && typeof tab.windowId === 'number') {
      chrome.sidePanel.open({ windowId: tab.windowId });
    }
  } catch (e) {
    // Ignore. The popup remains the primary surface.
  }
});
