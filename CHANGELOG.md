# Changelog

All notable changes to BeforeYouPaste are documented here. The format follows Keep a Changelog, and versions follow semantic versioning.

## [Unreleased]

* Nothing yet. New detector packs land here first.

## [1.0.0] - 2026-10-21

### Added

* Paste protection on ChatGPT, Claude, Gemini and Perplexity. Detected values are listed by type, and a confirmed paste is masked with consistent typed placeholders.
* Reversible Vault in `chrome.storage.local`, with a side panel to inspect masked previews, reveal, copy, delete, export and import mappings.
* Floating Restore values button that swaps real values back into AI replies with one click.
* Per-type policies: Warn, Block or Allow, per data type.
* Core detector pack: email, US phone, SSN with invalid range checks, credit cards with Luhn validation, IBAN with mod-97 validation, IPv4, US street addresses, internal and private URLs.
* Developer detector pack: OpenAI and Anthropic style API keys, AWS access keys, GitHub tokens, Slack tokens, JWTs, and `.env` style secrets.
* Logistics detector pack: US DOT numbers, MC numbers, VINs with check digit validation, BOL and PRO numbers, container numbers.
* Popup with shield status, Vault count, on or off toggle and Clear Vault.
* Node test suite for the detector library. No dependencies, no build step.
