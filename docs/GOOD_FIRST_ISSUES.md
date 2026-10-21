# Good first issues

Seeded starter issues for BeforeYouPaste. Each one is a self contained detector task with a clear finish line: finder, pack registration, tests, docs. Read [CONTRIBUTING.md](../CONTRIBUTING.md) before starting, and claim an issue by commenting on it.

## 1. UK National Insurance number detector

* **Pack:** new UK pack.
* **Scope:** Detect the standard format, two prefix letters, six digits, one suffix letter (A to D). Reject the invalid prefix combinations published by HMRC (for example BG, GB, NK, KN, TN, NT, ZZ) and prefixes with D, F, I, Q, U or V in the wrong positions.
* **Tests:** one valid sample, two invalid prefixes, one false positive guard (a short product code that merely looks similar).
* **Size:** small. Regex plus a prefix validator.

## 2. IBAN country variants pack

* **Pack:** Core, extension of the existing IBAN detector.
* **Scope:** The current IBAN detector validates any country with mod-97. Add country specific length checks for the biggest user countries first (DE 22, FR 27, GB 22, ES 24, IT 27, NL 18) so wrong length IBANs for those countries are rejected, plus a country label in the finding type label (keep the placeholder type as IBAN).
* **Tests:** valid and wrong length samples for at least three countries.
* **Size:** small to medium. Mostly a length table plus tests.

## 3. Aadhaar detector (India)

* **Pack:** new India pack.
* **Scope:** Detect 12 digit Aadhaar numbers, written plain or in the common 4-4-4 spaced format. Validate with the Verhoeff checksum, which Aadhaar uses. Reject numbers starting with 0 or 1, per UIDAI rules.
* **Tests:** a published sample with a correct Verhoeff digit, the same number with the last digit changed (must be rejected), spaced and unspaced forms.
* **Size:** medium. The Verhoeff tables are the main work, and they are a great contained contribution.

## 4. Healthcare pack (US)

* **Pack:** new Healthcare pack.
* **Scope:** Detect US health insurance member IDs by shape per major payer patterns is too fuzzy, so scope this issue narrowly: detect NPI numbers (10 digits with the Luhn check over the 80840 prefix, as CMS specifies) and DEA numbers (two letters plus seven digits, with the DEA checksum: sum of digits in odd positions plus twice the sum of even positions, last digit must match).
* **Tests:** one valid and one checksum broken sample for each format.
* **Size:** medium. Two checksums, both well documented.

## 5. Canadian SIN detector

* **Pack:** new Canada pack.
* **Scope:** Detect Social Insurance Numbers, nine digits plain or in 3-3-3 spaced or dashed form. Validate with the standard SIN Luhn variant check. Optionally flag, but do not reject, numbers starting with 9 (temporary residents).
* **Tests:** the classic valid sample 046 454 286, an invalid check digit sample, dashed and plain forms.
* **Size:** small. Luhn helper already exists in the codebase to reuse.

## 6. German RVNR detector

* **Pack:** new Germany pack.
* **Scope:** Detect the Rentenversicherungsnummer, 12 characters: two digit area, six digit birth date (DDMMYY), the first letter of the birth surname, three digit serial, one check digit. Validate the check digit using the documented letter to number conversion and mod 10 weighted sum. Also sanity check that the embedded birth date is a real date.
* **Tests:** one constructed valid sample (show the check digit maths in a comment), one bad check digit, one impossible birth date.
* **Size:** medium. The date check is the interesting part.

## 7. International phone formats pack

* **Pack:** Core extension, new International phone detectors.
* **Scope:** The Core pack only catches US numbers today. Add E.164 international format detection (`+` plus country code plus 7 to 14 digits) with a per country length table for the top countries (GB, DE, FR, IN, PK, AE, AU, CA outside the US plan). Keep false positives near zero: a bare long digit string with no `+` must not match.
* **Tests:** one valid sample per at least four countries, one too short sample rejected, one long order number without `+` not flagged.
* **Size:** medium. Pattern discipline matters more than pattern count.

## 8. Date of birth detector

* **Pack:** Core.
* **Scope:** Detect dates of birth only when labelled, because bare dates are everywhere and mostly harmless. Match label plus date pairs such as `DOB: 03/14/1990`, `Date of birth: 14 March 1990`, `Born: 1990-03-14`, and mask only the date value. Support MM/DD/YYYY, DD Month YYYY and ISO formats, and validate that the date is real (no 02/30) and the year is plausible (1900 to today).
* **Tests:** all three labelled formats, an impossible date rejected, a bare unlabelled date in a normal sentence not flagged.
* **Size:** small to medium. Reuse the KEY=value style extractor pattern from the secrets detector.

---

Finished one? Open the pull request with the test output pasted in, and add your detector to the packs table in the README. Welcome aboard.
