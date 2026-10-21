'use strict';
/*
 * BeforeYouPaste content script.
 * Intercepts paste into chat inputs on supported AI sites, offers masked
 * paste, and adds a floating Restore values button for AI replies.
 * Settings and the vault are cached locally and kept in sync through
 * chrome.storage.onChanged, so the paste handler can work synchronously.
 * Everything is defensive: any failure leaves the host page untouched.
 */
(function () {
  if (window.__beforeYouPasteLoaded) return;
  window.__beforeYouPasteLoaded = true;

  var VAULT_KEY = 'byp_vault';
  var SETTINGS_KEY = 'byp_settings';
  var PLACEHOLDER_RE = /<[A-Z][A-Z_]*_\d+>/;

  var cachedVault = {};
  var cachedSettings = { enabled: true, policies: {} };
  var restoreButton = null;

  function lib() {
    return window.BeforeYouPasteDetectors || null;
  }

  function refreshCache() {
    try {
      chrome.storage.local.get([VAULT_KEY, SETTINGS_KEY], function (items) {
        if (items && items[VAULT_KEY]) cachedVault = items[VAULT_KEY];
        if (items && items[SETTINGS_KEY]) cachedSettings = items[SETTINGS_KEY];
      });
    } catch (e) { /* storage unavailable, keep defaults */ }
  }
  refreshCache();

  try {
    chrome.storage.onChanged.addListener(function (changes, area) {
      if (area !== 'local') return;
      if (changes[VAULT_KEY]) cachedVault = changes[VAULT_KEY].newValue || {};
      if (changes[SETTINGS_KEY]) cachedSettings = changes[SETTINGS_KEY].newValue || cachedSettings;
      updateRestoreButtonVisibility();
    });
  } catch (e) { /* ignore */ }

  function isEnabled() {
    return !cachedSettings || cachedSettings.enabled !== false;
  }

  function policyFor(type) {
    var p = (cachedSettings && cachedSettings.policies && cachedSettings.policies[type]) || 'warn';
    return String(p).toLowerCase();
  }

  function isEditable(el) {
    if (!el) return false;
    if (el.isContentEditable) return true;
    var tag = (el.tagName || '').toUpperCase();
    if (tag === 'TEXTAREA') return true;
    if (tag === 'INPUT') {
      var t = (el.getAttribute('type') || 'text').toLowerCase();
      return ['text', 'search', 'email', 'url', ''].indexOf(t) !== -1;
    }
    return !!(el.closest && el.closest('[contenteditable="true"], [contenteditable=""]'));
  }

  function editableRoot(el) {
    if (!el) return null;
    if (el.isContentEditable) return el;
    var tag = (el.tagName || '').toUpperCase();
    if (tag === 'TEXTAREA' || tag === 'INPUT') return el;
    return el.closest ? el.closest('[contenteditable="true"], [contenteditable=""]') : null;
  }

  function insertIntoField(root, text) {
    try {
      var tag = (root.tagName || '').toUpperCase();
      if (tag === 'TEXTAREA' || tag === 'INPUT') {
        var start = typeof root.selectionStart === 'number' ? root.selectionStart : root.value.length;
        var end = typeof root.selectionEnd === 'number' ? root.selectionEnd : root.value.length;
        if (typeof root.setRangeText === 'function') {
          root.setRangeText(text, start, end, 'end');
        } else {
          root.value = root.value.slice(0, start) + text + root.value.slice(end);
        }
        root.dispatchEvent(new Event('input', { bubbles: true }));
        return true;
      }
      root.focus();
      if (typeof document.execCommand === 'function' &&
          document.execCommand('insertText', false, text)) {
        return true;
      }
      var sel = window.getSelection();
      if (sel && sel.rangeCount) {
        var range = sel.getRangeAt(0);
        range.deleteContents();
        range.insertNode(document.createTextNode(text));
        range.collapse(false);
        sel.removeAllRanges();
        sel.addRange(range);
        root.dispatchEvent(new Event('input', { bubbles: true }));
        return true;
      }
    } catch (e) { /* fall through */ }
    return false;
  }

  function summarizeCounts(findings) {
    var counts = {};
    var labels = (lib() && lib().TYPE_LABELS) || {};
    findings.forEach(function (f) { counts[f.type] = (counts[f.type] || 0) + 1; });
    return Object.keys(counts).map(function (type) {
      return counts[type] + ' x ' + (labels[type] || type);
    }).join(', ');
  }

  function onPaste(event) {
    try {
      if (!isEnabled()) return;
      var D = lib();
      if (!D) return;
      var target = event.target;
      if (!isEditable(target)) return;
      var clipboard = event.clipboardData || window.clipboardData;
      if (!clipboard) return;
      var text = clipboard.getData('text');
      if (!text) return;

      var findings = D.detect(text);
      if (!findings.length) return;

      var blocked = findings.filter(function (f) { return policyFor(f.type) === 'block'; });
      if (blocked.length) {
        event.preventDefault();
        event.stopPropagation();
        window.alert('BeforeYouPaste blocked this paste. It contained: ' +
          summarizeCounts(blocked) + '. Change the policy for that type to Warn or Allow in the Vault side panel if you really need to paste it.');
        return;
      }

      var warnFindings = findings.filter(function (f) { return policyFor(f.type) === 'warn'; });
      if (!warnFindings.length) return; // everything is Allow, let the paste through

      var ok = window.confirm(
        'BeforeYouPaste found sensitive data in your paste:\n' +
        summarizeCounts(warnFindings) +
        '\n\nOK: paste a masked version with placeholders like <EMAIL_1>. ' +
        'The real values stay in your local Vault and can be restored in the reply.\n' +
        'Cancel: paste the original text instead.'
      );
      if (!ok) return; // user declined, original paste proceeds

      event.preventDefault();
      event.stopPropagation();

      var result = D.mask(text, cachedVault);
      cachedVault = result.map;
      try {
        var payload = {};
        payload[VAULT_KEY] = result.map;
        chrome.storage.local.set(payload);
      } catch (e) { /* mapping stays in page memory for this session */ }

      var root = editableRoot(target);
      if (root) insertIntoField(root, result.text);
    } catch (e) {
      // Never break the host page. Any failure means the original paste wins.
    }
  }

  document.addEventListener('paste', onPaste, true);

  // ---------- Restore values button ----------

  function pageHasPlaceholders() {
    try {
      var main = document.querySelector('main') || document.body;
      if (!main) return false;
      return PLACEHOLDER_RE.test(main.innerText || main.textContent || '');
    } catch (e) {
      return false;
    }
  }

  function ensureRestoreButton() {
    if (restoreButton) return restoreButton;
    var btn = document.createElement('button');
    btn.id = 'byp-restore-button';
    btn.type = 'button';
    btn.textContent = 'Restore values';
    btn.setAttribute('style', [
      'position:fixed', 'right:18px', 'bottom:18px', 'z-index:2147483647',
      'background:#0b1f3a', 'color:#f5c542', 'border:1px solid #c9a227',
      'border-radius:999px', 'padding:10px 16px', 'font:600 13px system-ui, sans-serif',
      'box-shadow:0 4px 16px rgba(0,0,0,0.35)', 'cursor:pointer', 'display:none'
    ].join(';'));
    btn.addEventListener('click', restoreInPage);
    (document.body || document.documentElement).appendChild(btn);
    restoreButton = btn;
    return btn;
  }

  function updateRestoreButtonVisibility() {
    try {
      if (!isEnabled()) return;
      if (!cachedVault || !Object.keys(cachedVault).length) {
        if (restoreButton) restoreButton.style.display = 'none';
        return;
      }
      if (pageHasPlaceholders()) {
        ensureRestoreButton().style.display = 'block';
      } else if (restoreButton) {
        restoreButton.style.display = 'none';
      }
    } catch (e) { /* ignore */ }
  }

  function restoreInPage() {
    try {
      var D = lib();
      if (!D || !cachedVault || !Object.keys(cachedVault).length) return;
      var main = document.querySelector('main') || document.body;
      if (!main) return;
      var walker = document.createTreeWalker(main, NodeFilter.SHOW_TEXT, {
        acceptNode: function (node) {
          if (!node.nodeValue || !PLACEHOLDER_RE.test(node.nodeValue)) {
            return NodeFilter.FILTER_REJECT;
          }
          var parent = node.parentElement;
          if (!parent) return NodeFilter.FILTER_REJECT;
          if (parent.id === 'byp-restore-button') return NodeFilter.FILTER_REJECT;
          var tag = (parent.tagName || '').toUpperCase();
          if (tag === 'TEXTAREA' || tag === 'INPUT' || tag === 'SCRIPT' || tag === 'STYLE') {
            return NodeFilter.FILTER_REJECT;
          }
          if (parent.isContentEditable) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        }
      });
      var nodes = [];
      while (walker.nextNode()) nodes.push(walker.currentNode);
      var changed = 0;
      nodes.forEach(function (node) {
        var before = node.nodeValue;
        var after = D.restore(before, cachedVault);
        if (after !== before) {
          node.nodeValue = after;
          changed++;
        }
      });
      if (restoreButton) {
        restoreButton.textContent = changed ? 'Values restored' : 'Nothing to restore';
        setTimeout(function () {
          if (restoreButton) restoreButton.textContent = 'Restore values';
          updateRestoreButtonVisibility();
        }, 1600);
      }
    } catch (e) { /* ignore, host page must keep working */ }
  }

  setInterval(updateRestoreButtonVisibility, 2500);
  setTimeout(updateRestoreButtonVisibility, 1200);
})();
