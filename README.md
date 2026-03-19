# OpenClaw — Kosbling Edition

English (default) | [简体中文](README.zh-CN.md)

A customized fork of [OpenClaw](https://github.com/openclaw/openclaw) for the [Kosbling AI Studio](https://kosbling.ai) e-commerce assistant platform.

## Upstream Relationship

- Upstream repository: `https://github.com/openclaw/openclaw.git`
- Sync strategy: `git merge --no-ff` (preserve merge history)
- Current baseline: `upstream/main` (synced 2026-03-14, includes `v2026.3.13-1`)

## Custom Changes

All custom changes are marked in source code with `// KOSBLING-PATCH`.

### Feature Changes

- **Model Isolation** (`src/agents/edition-isolation.ts` + multiple files)
  - Root-level `modelIsolation` config with isolated `main`/`secondary` model lanes
  - Normal interactive sessions stay on `main`; cron and subagent flows are routed to `secondary`
  - `/model`, stored session overrides, `sessions.patch`, `sessions_spawn`, cron payload models, and spawn-time explicit models all go through the same isolation normalization layer
  - In-group model requests are kept; out-of-group requests are rewritten back to the active group's effective model
  - Supports per-agent model override and main-group token guardrail
  - Detailed evolution and commit trail: [CHANGELOG.md#model-isolation-timeline](CHANGELOG.md#model-isolation-timeline)
  - See [Model Isolation](#model-isolation)

- **CLI branding in banner** (`src/cli/banner.ts`)
  - `✦ Kosbling Edition ✦` under ASCII art
  - Single-line banner: `[Kosbling Edition]`

- **Web UI branding badge** (`ui/src/ui/app-render.ts` + `ui/src/styles/layout.css`)
  - Control dashboard sidebar keeps a visible `Kosbling Edition` marker on the new upstream UI shell

- **CLI `--version` includes git commit hash** (`src/cli/program/context.ts`)
  - `openclaw -v` output format: `2026.3.13-kosbling.7 (dee8c1468e)`

- **Update flow disabled** (`src/infra/update-startup.ts` + `src/cli/update-cli/update-command.ts` + `src/config/io.ts`)
  - `openclaw update` now guides users to `git pull`
  - Startup update check and config version warning are skipped

- **System prompt injection** (`src/agents/system-prompt.ts`)
  - Adds Kosbling Edition guidance to all agent system prompts
  - Includes model-isolation behavior and config guidance

- **Bundled `skill-creator` skill** (`skills/skill-creator/**`)
  - Adds a reusable Codex skill for creating, auditing, improving, packaging, and evaluating AgentSkills
  - Includes bundled reviewer agents, packaging/validation scripts, schema references, and an evaluation viewer

- **Global network SSRF policy for tool fetch paths** (`src/infra/net/trusted-network-ssrf.ts` + related tools/config)
  - Adds root-level `network.ssrfPolicy` as the default SSRF policy for non-browser network tools
  - Current inherited paths: `web_fetch`, `image` remote URL loading, and message attachment URL fetching
  - `tools.web.fetch.ssrfPolicy` remains a per-tool override (higher priority than `network.ssrfPolicy`)
  - Legacy compatibility: if `network.ssrfPolicy` is unset, runtime falls back to `browser.ssrfPolicy`
  - Recommended steady-state: use `network.ssrfPolicy` for global behavior and keep browser policy browser-scoped

### Bug Fixes

> `[Upstream]` means an issue in upstream code. `[Kosbling]` means a follow-up fix needed for our custom behavior.

- **`[Kosbling]` `fallbackConfigured` ignored `modelIsolation` fallbacks** (`src/agents/pi-embedded-runner/run.ts`)
  - Upstream only checked `agents.defaults.model.fallbacks`
  - In isolation mode, this caused fallback checks to be skipped
  - Fix: extend check to include `modelIsolation.enabled` + `main/secondary.fallbacks`

- **`[Kosbling]` false fallback status in `/status`** (`src/auto-reply/status.ts`)
  - Before first runtime model selection, isolation branch could incorrectly display fallback state
  - Fix: add `hasRuntimeModel` guard

- **`[Upstream]` `block_deliver.dm_enable` did not apply in Feishu DM (`p2p`) chats** (`src/channels/chat-type.ts` + tests)
  - Upstream DM normalization recognized `direct`/`dm` only and did not map Feishu `p2p`
  - Result: with `block_deliver.block_disable=true` and `dm_enable=true`, Feishu DMs were still filtered as non-DM targets
  - Fix: normalize `p2p -> direct` so the DM exception path works as expected
  - Upstream PR: [openclaw/openclaw#49819](https://github.com/openclaw/openclaw/pull/49819)
- **`[Upstream]` transcript-only `gateway-injected` assistant messages leaked to external channels** (`src/agents/pi-embedded-subscribe.handlers.messages.ts`)
  - A normal assistant reply could be delivered first, then a transcript-only `provider=openclaw` / `model=gateway-injected` assistant message could enter the same outward delivery path and appear like a duplicate reply in channel integrations.
  - Fix: suppress transcript-only injected assistant messages in embedded subscribe `handleMessageStart` / `handleMessageUpdate` / `handleMessageEnd`.
  - Upstream PR: [openclaw/openclaw#49779](https://github.com/openclaw/openclaw/pull/49779)
- **`[Upstream]` provider transient INTERNAL errors are retryable failover timeouts** (`src/agents/pi-embedded-helpers/failover-matches.ts`)
  - `got status: INTERNAL` and payloads like `{"status":"INTERNAL","code":500}` are classified as transient timeout-style failover errors.
  - Upstream PR: [openclaw/openclaw#50148](https://github.com/openclaw/openclaw/pull/50148)

### Upstream-Covered (no longer fork-only)

- **HTTP provider errors now trigger model fallback upstream** (`src/agents/pi-embedded-runner/run.ts`)
  - Upstream now handles `lastAssistant.stopReason="error"` in the embedded runner failover path, so the old fork-only rethrow patch is no longer needed.
- **Model fallback observability moved upstream** (`src/agents/model-fallback.ts`)
  - The fork-only stdout fallback-attempt log is no longer needed because upstream now emits structured fallback decision logs.
- **Models merge-mode provider baseUrl precedence + api drift refresh** (`src/agents/models-config.ts`)
  - Fork-specific merge/baseUrl preservation patches were removed; behavior now follows upstream `planOpenClawModelsJson` flow and upstream test coverage.
- **HTTP 529 classification in failover path** (`src/agents/failover-error.ts`)
  - Fork-specific HTTP status mapping patch was removed; behavior now uses upstream shared classifier (`classifyFailoverReasonFromHttpStatus`), including `529 -> rate_limit`.
- **ACP `sessions.patch` lineage validation for `acp:*` session keys** (`src/gateway/sessions-patch.ts`)
  - Upstream now allows spawn lineage fields on ACP session keys, so the old fork patch can stay removed.
- **Gateway supervised restart guardrails** (`src/infra/process-respawn.ts`)
  - The current implementation now comes from upstream and includes supervised-env markers + launchd kickstart flow.
- **WebChat streamed-text fallback on empty `final` messages** (`ui/src/ui/controllers/chat.ts` + `ui/src/ui/chat/grouped-render.ts`)
  - Upstream now preserves streamed text when `final` has no displayable assistant content, so the earlier fork-only UI patch is no longer required.

## Model Isolation

Kosbling Edition uses model isolation to keep regular chat traffic and background/automation work on separate model lanes without relying on operator discipline.
The current implementation is the result of several follow-up fixes and refactors, so the practical behavior is broader than the original "main vs cron/subagent" note.
For the commit-by-commit evolution of this feature, see [CHANGELOG.md#model-isolation-timeline](CHANGELOG.md#model-isolation-timeline).

`openclaw.json` example:

```json5
{
  modelIsolation: {
    enabled: true,
    main: {
      model: "anthropic/claude-opus-4-6",
      fallbacks: ["anthropic/claude-sonnet-4-6"],
      tokenGuardrail: {
        enabled: true,
        windowMinutes: 5,
        maxTokens: 20000,
      },
    },
    secondary: {
      model: "anthropic/claude-sonnet-4-6",
      fallbacks: ["anthropic/claude-haiku-3-5"],
    },
    agents: {
      writer: {
        model: "anthropic/claude-sonnet-4-6",
      },
    },
  },
}
```

### What it controls

- `main` group: normal agent conversations such as DM/group replies, TUI, WebChat, and other primary interactive runs
- `secondary` group: cron-owned runs and subagent-owned runs
- Fallbacks are group-local. A `main` session never falls through to `secondary`, and `secondary` never borrows `main`
- If `modelIsolation.enabled` is missing or `false`, OpenClaw uses upstream behavior

### Effective model resolution

When isolation is enabled, the runtime does not just read `main.model` / `secondary.model` once.
It resolves an effective model for each run using these rules:

1. Pick the active group from the session key (`main` for regular sessions, `secondary` for cron/subagents).
2. Load that group's primary model and fallback list.
3. If `modelIsolation.agents.<agentId>.model` is set, accept it only when it is inside the active group's allowlist (`primary + fallbacks`).
4. Use that effective model as the group's baseline for the run.

That means per-agent override is not a third free-form lane.
It is a group-local override constrained by the current group's allowlist.

### How model requests are handled

Isolation is enforced through a shared normalization path, not by one-off checks.
The following surfaces all go through the same isolation resolver:

- `/model` and other chat directive-driven model changes
- stored session model overrides
- `sessions.patch`
- `sessions_spawn`
- cron `payload.model`
- explicit model values passed during subagent spawn / internal run setup

Practical result:

- request a model inside the active group's allowlist: the requested model is kept
- request a model outside the active group: the request is rewritten back to the active group's effective model
- request an invalid model string: the request still errors normally

So the current behavior is better described as "group-aware normalization" than "hard block everything except the default model".

### Block Delivery Policy (new)

```json5
{
  agents: {
    defaults: {
      block_deliver: {
        block_disable: true, // disable block delivery for non-webchat channel targets
        dm_enable: true, // when block_disable is true, still allow block delivery in DMs
      },
    },
  },
}
```

- `block_disable`: when `true`, non-`webchat` targets no longer receive block/stream chunks and only receive final replies.
- `dm_enable`: when `true` and `block_disable=true`, direct-message chats still receive block/stream chunks.
  - Feishu note: `p2p` chat type is treated as `direct`.

Behavior summary:

- `enabled: false` or missing: upstream behavior, no impact
- `enabled: true`: `main` handles interactive sessions, `secondary` handles cron/subagents
- Groups are fully isolated, fallback does not cross groups, and full failure surfaces as error
- Model choice surfaces are normalized to the active group, not allowed to drift across lanes
- Session model overrides stay persisted per session, but their effective runtime model is isolation-normalized
- Fallback order follows the active group (`main` vs `secondary`)
- `/status` shows the effective session model and only shows a fallback line after an actual runtime fallback occurs
- The `Edition` line in `/status` shows the current isolation group baseline

For custom provider merge behavior (`openclaw.json` vs per-agent `models.json`), see [Models registry](https://docs.openclaw.ai/concepts/models#models-registry-modelsjson).
For token-window cache reset after model/fallback drift, run `openclaw sessions cleanup --enforce --clear-context-tokens` (optional: add `--clear-total-tokens-fresh`).

### Model Isolation Token Guardrail (main group)

`modelIsolation.main.tokenGuardrail` adds a per-agent guardrail for main-group sessions.
If weighted token usage across that agent's main-group sessions exceeds the configured
window threshold, main-group runs are paused for that agent until you manually disable
the guardrail.

Important scope details:

- Guardrail is main-group only; secondary-group cron/subagent runs are not paused by it
- State is tracked per agent under that agent's directory
- Trigger state is queryable from Gateway/UI and can be cleared with the CLI command below

```json5
{
  modelIsolation: {
    enabled: true,
    main: {
      tokenGuardrail: {
        enabled: true,
        windowMinutes: 5,
        maxTokens: 20000,
      },
    },
  },
}
```

Current weighted accounting:

- `input * 1`
- `cacheRead * 0.1`
- `cacheWrite * 1.2`
- `output * 5`

Disable for a specific agent:

```bash
openclaw agents isolation-guardrail disable --agent <agent-id>
```

### Config Migration

Legacy paths `edition.modelIsolation` and `kosbling.modelIsolation` are auto-migrated to root-level `modelIsolation` at startup.

## Development Rules

### Change Log Discipline

Every change must also update this README:

- **Feature change** -> add under "Feature Changes"
- **Bug fix** -> add under "Bug Fixes"
- If it is an upstream bug, include upstream issue links
- If a listed feature or fix has already been submitted upstream as a PR, append `Upstream PR: [openclaw/openclaw#<number>](...)` to that README entry

### System Prompt Sync Required

Any functional change must be evaluated for updates in the Kosbling Edition section of `src/agents/system-prompt.ts`.

### Code Marking

All custom edits must include `// KOSBLING-PATCH` comments to simplify upstream conflict resolution.

## Installation

### Prerequisites

- Node.js 22+
- pnpm

### First Install (target machine)

```bash
git clone https://github.com/Openbling-ai/openclaw.git ~/.openclaw-kosbling
cd ~/.openclaw-kosbling
./build-and-link.sh
```

### Update

```bash
cd ~/.openclaw-kosbling
git pull
./build-and-link.sh
```

### Dev machine

Running `./build-and-link.sh` in the fork source repo only builds and does not register global CLI links (to avoid conflicts with runtime repos).

After code changes:

```bash
./build-and-link.sh          # build only, validate compile
git add -A && git commit     # commit
git push origin main         # push
```

Then pull and build in your runtime repo (`~/.openclaw-kosbling`) to deploy.

## Versioning

Version format: `{upstream_version}-kosbling.{patch}`

Example: `2026.3.13-kosbling.7`

Version is maintained in root `VERSION`. `build-and-link.sh` reads it and writes into `package.json` during build.

### Release Flow

```bash
# 1) Update VERSION
echo "2026.3.13-kosbling.7" > VERSION

# 2) Commit and push
git add -A && git commit -m "release: v2026.3.13-kosbling.7"
git push origin main
```

## Upstream Sync

```bash
git fetch upstream
git checkout upstream
git merge v2026.2.xx
git checkout main
git merge upstream --no-ff -m "Merge upstream v2026.2.xx"
git push origin main upstream
```

## Branches

- `main` - primary development branch with all Kosbling Edition customizations
- `upstream` - tracks upstream OpenClaw for merge/sync operations

## License

Same license as upstream OpenClaw.
