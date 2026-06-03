---
name: narev-update-llm-pricing
description: 'Pin LLM pricing in the repo: fetch rows from narev-lookup-llm-pricing (price/search or price per provider), map pricing.prompt/completion into your schema, write a committed file. Use for snapshots — not for endpoint contracts (use lookup-llm-pricing).'
license: MIT
metadata:
  author: narevai
  version: "2.0.0"
  docs: https://www.narev.ai/docs/platform/api-reference/introduction
---

# Update LLM pricing in the local repo

Turn **live price API output** into a **checked-in** file for offline or deterministic billing.

**HTTP contracts** → `narev-lookup-llm-pricing` (seven endpoints only). This skill covers **fetch + map + write**.

## When to use this skill

- Refresh a committed pricing registry from Narev.
- Swap `createNarevPriceResolver` for `createObjectPriceResolver` over a local map.
- Add a snapshot script or scheduled CI job.

Live lookup or **one-call USD** → `narev-lookup-llm-pricing` (`POST /v1/calculate`).

## What to fetch

Use **only** lookup’s price endpoints (not calculate for bulk data):

**Option A — full catalog (simplest)**

Paginate `GET https://api.narev.ai/v1/price/search` with `page` and `page_size` (max `1000`) until `page > meta.total_pages`. Optional `q` to narrow scope.

**Option B — per provider**

1. `GET https://api.narev.ai/v1/reference/providers` for `provider_id` values.
2. For each provider (or a scoped subset), paginate `GET https://api.narev.ai/v1/price/{provider_id}`.

Do **not** use `GET /v1/models/pricing`, `GET /models/pricing`, or bulk `POST /v1/calculate`.

## What each row means

From `{ data: PriceEntry[], meta }`:

| API field | Snapshot use |
| --------- | ------------- |
| `model_id`, `provider_id` | Keys — often `provider_id/model_id` when the same model exists on multiple vendors |
| `pricing.prompt` | Input token rate (USD per token) |
| `pricing.completion` | Output token rate |
| `pricing.input_cache_read`, `pricing.input_cache_write` | Cache tiers |
| `pricing.internal_reasoning` | Reasoning tokens |
| `pricing.request`, `pricing.web_search` | Per-request / per-search |
| `pricing.discount` | Fraction `0`–`1`, not a percent |

Skip rows with missing or null `pricing` if the API returns them.

## Mapping to your registry

1. **Inspect the repo** — key style, per-token vs per-million, which fields the app reads.
2. **Transform** each row:
   - Per-million: `inputPerMTok = pricing.prompt * 1_000_000` (same for completion). Do not double-scale.
   - Per-token: copy `pricing.*` as-is (rename `prompt` → `price_prompt` if your schema uses that).
   - Map `provider_id` → `provider` when aligning with `POST /v1/calculate` or SDK maps.
3. **Merge or replace** — merge overwrites keys from this run; replace rewrites the whole file.
4. **Script hygiene** — generated banner, non-zero exit on HTTP errors, document run command, inspect diff.

### `@ai-billing/core` (optional)

`createObjectPriceResolver` expects **`ModelPricing` in USD per token**:

| Price API (`pricing`) | SDK `ModelPricing` |
| --------------------- | ------------------ |
| `prompt` | `promptTokens` |
| `completion` | `completionTokens` |
| `input_cache_read` | `inputCacheReadTokens` |
| `input_cache_write` | `inputCacheWriteTokens` |
| `internal_reasoning` | `internalReasoningTokens` |
| `request` | `request` |
| `web_search` | `webSearch` |
| `discount` | `discount` |

```ts
import { createObjectPriceResolver } from "@ai-billing/core";
import { pricing } from "./pricing";

export const priceResolver = createObjectPriceResolver(pricing);
```

## Workflow

1. **Scope** — providers, target path, format, units.
2. **Fetch** — paginate `GET /v1/price/search` or per-provider `GET /v1/price/{provider_id}` per lookup.
3. **Map & write** — apply table above; merge/replace; banner if generated.
4. **Run** — project package runner; verify diff.
5. **Wire app** — import file or `createObjectPriceResolver`; optional CI schedule.

## Constraints

- **Price endpoints only** for snapshots (`/v1/price/search` or `/v1/price/{provider_id}`).
- **`pricing.discount`** is a fraction (`0.1` = 10% off).
- Re-run before releases that depend on accurate math.

## Reference

- Endpoints and row shape: `narev-lookup-llm-pricing`
- Docs: https://www.narev.ai/docs/platform/api-reference/introduction
- SDK — `createObjectPriceResolver`: https://narev.ai/docs/sdk/ai-billing/reference/core/typedoc/functions/createObjectPriceResolver
