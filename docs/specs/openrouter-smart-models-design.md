# OpenRouter-First Smart Model System — Design Spec

**Date:** 2026-03-18
**Status:** Approved

## Overview

OpenRouter becomes the default provider. On setup, the app fetches available models from OpenRouter's API, categorizes them as free/paid, and lets users choose their tier. Free users get an "Auto" mode that rotates through free models with user-prompted fallback on rate limits.

## Goals

- Make first-time setup as frictionless as possible (OpenRouter pre-selected, free models available)
- Give users control over model selection (free vs paid, specific model or auto-rotate)
- Handle rate limits gracefully with user-prompted fallback (not silent)
- Keep the system working with all existing providers (Gemini, OpenAI, Claude, Ollama)

## Non-Goals

- Free trial with owner's API key (deferred — may add later)
- Server-side API proxy (not needed for BYOK)
- Silent auto-rotation (user explicitly chose to be asked first)

---

## Architecture

### Component Changes

#### 1. OpenRouterProvider Enhancement (`services/providers/openrouter.ts`)

**New static method:**
```typescript
static async fetchAvailableModels(apiKey: string): Promise<{
  free: OpenRouterModel[];
  paid: OpenRouterModel[];
}>
```

- Calls `GET https://openrouter.ai/api/v1/models` with Bearer token
- Categorizes models: free = pricing.prompt === "0" AND pricing.completion === "0"
- Returns sorted lists (by name)

**New type:**
```typescript
interface OpenRouterModel {
  id: string;          // e.g. "meta-llama/llama-3.1-8b-instruct:free"
  name: string;        // e.g. "Llama 3.1 8B Instruct (free)"
  contextLength: number;
  pricing: { prompt: string; completion: string };
}
```

**Rate limit detection:**
- On HTTP 429 response, throw `RateLimitError` (new typed error) instead of generic error
- `RateLimitError` includes the model ID that was rate-limited

**Model override:**
- All provider methods already accept optional `model` parameter via the AIProvider interface
- Ensure OpenRouterProvider passes this through to the API call

#### 2. Model Rotation Service (new: `services/modelRotation.ts`)

Simple stateless utility:
```typescript
export function getNextModel(
  availableModels: OpenRouterModel[],
  excludeIds: string[]
): OpenRouterModel | null
```

- Returns the first model from `availableModels` that isn't in `excludeIds`
- Returns `null` if all models exhausted

No state, no class — just a pure function.

#### 3. RateLimitError (new: `services/errors.ts`)

```typescript
export class RateLimitError extends Error {
  constructor(public readonly modelId: string) {
    super(`Rate limited on model: ${modelId}`);
    this.name = 'RateLimitError';
  }
}
```

#### 4. ConfigContext Expansion (`contexts/ConfigContext.tsx`)

Add to `AppConfig` interface:
```typescript
modelTier: 'free' | 'paid' | '';       // '' = not yet chosen (non-OpenRouter providers)
selectedModel: string;                   // specific model ID or 'auto'
availableModels: string;                 // JSON-stringified cached model list
```

These fields are only meaningful for OpenRouter. Other providers ignore them.

#### 5. ConfigWizard Changes (`components/ConfigWizard.tsx`)

**Step 2 (Provider Selection):**
- Reorder providers: OpenRouter first
- OpenRouter pre-selected by default
- Add "Recommended" badge to OpenRouter card

**New Step (after API key): Model Selection**
- Two toggle buttons: "Free Models" | "Paid Models"
- If "Free Models" selected:
  - Dropdown with all free models from fetchAvailableModels()
  - First option: "Auto (rotate through all)" — selected by default
  - Individual free models listed below
- If "Paid Models" selected:
  - Dropdown with all available models (free + paid combined)
  - No "Auto" option — user must pick a specific model
- Show a loading spinner while fetching models from OpenRouter API
- If fetch fails, show error with retry button

#### 6. Rate Limit UX (`routes/wiki.tsx`)

When a `RateLimitError` is caught during streaming:

1. Pause the request
2. Show an inline dialog/banner:
   - Message: "**[Model Name]** is currently rate-limited."
   - If auto mode (free tier): "Try **[Next Model Name]** instead?"
     - Buttons: **"Switch"** | **"Wait and Retry"**
   - If specific model: "This model is busy."
     - Button: **"Retry"**
3. If user clicks "Switch":
   - Add current model to exclude list
   - Call `getNextModel(freeModels, excludeList)` for next candidate
   - Retry the request with the new model
4. If all free models exhausted:
   - Message: "All free models are currently busy. Try again in a minute or switch to a paid model."
   - Button: **"Retry"** | **"Go to Settings"**

#### 7. AI Bridge Update (`services/ai.ts`)

Currently hardcoded to GeminiProvider. Update to:
- Accept provider instance as parameter (or read from a module-level config)
- Since ai.ts can't use React context directly, introduce a `setActiveProvider(provider)` function
- Root layout calls `setActiveProvider()` on mount/config change with the correct provider instance
- All bridge functions use the active provider

---

## Data Flow

### Setup Flow
```
ConfigWizard Step 2: OpenRouter pre-selected
  → Step 3: User enters OpenRouter API key → validateKey()
  → Step 4 (NEW): Fetch models → fetchAvailableModels(key)
    → Show "Free Models" / "Paid Models" toggle
    → Free: dropdown with "Auto" default
    → Paid: dropdown with all models
  → Save to ConfigContext: { providerId, modelTier, selectedModel, availableModels }
```

### Request Flow (Free + Auto)
```
User searches topic
  → wiki.tsx picks first free model from cached list
  → streams definition via OpenRouterProvider
  → if 429 RateLimitError:
    → show "Model X busy. Switch to Model Y?" dialog
    → user clicks Switch → retry with Model Y
    → user clicks Wait → retry same model after delay
  → if all models exhausted → "All busy" message
  → on success → render content
```

### Request Flow (Free + Specific / Paid)
```
User searches topic
  → wiki.tsx uses selectedModel from config
  → streams via OpenRouterProvider with that model
  → if 429 → "Model busy. Retry?" (no rotation)
  → on success → render content
```

---

## Files to Create/Modify

| File | Action | What |
|------|--------|------|
| `services/providers/openrouter.ts` | Modify | Add fetchAvailableModels(), RateLimitError detection, model override |
| `services/modelRotation.ts` | Create | getNextModel() pure function |
| `services/errors.ts` | Create | RateLimitError class |
| `contexts/ConfigContext.tsx` | Modify | Add modelTier, selectedModel, availableModels fields |
| `components/ConfigWizard.tsx` | Modify | Reorder providers, add model selection step |
| `routes/wiki.tsx` | Modify | Rate limit dialog, model rotation UX |
| `services/ai.ts` | Modify | Dynamic provider instantiation via setActiveProvider() |

## Testing

- `openrouter.test.ts` — test fetchAvailableModels parsing, rate limit error detection
- `modelRotation.test.ts` — test getNextModel with various exclude lists
- `ConfigWizard.test.tsx` — test model selection step UI
- Existing tests must continue passing

## Edge Cases

- OpenRouter API down during model fetch → show error, retry button
- User's key has no access to any model → show clear error message
- All free models rate-limited → show "all busy" with retry + settings link
- User switches from OpenRouter to another provider → modelTier/selectedModel fields ignored
- Model list changes between sessions → re-fetch on settings page visit
