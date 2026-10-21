# Privacy Policy for BeforeYouPaste

Last updated: 21 October 2026.

BeforeYouPaste is a browser extension that helps you avoid pasting personal data and secrets into AI chat websites. This policy explains, plainly, what the extension does with data. The short version: **it collects nothing, sends nothing, and stores mappings only on your own device.**

## Data we collect

None. BeforeYouPaste has no user accounts, no analytics, no telemetry, no crash reporting and no advertising. The developer receives no data of any kind from the extension.

## Network requests

The extension makes **zero network requests**. It has no server, calls no APIs, and loads no remote code, fonts or images. Host permissions for chatgpt.com, chat.openai.com, claude.ai, gemini.google.com and www.perplexity.ai exist only so the content script can run on those pages, in your browser, at the moment you paste.

## Data stored locally

When you confirm a masked paste, the extension saves a mapping between placeholders (for example `<EMAIL_1>`) and the real values they replaced. This mapping:

* Is stored only in `chrome.storage.local`, inside your own browser profile, on your own device.
* Is never transmitted anywhere. There is nowhere to transmit it to.
* Stays until you delete an entry, clear the Vault from the popup or side panel, export and remove it, or uninstall the extension.
* Can be exported by you, as a JSON file you choose to download, and imported back by you. Exporting is a local file download. Sharing that file is your decision, and the file does contain your real values, so treat it like the sensitive data it holds.

Per-type policy settings (Warn, Block or Allow) and the on or off state of the shield are also stored in `chrome.storage.local`. They contain no personal data.

## Data processed in the page

To detect sensitive values, the extension reads text that *you* paste into a chat input on a supported site, and, for the Restore values feature, the text of placeholders visible in the conversation area. This processing happens entirely in your browser, in memory. Page content is not stored, copied elsewhere, or sent anywhere by the extension.

## Permissions, and why each is requested

* `storage`: to keep the placeholder mapping and your settings in local storage.
* `sidePanel`: to show the Vault side panel.
* `activeTab`: to open the side panel for the tab you are using.
* Host permissions for the five AI chat domains: to run the paste protection and restore features on those sites only.

## Children

The extension is a general purpose productivity and privacy tool. It is not directed at children, and it collects no data from anyone, including children.

## Changes to this policy

If a future version changes any of the statements above, this file and the Chrome Web Store listing will be updated before that version is published, and the change will be noted in `CHANGELOG.md`.

## Contact

Questions about this policy can be raised as an issue on the project's GitHub repository (github.com/aamirtechs).
