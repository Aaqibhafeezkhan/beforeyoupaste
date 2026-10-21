# Contributing to BeforeYouPaste

Thanks for helping. The best contributions here are small, well tested detectors. This guide walks through adding one, end to end.

## Ground rules

* Vanilla JavaScript only. No dependencies, no build step, no frameworks.
* No network requests, ever. If a detector needs a server, it does not belong here.
* Every detector ships with tests. A pull request without tests for its detector will be asked to add them.
* 2 space indentation, single quotes in JavaScript, semicolons, `'use strict'` where the file already uses it.
* Never log, store or transmit real sensitive values in tests or examples. Use the published sample values for each format (test card numbers, example keys, reserved documentation IPs).

## How to add a detector pack (or a detector)

### 1. Pick the format and find its rules

Good detectors have a *validator*, not just a shape. Before writing code, find:

* The exact pattern (length, prefixes, separators people actually type).
* A check rule if one exists (a check digit, a checksum, invalid ranges, reserved blocks).
* Official or widely published sample values, valid and invalid, for tests.

If the format has no check rule at all, say so in your pull request. Shape only detectors need a stricter pattern and a low false positive bar.

### 2. Add the finder in `src/detectors.js`

* Add a finder entry to the `FINDERS` array. Use `findAll(text, regex, TYPE, validator)` where possible.
* `priority` controls overlap resolution. Credentials and tokens are 1 to 2, validated ID numbers are 3, looser patterns like phone and address are 5 to 6.
* Pick a placeholder type in capitals, for example `PASSPORT`, and add a human label for it in `TYPE_LABELS`.
* Keep regexes bounded. No nested quantifiers that can stall on long pastes.

### 3. Register it in a pack

Add the finder name to an existing pack in `PACKS`, or create a new pack entry with a `label`, a one line `description`, and its `detectors` list. Packs are how users understand what the extension watches for, so name them by audience (a country or a profession), not by technology.

### 4. Write tests in `tests/detectors.test.js`

Cover at least:

* A valid value is detected, in a realistic sentence.
* An invalid value is rejected (bad check digit, invalid range, wrong length).
* Masking removes the value and inserts the right placeholder.
* A mask and restore round trip on a sentence containing your value returns the original text.
* An ordinary sentence near your format produces no false positive.

### 5. Run the checks

```bash
npm test
node --check src/detectors.js
```

Both must pass before you open the pull request.

### 6. Update the docs

* Add your detector to the packs table in `README.md`.
* Add a line to `CHANGELOG.md` under Unreleased.

## Pull request checklist

* One detector or one pack per pull request.
* Tests pass locally, and the test count grew.
* No new files outside `src/`, `tests/` and the docs, unless the change needs one.
* No em dashes in docs or comments. Use periods or commas. (House style, checked in review.)

## Ideas to start with

See [docs/GOOD_FIRST_ISSUES.md](docs/GOOD_FIRST_ISSUES.md) for scoped starter issues. Claim one by commenting on it before you start, so two people do not build the same detector.
