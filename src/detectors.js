/*
 * BeforeYouPaste detector library.
 * Pure and environment agnostic. Works in Node (module.exports) and in the
 * browser as window.BeforeYouPasteDetectors. No dependencies, no network.
 */
(function (root) {
  'use strict';

  // ---------- validation helpers ----------

  function luhnValid(digits) {
    var sum = 0;
    var dbl = false;
    for (var i = digits.length - 1; i >= 0; i--) {
      var d = digits.charCodeAt(i) - 48;
      if (d < 0 || d > 9) return false;
      if (dbl) {
        d = d * 2;
        if (d > 9) d -= 9;
      }
      sum += d;
      dbl = !dbl;
    }
    return digits.length >= 13 && sum % 10 === 0;
  }

  function ibanValid(raw) {
    var iban = raw.replace(/\s+/g, '').toUpperCase();
    if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(iban)) return false;
    if (iban.length < 15 || iban.length > 34) return false;
    var rearranged = iban.slice(4) + iban.slice(0, 4);
    var remainder = 0;
    for (var i = 0; i < rearranged.length; i++) {
      var ch = rearranged[i];
      if (ch >= '0' && ch <= '9') {
        remainder = (remainder * 10 + (ch.charCodeAt(0) - 48)) % 97;
      } else {
        var v = ch.charCodeAt(0) - 55; // A=10 .. Z=35, always two digits
        remainder = (remainder * 100 + v) % 97;
      }
    }
    return remainder === 1;
  }

  function ssnValid(v) {
    var parts = v.split('-');
    var area = parseInt(parts[0], 10);
    var group = parseInt(parts[1], 10);
    var serial = parseInt(parts[2], 10);
    if (area === 0 || area === 666 || area >= 900) return false;
    if (group === 0) return false;
    if (serial === 0) return false;
    return true;
  }

  var VERHOEFF_D = [
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
    [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
    [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
    [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
    [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
    [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
    [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
    [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
    [9, 8, 7, 6, 5, 4, 3, 2, 1, 0]
  ];
  var VERHOEFF_P = [
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
    [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
    [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
    [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
    [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
    [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
    [7, 0, 4, 6, 9, 1, 3, 2, 5, 8]
  ];
  function verhoeffValid(value) {
    if (typeof value !== 'string' || !/^\d+$/.test(value)) return false;
    var checksum = 0;
    for (var i = 0; i < value.length; i++) {
      var digit = value.charCodeAt(value.length - 1 - i) - 48;
      checksum = VERHOEFF_D[checksum][VERHOEFF_P[i % 8][digit]];
    }
    return checksum === 0;
  }

  function aadhaarValid(raw) {
    var digits = raw.replace(/\s/g, '');
    return /^[2-9]\d{11}$/.test(digits) && verhoeffValid(digits);
  }

  var VIN_VALUES = {
    A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 8, J: 1, K: 2, L: 3, M: 4,
    N: 5, P: 7, R: 9, S: 2, T: 3, U: 4, V: 5, W: 6, X: 7, Y: 8, Z: 9,
    '0': 0, '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9
  };
  var VIN_WEIGHTS = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];

  function vinValid(vin) {
    if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(vin)) return false;
    var sum = 0;
    for (var i = 0; i < 17; i++) {
      var val = VIN_VALUES[vin[i]];
      if (val === undefined) return false;
      sum += val * VIN_WEIGHTS[i];
    }
    var mod = sum % 11;
    var expected = mod === 10 ? 'X' : String(mod);
    return vin[8] === expected;
  }

  // ---------- finders ----------
  // Each finder returns [{ type, value, start, end }].
  // findAll takes a regex with the global flag and an optional validator
  // (receives the matched string, returns false to reject) and an optional
  // value extractor ({ value, offset }) for matches where only part of the
  // match is the sensitive value (used for KEY=value secrets).

  function findAll(text, regex, type, validator, extractor) {
    var out = [];
    regex.lastIndex = 0;
    var m;
    while ((m = regex.exec(text)) !== null) {
      var value = m[0];
      var start = m.index;
      if (extractor) {
        var ex = extractor(m);
        if (!ex) continue;
        value = ex.value;
        start = m.index + ex.offset;
      }
      if (!value) continue;
      if (validator && !validator(value)) continue;
      out.push({ type: type, value: value, start: start, end: start + value.length });
      if (m[0].length === 0) regex.lastIndex++;
    }
    return out;
  }

  var FINDERS = [
    { name: 'jwt', type: 'JWT', priority: 1, run: function (t) {
      return findAll(t, /\beyJ[A-Za-z0-9_-]{8,}\.eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g, 'JWT');
    } },
    { name: 'apiKey', type: 'API_KEY', priority: 1, run: function (t) {
      var a = findAll(t, /\bsk-ant-[A-Za-z0-9_-]{20,}\b/g, 'API_KEY');
      var b = findAll(t, /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/g, 'API_KEY');
      return a.concat(b);
    } },
    { name: 'awsKey', type: 'AWS_KEY', priority: 1, run: function (t) {
      return findAll(t, /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/g, 'AWS_KEY');
    } },
    { name: 'githubToken', type: 'GITHUB_TOKEN', priority: 1, run: function (t) {
      var a = findAll(t, /\bgh[pousr]_[A-Za-z0-9]{36,}\b/g, 'GITHUB_TOKEN');
      var b = findAll(t, /\bgithub_pat_[A-Za-z0-9_]{20,}\b/g, 'GITHUB_TOKEN');
      return a.concat(b);
    } },
    { name: 'slackToken', type: 'SLACK_TOKEN', priority: 1, run: function (t) {
      return findAll(t, /\bxox[bpars]-[A-Za-z0-9-]{10,}\b/g, 'SLACK_TOKEN');
    } },
    { name: 'secret', type: 'SECRET', priority: 2, run: function (t) {
      return findAll(
        t,
        /(?:^|[\s;{,])([A-Za-z0-9_]*(?:password|passwd|secret|token|api[_-]?key|access[_-]?key)[A-Za-z0-9_]*)\s*[:=]\s*["']?([^\s"'`,;]{6,})["']?/gi,
        'SECRET',
        null,
        function (m) {
          var val = m[2];
          if (!val) return null;
          var full = m[0];
          var idx = full.lastIndexOf(val);
          if (idx < 0) return null;
          // Skip values that are already placeholders or obvious non-secrets.
          if (/^<.+>$/.test(val)) return null;
          if (/^(true|false|null|undefined)$/i.test(val)) return null;
          return { value: val, offset: idx };
        }
      );
    } },
    { name: 'email', type: 'EMAIL', priority: 2, run: function (t) {
      return findAll(t, /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, 'EMAIL');
    } },
    { name: 'internalUrl', type: 'INTERNAL_URL', priority: 2, run: function (t) {
      var patterns = [
        /\bhttps?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?(?:\/[^\s"'<>]*)?/gi,
        /\bhttps?:\/\/[A-Za-z0-9.-]+\.local(?::\d+)?(?:\/[^\s"'<>]*)?/gi,
        /\bhttps?:\/\/(?:10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})(?::\d+)?(?:\/[^\s"'<>]*)?/gi
      ];
      var all = [];
      patterns.forEach(function (re) { all = all.concat(findAll(t, re, 'INTERNAL_URL')); });
      return all;
    } },
    { name: 'aadhaar', type: 'AADHAAR', priority: 3, run: function (t) {
      return findAll(t, /\b(?:[2-9]\d{11}|[2-9]\d{3} \d{4} \d{4})\b/g, 'AADHAAR', aadhaarValid);
    } },
    { name: 'iban', type: 'IBAN', priority: 3, run: function (t) {
      var a = findAll(t, /\b[A-Z]{2}\d{2}(?:\s?[A-Z0-9]{4}){2,7}(?:\s?\d{1,3})?\b/g, 'IBAN', ibanValid);
      var b = findAll(t, /\b[A-Z]{2}\d{2}[A-Z0-9]{11,30}\b/g, 'IBAN', ibanValid);
      return a.concat(b);
    } },
    { name: 'card', type: 'CARD', priority: 3, run: function (t) {
      return findAll(t, /\b(?:\d{4}[- ]){3}\d{4}\b|\b\d{13,19}\b/g, 'CARD', function (v) {
        return luhnValid(v.replace(/[- ]/g, ''));
      });
    } },
    { name: 'ssn', type: 'SSN', priority: 3, run: function (t) {
      return findAll(t, /\b\d{3}-\d{2}-\d{4}\b/g, 'SSN', ssnValid);
    } },
    { name: 'usdot', type: 'USDOT', priority: 3, run: function (t) {
      var a = findAll(t, /\bUSDOT\s*:?\s*#?\s*\d{5,8}\b/gi, 'USDOT');
      var b = findAll(t, /\bDOT\s*#\s*\d{5,8}\b/gi, 'USDOT');
      return a.concat(b);
    } },
    { name: 'mc', type: 'MC', priority: 3, run: function (t) {
      return findAll(t, /\bMC\s*#?\s*:?\s*\d{5,7}\b/gi, 'MC');
    } },
    { name: 'vin', type: 'VIN', priority: 3, run: function (t) {
      return findAll(t, /\b[A-HJ-NPR-Z0-9]{17}\b/g, 'VIN', vinValid);
    } },
    { name: 'container', type: 'CONTAINER', priority: 4, run: function (t) {
      return findAll(t, /\b[A-Z]{4}\d{7}\b/g, 'CONTAINER');
    } },
    { name: 'bol', type: 'BOL', priority: 4, run: function (t) {
      var a = findAll(t, /\bBOL\s*#?\s*:?\s*[A-Z0-9][A-Z0-9-]{5,}\b/gi, 'BOL');
      var b = findAll(t, /\bPRO\s*#\s*:?\s*\d{7,10}\b/gi, 'BOL');
      return a.concat(b);
    } },
    { name: 'phone', type: 'PHONE', priority: 5, run: function (t) {
      var patterns = [
        /\+?1[-.\s]?\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}\b/g,
        /\(\d{3}\)\s?\d{3}[-.\s]\d{4}\b/g,
        /\b\d{3}[-.]\d{3}[-.]\d{4}\b/g
      ];
      var all = [];
      patterns.forEach(function (re) {
        all = all.concat(findAll(t, re, 'PHONE', function (v) {
          var digits = v.replace(/\D/g, '');
          if (digits.length === 11 && digits[0] === '1') digits = digits.slice(1);
          if (digits.length !== 10) return false;
          // Area code and exchange cannot start with 0 or 1.
          if (digits[0] === '0' || digits[0] === '1') return false;
          if (digits[3] === '0' || digits[3] === '1') return false;
          return true;
        }));
      });
      return all;
    } },
    { name: 'ipv4', type: 'IP', priority: 5, run: function (t) {
      return findAll(t, /\b(?:\d{1,3}\.){3}\d{1,3}\b/g, 'IP', function (v) {
        var parts = v.split('.');
        return parts.every(function (p) {
          if (p.length > 1 && p[0] === '0' && p !== '0') { /* allow leading zero check below */ }
          var n = Number(p);
          return n >= 0 && n <= 255 && String(n) === String(parseInt(p, 10));
        });
      });
    } },
    { name: 'address', type: 'ADDRESS', priority: 6, run: function (t) {
      return findAll(
        t,
        /\b\d{1,6}\s+(?:[A-Za-z0-9.'-]+\s+){0,4}?(?:Street|St|Avenue|Ave|Boulevard|Blvd|Road|Rd|Lane|Ln|Drive|Dr|Court|Ct|Way|Highway|Hwy|Parkway|Pkwy|Terrace|Ter|Place|Pl)\b\.?/g,
        'ADDRESS'
      );
    } }
  ];

  var FINDER_BY_NAME = {};
  FINDERS.forEach(function (f) { FINDER_BY_NAME[f.name] = f; });

  var PACKS = {
    core: {
      label: 'Core',
      description: 'Everyday personal data: email, phone, SSN, cards, IBAN, IP addresses, street addresses, internal URLs.',
      detectors: ['email', 'phone', 'ssn', 'card', 'iban', 'ipv4', 'address', 'internalUrl']
    },
    developer: {
      label: 'Developer',
      description: 'Credentials developers paste by accident: API keys, JWTs, dot env secrets, AWS keys, GitHub and Slack tokens.',
      detectors: ['apiKey', 'awsKey', 'githubToken', 'slackToken', 'jwt', 'secret']
    },
    india: {
      label: 'India',
      description: 'Indian identity numbers: Aadhaar with Verhoeff checksum validation.',
      detectors: ['aadhaar']
    },
    logistics: {
      label: 'Logistics',
      description: 'US trucking identifiers: USDOT and MC numbers, VINs, BOL and PRO numbers, container numbers.',
      detectors: ['usdot', 'mc', 'vin', 'bol', 'container']
    }
  };

  var TYPE_LABELS = {
    EMAIL: 'Email', PHONE: 'US phone', SSN: 'SSN', CARD: 'Credit card',
    IBAN: 'IBAN', IP: 'IP address', ADDRESS: 'Street address',
    API_KEY: 'API key', AWS_KEY: 'AWS access key', GITHUB_TOKEN: 'GitHub token',
    SLACK_TOKEN: 'Slack token', JWT: 'JWT', SECRET: 'Secret value',
    INTERNAL_URL: 'Internal URL', USDOT: 'US DOT number', MC: 'MC number',
    VIN: 'VIN', AADHAAR: 'Aadhaar number', BOL: 'BOL or PRO number', CONTAINER: 'Container number'
  };

  function detectorNamesForPacks(packNames) {
    var names = {};
    packNames.forEach(function (p) {
      var pack = PACKS[p];
      if (!pack) return;
      pack.detectors.forEach(function (d) { names[d] = true; });
    });
    return names;
  }

  /**
   * detect(text, options) -> [{ type, value, start, end }]
   * options.packs: array of pack names, default all packs.
   */
  function detect(text, options) {
    if (!text || typeof text !== 'string') return [];
    var packNames = (options && options.packs) || Object.keys(PACKS);
    var enabled = detectorNamesForPacks(packNames);
    var all = [];
    FINDERS.forEach(function (f) {
      if (!enabled[f.name]) return;
      var found;
      try { found = f.run(text); } catch (e) { found = []; }
      found.forEach(function (r) { r.priority = f.priority; all.push(r); });
    });
    // De-overlap: earliest start wins, then higher priority, then longer match.
    all.sort(function (a, b) {
      if (a.start !== b.start) return a.start - b.start;
      if (a.priority !== b.priority) return a.priority - b.priority;
      return (b.end - b.start) - (a.end - a.start);
    });
    var kept = [];
    var lastEnd = -1;
    all.forEach(function (r) {
      if (r.start >= lastEnd) {
        kept.push({ type: r.type, value: r.value, start: r.start, end: r.end });
        lastEnd = r.end;
      }
    });
    kept.sort(function (a, b) { return a.start - b.start; });
    return kept;
  }

  function nextIndexForType(map, type) {
    var max = 0;
    Object.keys(map).forEach(function (ph) {
      var m = ph.match(new RegExp('^<' + type + '_(\\d+)>$'));
      if (m) max = Math.max(max, parseInt(m[1], 10));
    });
    return max + 1;
  }

  /**
   * mask(text, existingMap) -> { text, map }
   * map is { "<EMAIL_1>": "real value", ... } and is updated in place semantics
   * via a returned copy. The same value always maps to the same placeholder.
   */
  function mask(text, existingMap, options) {
    var map = {};
    if (existingMap) {
      Object.keys(existingMap).forEach(function (k) { map[k] = existingMap[k]; });
    }
    if (!text || typeof text !== 'string') return { text: text || '', map: map };
    var findings = detect(text, options);
    if (!findings.length) return { text: text, map: map };
    var byValue = {};
    Object.keys(map).forEach(function (ph) { byValue[map[ph]] = ph; });
    var counters = {};
    var result = '';
    var cursor = 0;
    findings.forEach(function (f) {
      var ph = byValue[f.value];
      if (!ph) {
        if (counters[f.type] === undefined) counters[f.type] = nextIndexForType(map, f.type);
        ph = '<' + f.type + '_' + counters[f.type] + '>';
        counters[f.type]++;
        map[ph] = f.value;
        byValue[f.value] = ph;
      }
      result += text.slice(cursor, f.start) + ph;
      cursor = f.end;
    });
    result += text.slice(cursor);
    return { text: result, map: map };
  }

  /**
   * restore(text, map) -> text with placeholders swapped back to real values.
   */
  function restore(text, map) {
    if (!text || !map) return text || '';
    var keys = Object.keys(map).sort(function (a, b) { return b.length - a.length; });
    var out = text;
    keys.forEach(function (ph) {
      out = out.split(ph).join(map[ph]);
    });
    return out;
  }

  var api = {
    detect: detect,
    mask: mask,
    restore: restore,
    PACKS: PACKS,
    TYPE_LABELS: TYPE_LABELS,
    validators: { luhnValid: luhnValid, ibanValid: ibanValid, ssnValid: ssnValid, vinValid: vinValid, verhoeffValid: verhoeffValid, aadhaarValid: aadhaarValid }
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  root.BeforeYouPasteDetectors = api;
})(typeof window !== 'undefined' ? window : globalThis);
