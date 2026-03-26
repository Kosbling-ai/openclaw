# Changelog

English (default) | [简体中文](CHANGELOG.zh-CN.md)

Docs: https://docs.openclaw.ai

> Kosbling Edition changelog (concise).
> Only keep practical updates for this fork: upstream sync points, fork-level behavior changes, and notable fixes.

## Unreleased

- Upstream sync target advanced to `v2026.3.13-1`.
- Docs/process: README and CHANGELOG are now maintained as fork-focused bilingual docs; each commit should evaluate and sync both language files when user-facing behavior changes.
- Cron isolated sessions: when starting a fresh run (`forceNew`/stale reset), clear inherited `sessionFile` to avoid pointing new `sessionId` at an old transcript file.
- Web UI: restored a visible `Kosbling Edition` badge in the control dashboard sidebar after the upstream shell refresh.
- Feishu groups: stopped replaying historical assistant finals on new embedded-session runs, preventing repeated outbound replies while still suppressing transcript-only internal assistant messages.
- Feishu groups: added a runner-level safeguard that scopes outbound assistant payloads to the current turn's newly appended messages, so replayed historical finals cannot leak through cloned session events.
- Feishu groups: fixed back-to-back embedded runs in the same session so a late assistant `message_end` from the previous turn cannot be misattributed to the next run and sent again as a duplicate reply.

## Model Isolation Timeline

- `8974918104` Initial fork feature: split model lanes for main vs cron/subagent.
- `ce60f9ef8d` First strict guard: blocked ad-hoc model switching while isolation was enabled.
- `60287ff919` Added per-agent override support, constrained to the active group allowlist.
- `09a024afcc` Added isolation group visibility to `/status`.
- `6203e08177` Made `/status` model line reflect isolation-selected runtime model.
- `bbe260d7be` Fixed `/status` fallback line so it only appears after a real fallback.
- `c068fa0ea9` Moved config from legacy namespace to root-level `modelIsolation`.
- `256d35c00f` Fixed false fallback reporting before the first request in isolation mode.
- `ddd0bec980` Unified runtime model resolution and started enforcing override guards through shared isolation logic.
- `4412588128` Normalized model overrides consistently across sessions, spawn, and cron.
- `a2b54ffbe9` Let `sessions_spawn` explicit model requests flow through the same isolation normalization path.
- `d5ec256e4d` Made persisted session model overrides honor isolation-normalized effective models.
- `7bf6d0f1a6` Added main-group token guardrail controls.
- `e3c29e8840` Switched guardrail accounting to weighted token usage.
- `a2aa1a1e03` Aligned model-selection surfaces so `/model`, session overrides, `sessions.patch`, cron payloads, and spawn-time models now follow the same isolation rules.

## 2026.3.8

- Upstream sync baseline advanced to include `v2026.3.8`.
- Added model isolation main-group token guardrail support (weighted accounting + manual reset controls in WebChat/CLI).
- Added CLI session cleanup flags: `--clear-context-tokens` and optional `--clear-total-tokens-fresh`.
- Continued cleanup of fork-only patches already covered by upstream (models merge/baseUrl precedence and failover status classification).

## 2026.3.7

- Added/expanded fork-facing model isolation behavior and related status/runtime alignment.
- Improved fallback/error visibility for provider failures in embedded runner and logs.
- Added channel-specific DM normalization fix (`p2p -> direct`) for block-deliver behavior consistency.

## Maintenance Notes

- Keep entries short and user-impact focused.
- Prefer one-line bullets; avoid full upstream release duplication.
- Append new items to the active version section.
