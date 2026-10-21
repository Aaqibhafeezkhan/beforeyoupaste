'use strict';

var VAULT_KEY = 'byp_vault';
var SETTINGS_KEY = 'byp_settings';

var state = { vault: {}, settings: { enabled: true, policies: {} }, revealed: {} };

function typeOfPlaceholder(ph) {
  var m = ph.match(/^<([A-Z_]+)_\d+>$/);
  return m ? m[1] : 'VALUE';
}

function preview(value) {
  if (value.length <= 7) return value.slice(0, 1) + '...' + value.slice(-1);
  return value.slice(0, 3) + '...' + value.slice(-2) + ' (' + value.length + ' chars)';
}

function saveVault(cb) {
  var payload = {};
  payload[VAULT_KEY] = state.vault;
  chrome.storage.local.set(payload, cb);
}

function saveSettings(cb) {
  var payload = {};
  payload[SETTINGS_KEY] = state.settings;
  chrome.storage.local.set(payload, cb);
}

function renderEntries() {
  var list = document.getElementById('entries');
  var placeholders = Object.keys(state.vault).sort();
  document.getElementById('emptyState').style.display = placeholders.length ? 'none' : 'block';
  list.innerHTML = '';
  placeholders.forEach(function (ph) {
    var value = state.vault[ph];
    var li = document.createElement('li');
    li.className = 'entry';

    var phEl = document.createElement('div');
    phEl.className = 'ph';
    phEl.textContent = ph;
    li.appendChild(phEl);

    var prev = document.createElement('div');
    prev.className = 'preview';
    prev.textContent = state.revealed[ph] ? value : preview(value);
    li.appendChild(prev);

    var row = document.createElement('div');
    row.className = 'row';

    var revealBtn = document.createElement('button');
    revealBtn.className = 'small';
    revealBtn.textContent = state.revealed[ph] ? 'Hide' : 'Reveal';
    revealBtn.addEventListener('click', function () {
      state.revealed[ph] = !state.revealed[ph];
      renderEntries();
    });
    row.appendChild(revealBtn);

    var copyBtn = document.createElement('button');
    copyBtn.className = 'small';
    copyBtn.textContent = 'Copy placeholder';
    copyBtn.addEventListener('click', function () {
      if (navigator.clipboard) navigator.clipboard.writeText(ph);
      copyBtn.textContent = 'Copied';
      setTimeout(function () { copyBtn.textContent = 'Copy placeholder'; }, 1200);
    });
    row.appendChild(copyBtn);

    var copyValueBtn = document.createElement('button');
    copyValueBtn.className = 'small';
    copyValueBtn.textContent = 'Copy value';
    copyValueBtn.addEventListener('click', function () {
      if (navigator.clipboard) navigator.clipboard.writeText(value);
      copyValueBtn.textContent = 'Copied';
      setTimeout(function () { copyValueBtn.textContent = 'Copy value'; }, 1200);
    });
    row.appendChild(copyValueBtn);

    var delBtn = document.createElement('button');
    delBtn.className = 'small';
    delBtn.textContent = 'Delete';
    delBtn.addEventListener('click', function () {
      delete state.vault[ph];
      delete state.revealed[ph];
      saveVault(renderEntries);
    });
    row.appendChild(delBtn);

    li.appendChild(row);
    list.appendChild(li);
  });
}

function renderPolicies() {
  var labels = (window.BeforeYouPasteDetectors && window.BeforeYouPasteDetectors.TYPE_LABELS) || {};
  var types = Object.keys(labels).sort();
  var wrap = document.getElementById('policyList');
  wrap.innerHTML = '';
  types.forEach(function (type) {
    var row = document.createElement('div');
    row.className = 'policy-row';
    var name = document.createElement('span');
    name.textContent = labels[type] || type;
    row.appendChild(name);

    var sel = document.createElement('select');
    ['warn', 'block', 'allow'].forEach(function (opt) {
      var o = document.createElement('option');
      o.value = opt;
      o.textContent = opt.charAt(0).toUpperCase() + opt.slice(1);
      sel.appendChild(o);
    });
    sel.value = (state.settings.policies && state.settings.policies[type]) || 'warn';
    sel.addEventListener('change', function () {
      if (!state.settings.policies) state.settings.policies = {};
      state.settings.policies[type] = sel.value;
      saveSettings();
    });
    row.appendChild(sel);
    wrap.appendChild(row);
  });
}

function render() {
  renderEntries();
  renderPolicies();
}

function load() {
  chrome.storage.local.get([VAULT_KEY, SETTINGS_KEY], function (items) {
    state.vault = items[VAULT_KEY] || {};
    state.settings = items[SETTINGS_KEY] || { enabled: true, policies: {} };
    render();
  });
}

try {
  chrome.storage.onChanged.addListener(function (changes, area) {
    if (area !== 'local') return;
    if (changes[VAULT_KEY]) { state.vault = changes[VAULT_KEY].newValue || {}; renderEntries(); }
    if (changes[SETTINGS_KEY]) { state.settings = changes[SETTINGS_KEY].newValue || state.settings; renderPolicies(); }
  });
} catch (e) { /* ignore */ }

document.getElementById('clearAll').addEventListener('click', function () {
  if (!Object.keys(state.vault).length) return;
  if (!window.confirm('Clear every protected value from the Vault? This cannot be undone.')) return;
  state.vault = {};
  state.revealed = {};
  saveVault(renderEntries);
});

document.getElementById('exportBtn').addEventListener('click', function () {
  var blob = new Blob([JSON.stringify(state.vault, null, 2)], { type: 'application/json' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = 'beforeyoupaste-vault.json';
  a.click();
  setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
});

document.getElementById('importFile').addEventListener('change', function (event) {
  var file = event.target.files && event.target.files[0];
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function () {
    try {
      var parsed = JSON.parse(String(reader.result || '{}'));
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('bad file');
      var clean = {};
      Object.keys(parsed).forEach(function (k) {
        if (/^<[A-Z][A-Z_]*_\d+>$/.test(k) && typeof parsed[k] === 'string') clean[k] = parsed[k];
      });
      if (!Object.keys(clean).length) {
        window.alert('No valid placeholder entries found in that file.');
        return;
      }
      Object.keys(clean).forEach(function (k) { state.vault[k] = clean[k]; });
      saveVault(function () {
        renderEntries();
        window.alert('Imported ' + Object.keys(clean).length + ' entries into the Vault.');
      });
    } catch (e) {
      window.alert('That file could not be imported. Expected a Vault JSON export.');
    }
    event.target.value = '';
  };
  reader.readAsText(file);
});

load();
