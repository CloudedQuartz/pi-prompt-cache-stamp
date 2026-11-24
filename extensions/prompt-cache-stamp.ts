import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

/**
 * Blanket prompt-cache TTL stamp for the OpenCode/OpenAI subscription providers,
 * replacing the per-model promptCache entries formerly kept in models.json (that
 * config keys on exact model ids only, so every future model would need a manual
 * line).
 *
 * Values (decision of 2026-10-16):
 *   opencode-go   300/300   — keeps the cache warm across streaming/subagent
 *                             waits only. Go serves models via rotating
 *                             undisclosed upstreams, so no longer TTL is a
 *                             contract; 300 s is the keep-warm cadence, not
 *                             measured backend truth.
 *   opencode       1800/1800 — Zen free tier (misses cost $0; metadata only).
 *   openai-codex   1800/1800 — official 30 min sliding TTL; gpt-5.5/gpt-5.2
 *                             also support the 24 h retention tier.
 *
 * session_start stamps the whole registry, so current AND future models are
 * covered without config maintenance; model_select re-stamps the exact instance
 * that becomes the run's model, which is what cache warming reads.
 */

type PromptCacheTtl = { short: number; long: number };

const PROVIDER_TTL: Record<string, PromptCacheTtl> = {
  "opencode-go": { short: 300, long: 300 },
  opencode: { short: 1800, long: 1800 },
  "openai-codex": { short: 1800, long: 1800 },
};

/** Pre-5.6 models accept prompt_cache_retention "24h" (legacy tier). */
const LONG_RETENTION_MODELS = new Set(["gpt-5.5", "gpt-5.2"]);

function stamp(model: { provider?: string; id?: string; promptCache?: unknown }): void {
  const ttl = model.provider ? PROVIDER_TTL[model.provider] : undefined;
  if (!ttl || Object.isFrozen(model)) return;
  const long =
    model.provider === "openai-codex" && model.id && LONG_RETENTION_MODELS.has(model.id)
      ? 86400
      : ttl.long;
  model.promptCache = { short: ttl.short, long };
}

export default function (pi: ExtensionAPI) {
  pi.on("session_start", (_event, ctx) => {
    try {
      for (const model of ctx.modelRegistry.getAll()) {
        stamp(model);
      }
    } catch (error) {
      if (ctx.hasUI) {
        ctx.ui.notify(`prompt-cache stamp failed: ${String(error)}`, "warning");
      }
    }
  });

  pi.on("model_select", (event) => {
    stamp(event.model);
  });
}
