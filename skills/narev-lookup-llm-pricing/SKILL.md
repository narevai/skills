---
name: narev-lookup-llm-pricing
description: 'Narev pricing API on https://api.narev.ai — seven public endpoints only: reference providers/models, price by provider, price search, find cheapest, and POST /v1/calculate. No Bearer token. For pinning rates into the repo, use update-llm-pricing.'
license: MIT
metadata:
  author: narevai
  version: "1.4.0"
  docs: https://www.narev.ai/docs/platform/api-reference/introduction
---

# Look up LLM pricing

Reference for the **only** Narev pricing HTTP endpoints agents should use. Base URL: `https://api.narev.ai`. All are **public** (no `Authorization: Bearer` or `NAREV_API_KEY`).

Rates in price responses are **USD per token** (not per 1K or 1M). For **committed snapshots**, use `update-llm-pricing`.

## Endpoints (exhaustive list)

Do **not** call `GET /v1/models/pricing`, `GET /models/pricing`, `POST /models/pricing/calculate`, `POST /v1/models/pricing/calculate`, or any other path not listed here.

**Discovery**

- `GET https://api.narev.ai/v1/reference/providers` — all providers (`provider_id`, `name`).
- `GET https://api.narev.ai/v1/reference/providers/{provider_id}` — one provider (`base_url`, `pricing_url`, `logo_url`, …). **404** if unknown.
- `GET https://api.narev.ai/v1/reference/models` — model IDs per provider. Query: `provider_ids` (comma-separated), `page`, `page_size` (max `1000`).

**Rates**

- `GET https://api.narev.ai/v1/price/{provider_id}` — pricing for models on that provider. Query: `model_id`, `page`, `page_size`.
- `GET https://api.narev.ai/v1/price/search` — search pricing by model ID. Query: `q`, `page`, `page_size`.
- `GET https://api.narev.ai/v1/find/cheapest/{model_id}` — every provider that serves this model, sorted cheapest `pricing.prompt` first. Query: `page`, `page_size`.

**Calculate**

- `POST https://api.narev.ai/v1/calculate` — USD total for one call (`modelId`, `provider`, `usage`; optional `subprovider`, `isByok`, `webSearchCount`).

## Typical flow

1. **Which providers exist?** → `GET /v1/reference/providers`
2. **Which models exist?** → `GET /v1/reference/models` (optionally `provider_ids=openai,anthropic`)
3. **What are the token rates?**
   - One provider: `GET /v1/price/openai?model_id=gpt-4o`
   - Search by name: `GET /v1/price/search?q=gpt-4`
   - Compare hosts for one model: `GET /v1/find/cheapest/claude-sonnet-4-20250514`
4. **What did this call cost in USD?** → `POST /v1/calculate` with token counts

Paginate price and reference list endpoints while `page <= meta.total_pages`.

## Price response shape

`GET /v1/price/*` and `GET /v1/find/cheapest/*` return:

```json
{
  "data": [
    {
      "model_id": "gpt-4o",
      "provider_id": "openai",
      "pricing": {
        "prompt": 0.0000025,
        "completion": 0.00001,
        "discount": 0,
        "request": 0,
        "web_search": 0,
        "input_cache_read": 0.00000125,
        "input_cache_write": 0,
        "internal_reasoning": 0
      }
    }
  ],
  "meta": { "page": 1, "page_size": 100, "total": 179, "total_pages": 2 }
}
```

- **`pricing.prompt`** — USD per input token. **`pricing.completion`** — USD per output token.
- Also: `discount` (fraction `0`–`1`), `request`, `web_search`, `input_cache_read`, `input_cache_write`, `internal_reasoning`, and image/audio fields when applicable.
- Empty `data` is valid (e.g. no public pricing for that `model_id` on find/cheapest).
- Per-million display: multiply `prompt` / `completion` by `1_000_000`.
- For `POST /v1/calculate`, pass `provider_id` from the row as the JSON field **`provider`** (e.g. `"openai"`).

**Reference providers** — `{ "data": [ { "provider_id": "openai", "name": "OpenAI" }, … ] }`

**Reference models** — `{ "data": [ { "provider_id": "openai", "model_id": "gpt-4o" }, … ], "meta": { … } }`

---

## `GET /v1/reference/providers`

```bash
curl 'https://api.narev.ai/v1/reference/providers'
```

---

## `GET /v1/reference/providers/{provider_id}`

```bash
curl 'https://api.narev.ai/v1/reference/providers/openai'
```

---

## `GET /v1/reference/models`

```bash
curl -G 'https://api.narev.ai/v1/reference/models' \
  --data-urlencode 'provider_ids=openai,anthropic' \
  --data-urlencode 'page=1' \
  --data-urlencode 'page_size=100'
```

---

## `GET /v1/price/{provider_id}`

```bash
curl -G 'https://api.narev.ai/v1/price/openai' \
  --data-urlencode 'model_id=gpt-4o'
```

---

## `GET /v1/price/search`

```bash
curl -G 'https://api.narev.ai/v1/price/search' \
  --data-urlencode 'q=gpt-4' \
  --data-urlencode 'page=1' \
  --data-urlencode 'page_size=100'
```

Omit `q` or use a broad fragment to page through the catalog (see `meta.total_pages`).

---

## `GET /v1/find/cheapest/{model_id}`

```bash
curl 'https://api.narev.ai/v1/find/cheapest/gpt-4o'
```

Use an exact `model_id` from reference/models or price/search. Results sort by `pricing.prompt` ascending.

---

## `POST /v1/calculate`

Given `modelId`, `provider`, and token `usage`, returns an itemized USD breakdown. Replaces legacy `POST /models/pricing/calculate`.

```bash
curl -X POST 'https://api.narev.ai/v1/calculate' \
  -H 'Content-Type: application/json' \
  -d '{
    "modelId": "gpt-4o",
    "provider": "openai",
    "subprovider": "OpenAI",
    "usage": {
      "promptTokens": 1000,
      "completionTokens": 500,
      "cacheReadTokens": 0,
      "cacheWriteTokens": 0,
      "reasoningTokens": 0
    }
  }'
```

**200:** `costBreakdown.total` (report to the user), plus `pricing` (`input`, `output`, `request`, `inputCacheRead`, `inputCacheWrite`, `internalReasoning`, `webSearch`), echoed `usage`, `modelId`, `provider`, `subprovider`.

**Errors:** `400` — usage validation (all five usage integers required; use `0` if unused). `402` — enterprise-only (`pricing: null`, `error` set). `404` — unknown `modelId` + `provider` (+ `subprovider`).

If calculate fails for a multi-host model, use **`GET /v1/price/search?q=…`** or **`GET /v1/find/cheapest/{model_id}`** to confirm `provider_id`, then retry with matching `provider` and `subprovider` when required.

---

## When to use this skill

- Provider/model discovery, live token rates, cheapest host, or one-call USD.
- HTTP params, response fields, pagination, and calculate errors.

**Snapshots in-repo** → `update-llm-pricing`. **Runtime billing in app** → SDK / Next.js skills.

## Constraints

- **Only the seven endpoints above** — no legacy list or calculate paths (`/models/pricing/calculate`, `/v1/models/pricing/calculate`, etc.).
- **Calculate** — `POST /v1/calculate` only.
- **Do not hardcode rates**; snapshot when you need pinned values.
