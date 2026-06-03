# Price Resolvers

Use `createNarevPriceResolver()` from **`@ai-billing/narev`** when billing middleware needs live model prices from Narev. Static or pinned rates use `createObjectPriceResolver()` from `@ai-billing/core` (see `narev-update-llm-pricing`).

```typescript
import { createNarevPriceResolver } from '@ai-billing/narev';

const priceResolver = createNarevPriceResolver({
  apiKey: process.env.NAREV_API_KEY ?? '',
});
```

Install the Narev package alongside core and your provider middleware:

```bash
pnpm add @ai-billing/narev
```

## Runtime Pricing vs Pricing API

- Runtime app billing: use `createNarevPriceResolver()` from `@ai-billing/narev` inside the `@ai-billing/*` middleware (uses your `NAREV_API_KEY` against `https://api.narev.ai`).
- One-off lookup or cost calculation: use `narev-lookup-llm-pricing` (`GET /v1/price/...`, `POST https://api.narev.ai/v1/calculate` — public, no key).
- Committed offline rates: use `narev-update-llm-pricing` (paginate `GET https://api.narev.ai/v1/price/search` or per-provider price).

## Environment Variables

```bash
NAREV_API_KEY=...
OPENAI_API_KEY=...
GROQ_API_KEY=...
```

Only read `NAREV_API_KEY` from server code. Never prefix it with `NEXT_PUBLIC_`.

## Model Identity

The resolver prices the model that the middleware sees from the provider call. Keep model identifiers stable and explicit:

```typescript
const modelId = 'gpt-4o';

const result = await generateText({
  model: getBillingWrappedModel(openai(modelId)),
  messages,
  providerOptions: {
    'ai-billing-tags': { modelId },
  },
});
```

## Failure Handling

- Missing `NAREV_API_KEY`: fail fast in production or intentionally bypass billing in local/test setups.
- Unknown model: check the Narev pricing catalog with `narev-lookup-llm-pricing`.
- Multi-provider model IDs: include provider-specific middleware and tags so downstream reporting can distinguish where the call ran.

Prefer a clear startup or request-time error over silently dropping billing in production.
