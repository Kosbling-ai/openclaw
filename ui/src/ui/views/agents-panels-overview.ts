import { html, nothing } from "lit";
import type { AgentIdentityResult, AgentsFilesListResult, AgentsListResult } from "../types.ts";
import {
  buildModelOptions,
  normalizeModelValue,
  parseFallbackList,
  resolveAgentConfig,
  resolveIsolationAgentOverrideModel,
  resolveIsolationGroupOptions,
  resolveModelFallbacks,
  resolveModelLabel,
  resolveModelPrimary,
} from "./agents-utils.ts";
import type { AgentsPanel } from "./agents.ts";

export function renderAgentOverview(params: {
  agent: AgentsListResult["agents"][number];
  basePath: string;
  defaultId: string | null;
  configForm: Record<string, unknown> | null;
  agentFilesList: AgentsFilesListResult | null;
  agentIdentity: AgentIdentityResult | null;
  agentIdentityLoading: boolean;
  agentIdentityError: string | null;
  configLoading: boolean;
  configSaving: boolean;
  configDirty: boolean;
  onConfigReload: () => void;
  onConfigSave: () => void;
  onModelChange: (agentId: string, modelId: string | null) => void;
  onModelFallbacksChange: (agentId: string, fallbacks: string[]) => void;
  onSelectPanel: (panel: AgentsPanel) => void;
}) {
  const {
    agent,
    configForm,
    agentFilesList,
    configLoading,
    configSaving,
    configDirty,
    onConfigReload,
    onConfigSave,
    onModelChange,
    onModelFallbacksChange,
    onSelectPanel,
  } = params;
  const config = resolveAgentConfig(configForm, agent.id);
  const workspaceFromFiles =
    agentFilesList && agentFilesList.agentId === agent.id ? agentFilesList.workspace : null;
  const workspace =
    workspaceFromFiles || config.entry?.workspace || config.defaults?.workspace || "default";
  const defaultModel = resolveModelLabel(config.defaults?.model);
  const entryPrimary = resolveModelPrimary(config.entry?.model);
  const defaultPrimary =
    resolveModelPrimary(config.defaults?.model) ||
    (defaultModel !== "-" ? normalizeModelValue(defaultModel) : null);
  const effectivePrimary = entryPrimary ?? defaultPrimary ?? null;
  const isolation = resolveIsolationGroupOptions(
    configForm,
    "main",
    resolveIsolationAgentOverrideModel(configForm, agent.id),
  );
  const model = isolation.enabled
    ? resolveModelLabel({
        primary:
          resolveIsolationAgentOverrideModel(configForm, agent.id) ??
          isolation.primary ??
          undefined,
        fallbacks: isolation.fallbacks,
      })
    : config.entry?.model
      ? resolveModelLabel(config.entry?.model)
      : resolveModelLabel(config.defaults?.model);
  const modelFallbacks = isolation.enabled
    ? isolation.fallbacks
    : resolveModelFallbacks(config.entry?.model);
  const fallbackChips = modelFallbacks ?? [];
  const skillFilter = Array.isArray(config.entry?.skills) ? config.entry?.skills : null;
  const skillCount = skillFilter?.length ?? null;
  const isDefault = Boolean(params.defaultId && agent.id === params.defaultId);
  const disabled = !configForm || configLoading || configSaving;
  const selectedPrimary = isolation.enabled
    ? (resolveIsolationAgentOverrideModel(configForm, agent.id) ?? isolation.primary ?? "")
    : isDefault
      ? (effectivePrimary ?? "")
      : (entryPrimary ?? "");
  const standardModelOptions = buildModelOptions(configForm, effectivePrimary ?? undefined);

  const removeChip = (index: number) => {
    if (isolation.enabled) {
      return;
    }
    const next = fallbackChips.filter((_, i) => i !== index);
    onModelFallbacksChange(agent.id, next);
  };

  const handleChipKeydown = (e: KeyboardEvent) => {
    const input = e.target as HTMLInputElement;
    if (isolation.enabled) {
      return;
    }
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const parsed = parseFallbackList(input.value);
      if (parsed.length > 0) {
        onModelFallbacksChange(agent.id, [...fallbackChips, ...parsed]);
        input.value = "";
      }
    }
  };

  return html`
    <section class="card">
      <div class="card-title">Overview</div>
      <div class="card-sub">Workspace paths and identity metadata.</div>

      <div class="agents-overview-grid" style="margin-top: 16px;">
        <div class="agent-kv">
          <div class="label">Workspace</div>
          <div>
            <button
              type="button"
              class="workspace-link mono"
              @click=${() => onSelectPanel("files")}
              title="Open Files tab"
            >${workspace}</button>
          </div>
        </div>
        <div class="agent-kv">
          <div class="label">Primary Model</div>
          <div class="mono">${model}</div>
        </div>
        <div class="agent-kv">
          <div class="label">Skills Filter</div>
          <div>${skillFilter ? `${skillCount} selected` : "all skills"}</div>
        </div>
      </div>

      ${
        configDirty
          ? html`
              <div class="callout warn" style="margin-top: 16px">You have unsaved config changes.</div>
            `
          : nothing
      }

      <div class="agent-model-select" style="margin-top: 20px;">
        <div class="label">Model Selection</div>
        <div class="agent-model-fields">
          <label class="field">
            <span>Primary model${isDefault ? " (default)" : ""}</span>
            <select
              .value=${selectedPrimary}
              ?disabled=${disabled}
              @change=${(e: Event) =>
                onModelChange(agent.id, (e.target as HTMLSelectElement).value || null)}
            >
              ${
                isolation.enabled
                  ? [
                      html`<option value="">
                      ${isolation.primary ? `Use group default (${isolation.primary})` : "Use group default"}
                    </option>`,
                      ...isolation.options.map(
                        (option) => html`<option value=${option.value}>${option.label}</option>`,
                      ),
                    ]
                  : [
                      isDefault
                        ? nothing
                        : html`<option value="">
                          ${defaultPrimary ? `Inherit default (${defaultPrimary})` : "Inherit default"}
                        </option>`,
                    ]
              }
              ${!isolation.enabled ? standardModelOptions : nothing}
            </select>
          </label>
          <div class="field">
            <span>Fallbacks${isolation.enabled ? ` (${isolation.group} group)` : ""}</span>
            <div class="agent-chip-input" @click=${(e: Event) => {
              const container = e.currentTarget as HTMLElement;
              const input = container.querySelector("input");
              if (input) {
                input.focus();
              }
            }}>
              ${fallbackChips.map(
                (chip, i) => html`
                  <span class="chip">
                    ${chip}
                    <button
                      type="button"
                      class="chip-remove"
                      ?disabled=${disabled || isolation.enabled}
                      @click=${() => removeChip(i)}
                    >&times;</button>
                  </span>
                `,
              )}
              <input
                ?disabled=${disabled || isolation.enabled}
                placeholder=${
                  isolation.enabled
                    ? "Managed by isolation group"
                    : fallbackChips.length === 0
                      ? "provider/model"
                      : ""
                }
                @keydown=${handleChipKeydown}
                @blur=${(e: Event) => {
                  if (isolation.enabled) {
                    return;
                  }
                  const input = e.target as HTMLInputElement;
                  const parsed = parseFallbackList(input.value);
                  if (parsed.length > 0) {
                    onModelFallbacksChange(agent.id, [...fallbackChips, ...parsed]);
                    input.value = "";
                  }
                }}
              />
            </div>
            ${
              isolation.enabled
                ? html`<div class="muted" style="margin-top: 6px;">
                    Model options and fallback order follow the isolation ${isolation.group} group.
                  </div>`
                : nothing
            }
          </div>
        </div>
        <div class="agent-model-actions">
          <button type="button" class="btn btn--sm" ?disabled=${configLoading} @click=${onConfigReload}>
            Reload Config
          </button>
          <button
            type="button"
            class="btn btn--sm primary"
            ?disabled=${configSaving || !configDirty}
            @click=${onConfigSave}
          >
            ${configSaving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </section>
  `;
}
