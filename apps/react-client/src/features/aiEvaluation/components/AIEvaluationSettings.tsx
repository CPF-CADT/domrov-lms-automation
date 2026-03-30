import React, { useState, useEffect } from "react";
import { Loader2, Trash2, CheckCircle2, XCircle } from "lucide-react";
import { EyeIcon, EyeOffIcon } from "../icons";
import evaluationService from "@/services/evaluationService";
import type { AIProviderDto, UserAIKeyResponseDto } from "@/types/ai";

// ─── Static model presets ─────────────────────────────────────────────────────
const PRESET_MODELS: Record<string, { value: string; label: string }[]> = {
  openai: [
    { value: "gpt-4o", label: "GPT-4o (Recommended)" },
    { value: "gpt-4-turbo", label: "GPT-4 Turbo" },
    { value: "gpt-4", label: "GPT-4" },
    { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo" },
  ],
  gemini: [
    { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash (Recommended)" },
    { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
    { value: "gemini-1.5-pro", label: "Gemini 1.5 Pro" },
    { value: "gemini-1.5-flash", label: "Gemini 1.5 Flash" },
    { value: "gemini-pro", label: "Gemini Pro" },
  ],
};

// Only openai is truly managed — no endpoint field needed
const MANAGED_PROVIDERS = ["openai"];

// Providers that use free-text model input instead of a dropdown
const FREE_TEXT_MODEL_PROVIDERS = ["ollama", "openrouter", "grok", "custom"];

// Placeholder text for model input on free-text providers
const MODEL_PLACEHOLDERS: Record<string, string> = {
  ollama: "e.g. llama3, mistral, codellama",
  openrouter: "e.g. openai/gpt-4o, anthropic/claude-3",
  grok: "e.g. grok-beta",
  custom: "e.g. gpt-3.5-turbo, llama3, mistral",
};

const MODEL_HELP: Record<string, string> = {
  ollama: "Model name from your Ollama installation. Run 'ollama list' to see available models.",
  openrouter: "Format: provider/model — e.g. openai/gpt-4o or anthropic/claude-3-sonnet",
  grok: "Grok model name — e.g. grok-beta or grok-vision-beta",
  custom: "The model name your API endpoint supports. Check your provider's documentation.",
};

// Default endpoints — auto-filled when provider is selected
const DEFAULT_ENDPOINTS: Record<string, string> = {
  gemini: "https://generativelanguage.googleapis.com",
  ollama: "http://localhost:11434",
  openrouter: "https://openrouter.ai/api/v1",
  grok: "https://api.x.ai/v1",
  custom: "",
};

// Helper hint text shown below the endpoint input


// ─── Types ────────────────────────────────────────────────────────────────────

interface AIEvaluationSettingsProps {
  onSave?: (key: UserAIKeyResponseDto) => void;
  onCancel?: () => void;
  editingKey?: UserAIKeyResponseDto | null;
}

interface FormState {
  provider: string;
  model: string;
  apiKey: string;
  label: string;
  apiEndpoint: string;
}

const DEFAULT_FORM: FormState = {
  provider: "openai",
  model: "gpt-4o",
  apiKey: "",
  label: "",
  apiEndpoint: "",
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function AIEvaluationSettings({
  onSave,
  onCancel,
  editingKey = null,
}: AIEvaluationSettingsProps) {
  const [providers, setProviders] = useState<AIProviderDto[]>([]);
  const [savedKeys, setSavedKeys] = useState<UserAIKeyResponseDto[]>([]);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [showApiKey, setShowApiKey] = useState(false);
  const [loadingProviders, setLoadingProviders] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // ── Fetch providers + saved keys on mount ────────────────────────────────

  useEffect(() => {
    async function init() {
      setLoadingProviders(true);
      try {
        const [provRes, keysRes] = await Promise.all([
          evaluationService.fetchAIProviders(),
          evaluationService.fetchAIKeys(),
        ]);
        setProviders(provRes ?? []);
        setSavedKeys(keysRes ?? []);
      } catch (err) {
        console.error("Failed to load AI data:", err);
      } finally {
        setLoadingProviders(false);
      }
    }
    init();
  }, []);

  // ── Pre-fill form when editing an existing key ───────────────────────────

  useEffect(() => {
    if (editingKey) {
      const prov = editingKey.provider.toLowerCase();
      setForm({
        provider: prov,
        model: editingKey.model,
        apiKey: "",  // never pre-fill for security
        label: editingKey.label ?? "",
        // Use saved endpoint from response, fall back to known default
        apiEndpoint: editingKey.apiEndpoint ?? DEFAULT_ENDPOINTS[prov] ?? "",
      });
    } else {
      setForm(DEFAULT_FORM);
    }
  }, [editingKey]);

  // ── Derived ──────────────────────────────────────────────────────────────

  const isFreeTextModel = FREE_TEXT_MODEL_PROVIDERS.includes(form.provider);

  const showEndpointField = !MANAGED_PROVIDERS.includes(form.provider); // show for all except openai
  const presetModels = PRESET_MODELS[form.provider] ?? [];

  // ── Provider change — auto-fill endpoint and reset model ────────────────

  const handleProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const p = e.target.value;
    setForm({
      provider: p,
      model: PRESET_MODELS[p]?.[0]?.value ?? "",
      apiKey: "",
      label: "",
      apiEndpoint: DEFAULT_ENDPOINTS[p] ?? "",  // ✅ auto-fill endpoint
    });
    setError(null);
    setSuccess(null);
  };

  // ── Save ─────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!form.apiKey.trim() && !editingKey) { setError("API key is required."); return; }
    if (!form.model.trim()) { setError("Model is required."); return; }
    if (form.provider === "custom" && !form.apiEndpoint.trim()) {
      setError("API endpoint URL is required for custom provider.");
      return;
    }
    setError(null);
    setSuccess(null);
    setSaving(true);

    try {
      let result: UserAIKeyResponseDto;

      if (editingKey) {
        // PATCH /user-ai/:id
        const patch: Record<string, string | boolean> = {
          provider: form.provider,
          model: form.model,
          label: form.label,
        };
        if (form.apiKey.trim()) patch.apiKey = form.apiKey;
        if (form.apiEndpoint.trim()) patch.apiEndpoint = form.apiEndpoint.trim();
        const res = await evaluationService.updateAIKey(editingKey.id, patch);
        result = res ?? [];
        setSavedKeys((prev) => prev.map((k) => (k.id === result.id ? result : k)));
        setSuccess("Configuration updated successfully.");
      } else {
        // POST /user-ai
        // Always resolve endpoint — use typed value or fall back to known default
        const resolvedEndpoint =
          form.apiEndpoint.trim() || DEFAULT_ENDPOINTS[form.provider] || "";

        const payload: any = {
          provider: form.provider.toLowerCase(),
          model: form.model,
          apiKey: form.apiKey,
          label: form.label.trim() || `${form.provider} / ${form.model}`,
        };
        // Send apiEndpoint for all non-managed providers
        if (!MANAGED_PROVIDERS.includes(form.provider) && resolvedEndpoint) {
          payload.apiEndpoint = resolvedEndpoint;
        }
        console.log("📤 POST /user-ai payload:", JSON.stringify(payload, null, 2));
        const res = await evaluationService.createAIKey(payload);
        result = res ?? [];
        setSavedKeys((prev) => [result, ...prev]);
        setSuccess("Configuration saved successfully.");
        setForm(DEFAULT_FORM);
      }

      if (onSave) onSave(result);
    } catch (err: any) {
      const data = err?.response?.data;
      const status = err?.response?.status;
      let msg = "Failed to save. Please try again.";
      if (data?.message) {
        const raw = data.message;
        if (Array.isArray(raw)) {
          msg = raw.join(" · ");
        } else if (typeof raw === "string") {
          if (raw.includes("exceeded your current quota"))
            msg = "Your API key has exceeded its quota. Please check your billing at platform.openai.com/billing.";
          else if (raw.includes("Incorrect API key"))
            msg = "Invalid API key. Please double-check the key you entered.";
          else if (raw.includes("API endpoint missing"))
            msg = "API endpoint is required for this provider. Please enter the endpoint URL.";
          else if (raw.includes("connection test failed")) {
            const after = raw.split("connection test failed:").pop()?.trim() ?? raw;
            msg = "Connection test failed: " + after;
          } else {
            msg = raw;
          }
        }
      } else if (status === 400) msg = "Invalid request. Please check all fields and try again.";
      else if (status === 401) msg = "Session expired. Please log in again.";
      else if (status === 429) msg = "API quota exceeded. Please check your billing details.";
      else if (err?.message) msg = err.message;
      console.error("Save AI config error:", data);
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this AI configuration?")) return;
    try {
      await evaluationService.deleteAIKey(id);
      setSavedKeys((prev) => prev.filter((k) => k.id !== id));
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  // ── Styles ────────────────────────────────────────────────────────────────

  const inputCls =
    "w-full px-4 py-3 border border-slate-300 rounded-lg bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm";
  const selectCls =
    "w-full px-4 py-3 pr-10 border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm appearance-none cursor-pointer";
  const labelCls = "block text-sm font-semibold text-slate-700 mb-2";
  const chevron = (
    <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </div>
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* ── FORM CARD ─────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 p-8">

        {/* Header */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-1">
            {editingKey ? "Edit AI Configuration" : "AI Evaluation Configuration"}
          </h2>
          <p className="text-slate-500 text-sm">
            Configure the AI model used for grading and student feedback. Your API key is stored securely.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 px-4 py-3 bg-red-50 border border-red-200 rounded-lg flex items-start justify-between gap-4">
            <p className="text-sm text-red-600 leading-relaxed">{error}</p>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 text-xl leading-none shrink-0 mt-0.5">×</button>
          </div>
        )}

        {/* Success */}
        {success && (
          <div className="mb-6 px-4 py-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
            <p className="text-sm text-green-700">{success}</p>
          </div>
        )}

        <div className="space-y-8">

          {/* ── Row 1: Provider + Model ── */}
          <div className="grid grid-cols-2 gap-8">
            <div>
              <label className={labelCls}>API Provider</label>
              <div className="relative">
                {loadingProviders ? (
                  <div className="flex items-center gap-2 px-4 py-3 border border-slate-200 rounded-lg text-sm text-slate-400">
                    <Loader2 className="w-4 h-4 animate-spin" /> Loading providers...
                  </div>
                ) : (
                  <>
                    <select value={form.provider} onChange={handleProviderChange} className={selectCls}>
                      {providers.map((p) => (
                        <option key={p.provider} value={p.provider}>
                          {p.provider.charAt(0).toUpperCase() + p.provider.slice(1)} — {p.description}
                        </option>
                      ))}
                    </select>
                    {chevron}
                  </>
                )}
              </div>
            </div>

            <div>
              <label className={labelCls}>Model</label>
              {isFreeTextModel ? (
                <div>
                  <input
                    type="text"
                    value={form.model}
                    onChange={(e) => setForm((p) => ({ ...p, model: e.target.value }))}
                    placeholder={MODEL_PLACEHOLDERS[form.provider] ?? "Enter model name"}
                    className={inputCls}
                  />
                  {MODEL_HELP[form.provider] && (
                    <p className="text-xs text-slate-400 mt-2">{MODEL_HELP[form.provider]}</p>
                  )}
                </div>
              ) : (
                <div className="relative">
                  <select
                    value={form.model}
                    onChange={(e) => setForm((p) => ({ ...p, model: e.target.value }))}
                    className={selectCls}
                  >
                    {presetModels.map((m) => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                  {chevron}
                </div>
              )}
            </div>
          </div>

          {/* ── Row 2: API Key + Label ── */}
          <div className="grid grid-cols-2 gap-8">
            <div>
              <label className={labelCls}>
                API Key{" "}
                {editingKey && (
                  <span className="text-slate-400 font-normal text-xs ml-1">(leave blank to keep existing)</span>
                )}
              </label>
              <div className="relative">
                <input
                  type={showApiKey ? "text" : "password"}
                  value={form.apiKey}
                  onChange={(e) => setForm((p) => ({ ...p, apiKey: e.target.value }))}
                  placeholder={editingKey ? "Enter new key to replace existing" : "Enter your API key"}
                  className={inputCls + " pr-20"}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  {form.apiKey && (
                    <button type="button" onClick={() => setForm((p) => ({ ...p, apiKey: "" }))} className="text-slate-400 hover:text-slate-600">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z" />
                      </svg>
                    </button>
                  )}
                  <button type="button" onClick={() => setShowApiKey(!showApiKey)} className="text-slate-400 hover:text-slate-600">
                    {showApiKey ? <EyeOffIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-2">Stored securely — never exposed in API responses.</p>
            </div>

            <div>
              <label className={labelCls}>
                Configuration Label{" "}
                <span className="text-slate-400 font-normal text-xs ml-1">(optional)</span>
              </label>
              <input
                type="text"
                value={form.label}
                onChange={(e) => setForm((p) => ({ ...p, label: e.target.value }))}
                placeholder="e.g. Production Grading, My Gemini Key"
                className={inputCls}
              />
              <p className="text-xs text-slate-400 mt-2">A friendly name to identify this configuration.</p>
            </div>
          </div>

          {/* ── API Endpoint — shown for all non-openai providers ── */}
          {showEndpointField && (
            <div>
              <label className={labelCls}>
                API Endpoint URL
                {form.provider === "custom" ? (
                  <span className="ml-2 text-xs font-normal text-red-500">* required</span>
                ) : (
                  <span className="ml-2 text-xs font-normal text-slate-400">(pre-filled — edit if needed)</span>
                )}
              </label>
              <input
                type="url"
                value={form.apiEndpoint}
                onChange={(e) => setForm((p) => ({ ...p, apiEndpoint: e.target.value }))}
                placeholder={DEFAULT_ENDPOINTS[form.provider] ?? ""}
                className={inputCls}
              />
              <p className="text-xs text-slate-400 mt-2">

              </p>
            </div>
          )}

        </div>

        {/* Buttons */}
        <div className="flex justify-end items-center gap-3 mt-10 pt-6 border-t border-slate-100">
          {onCancel && (
            <button
              onClick={onCancel}
              className="px-6 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saving || loadingProviders}
            className="flex items-center gap-2 px-8 py-2.5 text-sm font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? "Saving..." : editingKey ? "Update Configuration" : "Save Configuration"}
          </button>
        </div>
      </div>

      {/* ── SAVED KEYS ────────────────────────────────────────────────────── */}
      {savedKeys.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-8">
          <h3 className="text-lg font-semibold text-slate-900 mb-6">
            Saved Configurations
            <span className="ml-2 text-sm font-normal text-slate-400">({savedKeys.length})</span>
          </h3>
          <div className="grid grid-cols-2 gap-4">
            {savedKeys.map((key) => (
              <div
                key={key.id}
                className="flex items-center justify-between p-5 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {key.isValid
                    ? <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                    : <XCircle className="w-5 h-5 text-red-400   shrink-0" />
                  }
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">
                      {key.label || `${key.provider} / ${key.model}`}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5 truncate">
                      <span className="capitalize">{key.provider}</span> · {key.model}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${key.isActive ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-500"
                        }`}>
                        {key.isActive ? "Active" : "Inactive"}
                      </span>
                      <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${key.isValid ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"
                        }`}>
                        {key.isValid ? "Valid" : "Invalid key"}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(key.id)}
                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0 ml-3"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}