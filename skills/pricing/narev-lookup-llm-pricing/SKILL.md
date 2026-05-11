---
name: narev-lookup-llm-pricing
description: 'Pricing API reference: Document and use the Narev Cloud Pricing API — list model pricing (GET) and calculate call cost (POST). Use when the user needs endpoint behavior, parameters, responses, or errors; real-time per-token rates; token-to-USD math for one call; or when they mention "Narev pricing", "model rates", "USD per token", "cost calculation", or "AI unit economics". For committing catalog snapshots or generator scripts, use update-llm-pricing.'
license: MIT
metadata:
  author: narev
  version: "1.0"
  docs: https://www.narev.ai/docs/platform/api-reference/introduction
  skill_group: pricing
---

# Look up LLM pricing

This skill is the **in-repo API reference** for the Narev Cloud Pricing endpoints (same behavior as `/platform/api-reference/endpoint/pricing/...`, tightened for agents). Use it for contracts and workflows; for **patterns that write the catalog into the repo**, see `update-llm-pricing`.

Two endpoints, both under `https://www.narev.ai`.

| Endpoint                        | Method | Purpose                                                                                 |
| ------------------------------- | ------ | --------------------------------------------------------------------------------------- |
| `/api/models/pricing`           | `GET`  | List the catalog. Filter by `model_id`, `search`, `provider`, `subprovider`. Paginated. |
| `/api/models/pricing/calculate` | `POST` | Compute the USD cost of one call given `modelId`, `provider`, and a `usage` object.     |

Token rates are USD per token (not per 1K, not per 1M).

## When to use this skill

- "What does `gpt-4o` cost on OpenAI right now?"
- "Calculate how much this prompt cost me."
- "How much do cached input tokens cost on Anthropic for `claude-sonnet-4`?"
- "List the providers that serve `llama-3.1-70b` and their rates."
- Any flow that needs token-to-dollar conversion against a current catalog.

If the user wants to **automate** fetching the catalog and **commit** mapped prices (offline or deterministic billing), switch to `update-llm-pricing` — it builds on the `GET` behavior this page defines. If they want prices to resolve at runtime inside their app via the SDK, point them at `add-usage-based-billing`.

## Inputs you need

The pricing endpoints are public. No API key, bearer token, or authentication header is required — call them directly.

- For listing: optional `model_id`, `search`, `provider`, `subprovider`, `sort_by` (`model_id` | `provider` | `subprovider`), `order` (`asc` | `desc`), `page`, `limit` (max `1000`, default `100`).
- For calculation: `modelId`, `provider`, and `usage` with `promptTokens`, `completionTokens`, `cacheReadTokens`, `cacheWriteTokens`, `reasoningTokens` (all required integers — pass `0` if unused). `subprovider` is required when one model is served by multiple providers (`bedrock`, `openrouter`, `together`, etc.). `webSearchCount` and `isByok` are optional.

## Workflow: list pricing

1. Confirm the model and (if needed) the provider. For "OpenAI's GPT-4o", filter by `model_id=gpt-4o` and `provider=openai`.

2. Call the listing endpoint:

   ```bash
   curl -G 'https://www.narev.ai/api/models/pricing' \
     --data-urlencode 'model_id=gpt-4o' \
     --data-urlencode 'provider=openai'
   ```

3. The response is `{ data: ModelPricingEntry[], meta: { page, limit, total, total_pages } }`. Each entry has `model_id`, `provider`, `subprovider`, and a `pricing` object. The fields you most likely care about:
   - `price_prompt` — USD per input token.
   - `price_completion` — USD per output token.
   - `price_input_cache_read`, `price_input_cache_write` — USD per cached input token.
   - `price_internal_reasoning` — USD per reasoning output token.
   - `pricing_request` — flat USD per request.
   - `price_web_search` — USD per web-search invocation.
   - `pricing_discount` — fractional discount (`0`–`1`) applied across all rates.
   - `price_image`, `price_image_output`, `price_audio`, `price_audio_output`, `price_input_audio_cache` — USD per unit, when applicable.

4. Surface the requested fields. Multiply by `1_000_000` if the user expects "USD per million tokens".

5. If `meta.total_pages > 1`, page through with `page=2`, `page=3`, …. Filter rather than paginating the whole catalog whenever possible.

## Workflow: calculate the cost of a call

1. Collect token usage. Required integers: `promptTokens`, `completionTokens`, `cacheReadTokens`, `cacheWriteTokens`, `reasoningTokens`. If a category does not apply, pass `0`.

2. POST the request:

   ```bash
   curl -X POST 'https://www.narev.ai/api/models/pricing/calculate' \
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

3. The 200 response contains:
   - `pricing` — the rates Narev applied (`input`, `output`, `request`, `inputCacheRead`, `inputCacheWrite`, `internalReasoning`, `webSearch`).
   - `costBreakdown.total` — the final USD total.
   - `usage` — echoed back so the caller can verify what was billed.

4. Report `costBreakdown.total` to the user. If they ask "where does that number come from?", show `pricing` and explain that each token category was multiplied by its rate and summed.

## Constraints and edge cases

- **402 Payment Required** — model is enterprise-only. The error response has `error` set and `pricing: null`. Tell the user the model is not in the public catalog and point them at Narev for enterprise access.
- **404 Not Found** — no public pricing for that `modelId` + `provider` (+ `subprovider`). Re-check IDs against the listing endpoint or drop `subprovider`.
- **400 Bad Request** — `usage` failed validation. Most common cause: a missing required integer field. Pass `0`, not `null` or absent.
- **Rates are USD per token.** Do not divide or multiply on the way in. Convert only when displaying.
- **`subprovider` matters.** Models like `llama-3.1-70b` are hosted by Bedrock, OpenRouter, Together, etc. at different prices. If the user does not know the subprovider, list first to see options, then calculate.
- **Do not hardcode rates.** Prices change. If the user wants stable values they can commit and review, switch to `update-llm-pricing`.

## Reference

- API overview: `/platform/api-reference/introduction`
- List endpoint: `/platform/api-reference/endpoint/pricing/list-model-pricing`
- Calculate endpoint: `/platform/api-reference/endpoint/pricing/calculate-cost-for-a-model-call`
