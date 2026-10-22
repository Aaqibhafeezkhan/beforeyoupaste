# BeforeYouPaste

![Stars](https://img.shields.io/github/stars/aamirtechs/beforeyoupaste?style=flat&color=C9A227)
![Forks](https://img.shields.io/github/forks/aamirtechs/beforeyoupaste?style=flat&color=0D1F3C)
![Issues](https://img.shields.io/github/issues/aamirtechs/beforeyoupaste?style=flat)
![Local only](https://img.shields.io/badge/Local%20only-Zero%20network%20requests-1DBF73?style=flat)
![PRs welcome](https://img.shields.io/badge/PRs-welcome-brightgreen?style=flat)

**Paste into AI chats without handing over the real data.**

BeforeYouPaste is a free, open source Chrome extension that catches personal data and secrets in your text *before* they reach ChatGPT, Claude, Gemini or Perplexity, swaps them for placeholders like `<EMAIL_1>` and `<API_KEY_1>`, and restores the real values in the AI reply with one click. Everything runs locally. The extension makes zero network requests.

## The problem

People paste first and think later, and the numbers show it:

* LayerX research (2025) found that about **77% of GenAI users copy and paste company data into AI tools**, and about 22% of those pastes include PII or PCI data.
* Cyberhaven (2026) reported that **39.7% of data movements into AI tools carry something sensitive**.
* Samsung banned generative AI tools for staff in May 2023 after employees pasted source code and meeting notes into ChatGPT.

Once text is sent, it is out of your hands. Redaction tools that replace values with `[REDACTED]` are not much better, because the AI loses the context it needs and you lose the ability to turn the answer back into something usable.

## How it works

1. **Detect.** When you paste into a supported AI chat, BeforeYouPaste scans the pasted text locally with its detector library. Emails, cards, API keys, tokens, ID numbers and more are found in milliseconds.
2. **Mask.** A dialog lists what was found, by type only, never showing the values. Confirm, and the paste goes in with consistent placeholders instead. The same value always becomes the same placeholder, so the AI can still reason about relationships in your text. Real values go only into the local Vault, stored in `chrome.storage.local` on your machine.
3. **Restore.** When the AI answers using your placeholders, a floating **Restore values** button appears. One click swaps the real values back into the reply, locally, in your browser.

## Features

* Reversible masking. Placeholders out, real values back in, round trip guaranteed by tests.
* Consistent numbering. The same email is always `<EMAIL_1>`, in every paste, until you clear the Vault.
* Per-type policies. Set each data type to **Warn** (ask me), **Block** (stop the paste) or **Allow** (let it through) in the Vault side panel.
* Detector packs. Core, Developer and Logistics packs ship in v1.0, and new packs are small, reviewable contributions.
* A real Vault. Inspect masked previews, reveal a value when you need it, copy a placeholder, delete one entry, or export and import the whole mapping as JSON.
* Zero network requests. No analytics, no telemetry, no servers. Open the source and check. There is no build step and there are no dependencies.
* Works on ChatGPT (chatgpt.com and chat.openai.com), Claude, Gemini and Perplexity.

## Detector packs

| Pack | What it catches |
| --- | --- |
| Core | Email, US phone, SSN (with invalid range checks), credit cards (Luhn check), IBAN (mod-97 check), IPv4 addresses, US street addresses, internal and private URLs (localhost, .local, RFC 1918 links) |
| Developer | OpenAI and Anthropic style API keys (`sk-...`), AWS access keys (`AKIA...`), GitHub tokens (`ghp_`, `github_pat_`), Slack tokens (`xox...`), JWTs, and `.env` style secrets (`PASSWORD=...`, `API_KEY=...`) |
| Logistics | US DOT numbers, MC numbers, VINs (with check digit validation), BOL and PRO numbers, container numbers |
| India | Aadhaar numbers with Verhoeff checksum validation, supporting plain and 4-4-4 spaced formats |

Validators matter. A 16 digit number that fails the Luhn check is not flagged as a card, an IBAN that fails mod-97 is left alone, and SSNs in invalid ranges (000, 666, 900 to 999) are rejected. Fewer false alarms means you keep the shield on.

## Install (load unpacked)

1. Clone or download this repository.
2. Open `chrome://extensions` in Chrome (or any Chromium browser).
3. Turn on **Developer mode** (top right).
4. Click **Load unpacked** and select the repository folder.
5. Pin BeforeYouPaste to your toolbar. Open any supported AI chat and paste something with an email address in it to see it work.

There is nothing to build. The extension is plain vanilla JavaScript.

Note on icons: the four PNG icons live in `icons/` in release builds. If you cloned a copy without them, regenerate them with `python scripts/generate-icons.py` (requires Pillow).

## Screenshots

Screenshots will be added here with the first store listing. The surfaces are:

* The paste confirmation dialog, listing detected types and counts.
* The popup, showing shield status and how many values your Vault protects.
* The Vault side panel, with masked previews, per-entry controls and per-type policies.

## Privacy promise

* **No data collected.** No accounts, no analytics, no telemetry.
* **No network requests.** The extension has no server and calls no APIs. Host permissions exist only so the content script can run on the AI chat sites you already use.
* **Local storage only.** The placeholder mapping lives in `chrome.storage.local` in your browser profile. Clear it any time from the popup or the Vault.
* **Open and auditable.** MIT licensed, no minification, no build step. What you read is what runs.

See [PRIVACY.md](PRIVACY.md) for the full policy.

## Roadmap

* v1.1: Screenshot and image blur before share.
* v1.1: More country packs (UK, Canada, Germany, India) as community contributions land.
* v1.2: Team policy packs, shared detector rules for a whole support or dispatch team.
* v1.2: Optional encrypted Vault export.
* Later: Firefox build.

## Contributing

Detector packs are the perfect first contribution. A new country ID format or a profession specific number (healthcare, legal, recruiting) is usually one small detector plus tests. See [CONTRIBUTING.md](CONTRIBUTING.md) for the step by step guide, and [docs/GOOD_FIRST_ISSUES.md](docs/GOOD_FIRST_ISSUES.md) for seeded ideas with scope notes.

Run the tests any time with:

```bash
npm test
```

## License

MIT. See [LICENSE](LICENSE). Copyright 2026 Amir Hussain.
