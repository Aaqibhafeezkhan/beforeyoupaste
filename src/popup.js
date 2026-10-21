'use strict';

var VAULT_KEY = 'byp_vault';
var SETTINGS_KEY = 'byp_settings';

function render(settings, vault) {
  var enabled = !settings || settings.enabled !== false;
  var count = vault ? Object.keys(vault).length : 0;
  document.getElementById('vaultCount').textContent = String(count);
  document.getElementById('statusText').textContent = enabled ? 'Shield on' : 'Shield off';
  document.getElementById('statusDot').className = enabled ? 'dot on' : 'dot';
  document.getElementById('toggleEnabled').textContent = enabled ? 'Turn off' : 'Turn on';
}

function load() {
  chrome.storage.local.get([VAULT_KEY, SETTINGS_KEY], function (items) {
    render(items[SETTINGS_KEY], items[VAULT_KEY]);
  });
}

document.getElementById('openVault').addEventListener('click', function () {
  try {
    chrome.windows.getCurrent(function (win) {
      if (win && typeof win.id === 'number' && chrome.sidePanel) {
        chrome.sidePanel.open({ windowId: win.id });
      }
    });
  } catch (e) { /* side panel unavailable in this context */ }
});

document.getElementById('toggleEnabled').addEventListener('click', function () {
  chrome.storage.local.get([SETTINGS_KEY, VAULT_KEY], function (items) {
    var settings = items[SETTINGS_KEY] || { enabled: true, policies: {} };
    settings.enabled = settings.enabled === false ? true : false;
    var payload = {};
    payload[SETTINGS_KEY] = settings;
    chrome.storage.local.set(payload, function () { render(settings, items[VAULT_KEY]); });
  });
});

document.getElementById('clearVault').addEventListener('click', function () {
  if (!window.confirm('Clear every protected value from the Vault? Placeholders already sent cannot be restored after this.')) return;
  var payload = {};
  payload[VAULT_KEY] = {};
  chrome.storage.local.set(payload, function () { load(); });
});

load();
