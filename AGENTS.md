# Repository Guidelines

## Repo Identity

- Upstream repo: https://github.com/openclaw/openclaw
- This repository is the **Kosbling Edition** customized OpenClaw fork.
- `README.md` / `README.zh-CN.md` and `CHANGELOG.md` / `CHANGELOG.zh-CN.md` are fork-specific documents, not upstream mirrors.
- In chat replies, use repo-root-relative file references only (example: `src/commands/agent.ts:42`).
- When answering questions, verify in code first and avoid guesswork.

## Scope And Structure

- Core source lives in `src/`.
- Tests are colocated as `*.test.ts`; end-to-end tests use `*.e2e.test.ts`.
- Extensions/plugins live in `extensions/*`.
- Docs live in `docs/`.
- Built output lives in `dist/`.
- Installers served from `https://openclaw.ai/*` live in the sibling repo `../openclaw.ai`.

## Fork Maintenance Rules

- Keep fork-specific behavior and docs coherent. If user-facing behavior changes, explicitly evaluate whether `README.md` + `README.zh-CN.md` and `CHANGELOG.md` + `CHANGELOG.zh-CN.md` should be updated in the same change.
- When a README-listed feature or bug fix has been submitted upstream as a GitHub pull request, mark that README entry in both `README.md` and `README.zh-CN.md` with the upstream PR link.
- Root Chinese docs use `*.zh-CN.md` naming, not `*.cn.md`.
- `docs/zh-CN/**` is generated; do not edit it unless explicitly asked.
- When editing English docs that feed translation, update the source docs first and only touch generated zh-CN output if the task explicitly requires it.
- Never commit real phone numbers, secrets, videos, or live config values. Use obvious placeholders in docs and tests.

## Docs Rules

- Docs are hosted on Mintlify.
- Internal links in `docs/**/*.md` should be root-relative and omit `.md` / `.mdx` (example: `[Config](/configuration)`).
- Section links should use anchors on root-relative paths (example: `[Hooks](/configuration#hooks)`).
- Avoid em dashes and apostrophes in doc headings because Mintlify anchors can break.
- README links intended for GitHub should use absolute docs URLs.
- Docs content should stay generic and avoid personal hostnames, local paths, or device names.
- For docs, UI copy, and picker lists, order services/providers alphabetically unless the section is explicitly about runtime order.

## Build And Test

- Runtime baseline: Node 22+.
- Install dependencies with `pnpm install`.
- Also supported: `bun install`.
- Prefer Bun for TypeScript execution: `bun <file.ts>` or `bunx <tool>`.
- Run the CLI in dev with `pnpm openclaw ...` or `pnpm dev`.
- Main checks:
  - `pnpm build`
  - `pnpm tsgo`
  - `pnpm check`
  - `pnpm format`
  - `pnpm format:fix`
  - `pnpm test`
  - `pnpm test:coverage`
- If a required tool or dependency is missing, run the repo install command first, then rerun the exact requested command once.
- For targeted test runs, use the wrapper form: `pnpm test -- <path-or-filter> [vitest args...]`.
- Do not set Vitest workers above 16.

## Code Guardrails

- Language: TypeScript (ESM). Prefer strict typing and avoid `any`.
- Never add `@ts-nocheck`.
- Fix lint/type issues at the root cause instead of disabling rules by default.
- Formatting and linting are enforced via Oxlint and Oxfmt.
- Add brief comments only when logic is genuinely non-obvious.
- Keep files reasonably small; extract helpers instead of creating “V2” copies.
- Use American English in code, comments, docs, and UI strings.
- Use **OpenClaw** for product/app/docs headings and `openclaw` for CLI/package/path/config naming.

## Dependency And Module Rules

- Do not edit `node_modules`.
- Never update the Carbon dependency.
- Any dependency listed under `pnpm.patchedDependencies` must use an exact version, not `^` or `~`.
- Do not patch dependencies, add pnpm overrides, or vendor third-party changes without explicit approval.
- Keep plugin-only runtime dependencies inside the extension `package.json`, not the root package unless core also uses them.
- Avoid `workspace:*` in plugin `dependencies`; use `devDependencies` or `peerDependencies` for `openclaw` instead.
- Do not mix `await import("x")` and static `import ... from "x"` for the same module in production code paths.
- If lazy loading is needed, use a dedicated runtime boundary such as `*.runtime.ts`.
- After changing lazy-loading/module boundaries, run `pnpm build` and check for ineffective dynamic import warnings.
- Do not share class behavior via prototype mutation; prefer explicit inheritance or composition.

## Messaging And Channel Safety

- When changing shared messaging logic, consider all built-in and extension channels, not only the channel currently being debugged.
- Relevant core areas include `src/channels`, `src/routing`, `src/telegram`, `src/discord`, `src/slack`, `src/signal`, `src/imessage`, and `src/web`.
- Relevant extensions live under `extensions/*`.
- Never send streaming or partial replies to external messaging surfaces; only final replies should be delivered there.

## Testing Expectations

- Add or update tests when changing logic whenever feasible.
- For bug fixes, prefer evidence-backed fixes: confirm the symptom, identify the code path, and verify the changed path is actually covered.
- Pure test-only changes usually do not need changelog entries unless user-facing behavior changes.
- In tests, prefer per-instance stubs over prototype mutation unless the test clearly requires prototype-level patching.

## Git And Collaboration

- Create commits with `scripts/committer "<msg>" <file...>` so staging stays scoped.
- Keep commits focused and action-oriented.
- Do not create/apply/drop `git stash` entries unless explicitly requested.
- Do not switch branches, edit `.worktrees/*`, or create/remove worktrees unless explicitly requested.
- When preparing an upstream PR for `openclaw/openclaw`, do that work in the dedicated upstream PR clone instead of this fork working repo, so branch prep, cherry-picks, and PR-only commits do not interfere with local fork development.
- The dedicated upstream PR clone lives at `~/openclaw-upstream-pr`.
- When syncing upstream official changes for this fork, use `merge` by default; do not use `rebase` unless the user explicitly asks for it.
- When the user says `commit`, commit only your changes.
- When the user says `commit all`, group and commit everything intentionally.
- When the user says `push`, you may `git pull` first to integrate latest changes with a merge, but never discard other work.
- If unrelated files are dirty, leave them alone and commit only the files relevant to your task.
- Running multiple agents is fine as long as each agent uses its own session.

## Practical Notes

- If asked to open a session file, use the Pi session logs under `~/.openclaw/agents/<agentId>/sessions/*.jsonl`, not the default `sessions.json`.
- Use the shared CLI palette in `src/terminal/palette.ts` instead of hardcoded colors for terminal UI.
- Keep status output table-safe and ANSI-safe by following existing patterns in `src/terminal/table.ts`.
- If a new `AGENTS.md` is added elsewhere in the repo, also add a matching `CLAUDE.md` symlink.
- GitHub identity for this fork is the `Openbling` account.
- When GitHub API auth is needed on this Mac, look up the token from Keychain service `codex-github-openbling-token` with account `zhanglingfei`.
- Never print or paste the token into chat, logs, commits, or repo files; use it only for authenticated local commands or API calls.
