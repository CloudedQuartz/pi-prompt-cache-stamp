# pi-prompt-cache-stamp

Stamps prompt-cache TTLs on every model of the OpenCode/OpenAI subscription
providers, replacing per-model `models.json` entries.

- Entry: `extensions/prompt-cache-stamp.ts`.
- Hooks: `session_start` (walk `ctx.modelRegistry.getAll()`) and `model_select`
  (re-stamp the exact instance).
- No commands, tools, or providers.

## Install

Symlink or copy `extensions/prompt-cache-stamp.ts` into `~/.pi/agent/extensions/`.
No load-order requirement: `session_start` applies the stamp, and `model_select`
re-applies it.

## Constraints

- Hardcoded provider policy: `opencode-go` 300/300 s, `opencode` 1800/1800 s,
  `openai-codex` 1800/1800 s, with `gpt-5.5`/`gpt-5.2` given the 24 h retention
  tier. These are opinionated defaults from a decision dated 2026-10-16, not
  user configuration or secrets.
- `deep-cold-sentinel` reads `ctx.model.promptCache.short`; without this stamp
  that extension is inert for those providers.
- Skips frozen model objects; no paths or credentials.
