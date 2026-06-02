---
name: narev-update-llm-pricing
description: 'Update LLM prices in the repo: Use this skill to snapshot live LLM pricing into a checked-in file so billing or cost math can run offline with deterministic rates. Use for any language or stack (TypeScript, Python, Go, JSON registries, etc.) — not only typescript. Use when the user wants pinned prices, wants to remove a runtime dependency on the Narev API, wants to refresh a committed pricing file, or mentions "snapshot pricing", "freeze prices", "pin model rates", "regenerate pricing file", "update pricing in the repo", or "sync token pricing from Narev".'
license: MIT
metadata:
  author: narevai
  version: "1.1.0"
  docs: https://www.narev.ai/docs/platform/api-reference/endpoint/pricing/list-model-pricing
---

# Update LLM pricing in the local repo

This skill is **not** a second API spec — it describes **what you can implement** using the **listing** API that `lookup-llm-pricing` documents (`GET https://www.narev.ai/api/models/pricing`): paginate, map each row to **your** schema, and write a committed file. For path/query/body contracts, `402`/`404`, and **`POST` calculate**, use `lookup-llm-pricing`. You do **not** need the Narev SDK or Vercel AI SDK — any HTTP client and file I/O in the repo's language is enough.

## When to use this skill

- "Update LLM model price snapshot present in your project"
- "Refresh committed pricing registry with the latest rates (find where the project stores rates, or add a file or script if nothing exists yet)."

If the user only needs **how the API works** or **cost for one call** (`POST` calculate), point them at `lookup-llm-pricing`.

## Inputs you need

The Narev pricing API is public. No API key or bearer token is required.

- **Target file path** and **format** (TypeScript object, JSON, YAML, Python module, etc.). Confirm before overwriting.
- **Scope**: which `provider` values to refresh (API slugs), or the full catalog. Use the `provider` query parameter; omit it to fetch everything (paginate until `page > meta.total_pages`).
- **Local units**: the API returns **USD per token**. Some codebases store **USD per million tokens** — multiply by `1_000_000` only when writing that shape, and document it in the script.

## API response shape (what you read)

Paginate with `page`, `limit` (max `1000`), and optional `provider`, `model_id`, `search`, `subprovider`. Response: `{ data: ModelPricingEntry[], meta: { total_pages, ... } }`.

Each row has `model_id`, `provider`, `subprovider`, and `pricing`. When `pricing` is `null`, skip the row (enterprise-only or unavailable).

Useful `pricing` fields (snake_case, USD per unit unless noted):

| Field                                                | Meaning                         |
| ---------------------------------------------------- | ------------------------------- |
| `price_prompt`                                       | Input token                     |
| `price_completion`                                   | Output token                    |
| `price_input_cache_read` / `price_input_cache_write` | Cached input tokens             |
| `price_internal_reasoning`                           | Reasoning tokens                |
| `pricing_request`                                    | Flat per request                |
| `price_web_search`                                   | Per web-search invocation       |
| `pricing_discount`                                   | Fraction `0`–`1`, not a percent |

`price_image`, `price_audio`, `price_input_audio_cache`, etc. may appear — carry them through only if your local registry supports them.

## Mapping to **your** registry (default path)

1. Inspect the repo: find the existing pricing map or config and match **key style** (`model_id` only vs `provider/model_id`), **units** (per token vs per 1M tokens), and **which fields** the app reads.
2. Implement a script in the project's language (`scripts/update-pricing.ts`, `scripts/update_pricing.py`, etc.) that:
   - Loops pages until done.
   - Optionally filters by one or more `provider` query values per run (or omit for full catalog).
   - **Merges** or **replaces** according to product needs: common pattern is merge — keep unrelated providers in file, overwrite keys returned by this fetch.
   - Writes a generated-file banner when the format allows.
   - Exits non-zero on HTTP errors so CI can fail visibly.

3. Document the run command in a comment or README snippet (`pnpm tsx scripts/...`, `uv run python scripts/...`, etc.).

### Reference pattern: merge into an existing TS registry (strip + regenerate block)

Repos like Mission Control sometimes keep `MODEL_PRICING` in TypeScript with `inputPerMTok` / `outputPerMTok`. Adapt paths and regex to the real file:

- Fetch with `provider` repeated per catalog you care about, or no `provider` for full catalog.
- Convert API per-token rates to per-million: `inputPerMTok = price_prompt * 1_000_000`, same for completion.
- Key both `'model_id'` and `'provider/model_id'` if the app resolves either style.
- Parse the existing block, merge new rows into the dict, sort keys if you want stable diffs, replace the block with `String.replace`, write the file.

This is illustrative — match the project's exact types and formatting.

### Reference pattern: `@ai-billing/core` offline resolver (optional)

If the user **already** uses the Narev SDK, `createObjectPriceResolver` expects **`ModelPricing` in USD per token** (do not multiply to per-million for the SDK map). Map API → SDK like this:

| Narev API (`PricingData`)  | SDK (`ModelPricing`)      |
| -------------------------- | ------------------------- |
| `price_prompt`             | `promptTokens`            |
| `price_completion`         | `completionTokens`        |
| `price_input_cache_read`   | `inputCacheReadTokens`    |
| `price_input_cache_write`  | `inputCacheWriteTokens`   |
| `price_internal_reasoning` | `internalReasoningTokens` |
| `pricing_request`          | `request`                 |
| `price_web_search`         | `webSearch`               |
| `pricing_discount`         | `discount`                |

Output `Record<string, ModelPricing>` keyed by how the app resolves models (see multi-provider note below). Then:

```ts
import { createObjectPriceResolver } from "@ai-billing/core";
import { pricing } from "./pricing";

export const priceResolver = createObjectPriceResolver(pricing);
```

## Workflow (agent checklist)

### 1. Confirm scope and target file

Providers, model subset (if any), output path, and whether units are per token or per 1M in the file.

### 2. Add or update a snapshot script

Use the repo's language and dependencies (`fetch` / `httpx` / `requests` / `urllib`). Paginate `GET https://www.narev.ai/api/models/pricing`. Transform into the local schema. Prefer idempotent writes and small, reviewable diffs.

### 3. Run it

Use the project's package runner. Do not assume `pnpm` or `tsx` — check `package.json`, `pyproject.toml`, etc. Inspect the diff before committing.

### 4. Wire into the app (only if applicable)

For custom registries, point the app at the updated file or import. For `@ai-billing/core`, swap `createNarevPriceResolver` for `createObjectPriceResolver` as above.

### 5. Schedule refreshes (optional)

CI on a schedule that runs the script and opens a PR keeps rates fresh with human review.

## Constraints and edge cases

- **Multi-provider models share a `model_id`.** If you need per-provider rates, key with `provider/model_id` (and align lookup). Otherwise last write wins for bare `model_id`.
- **Skip `pricing: null`.**
- **`pricing_discount` is a fraction** (`0.1` = 10% off). Pass through if your registry supports it; many simple token maps ignore it.
- **API = USD per token.** Scale to per-1M (or per-1K) only in your script when the destination format requires it — do not double-scale.
- **Snapshot drift.** Re-run before releases that depend on accurate math.
- **Generated files.** Banner comment + formatter ignore if needed.

## Reference

- List pricing API: `/platform/api-reference/endpoint/pricing/list-model-pricing`
- SDK overview (optional): `/sdk/ai-billing/index`
- `createObjectPriceResolver`: `/sdk/ai-billing/reference/core/typedoc/functions/createObjectPriceResolver`
- `createNarevPriceResolver` (live): `/sdk/ai-billing/reference/core/typedoc/functions/createNarevPriceResolver`
- `ModelPricing`: `/sdk/ai-billing/reference/core/typedoc/interfaces/ModelPricing`
