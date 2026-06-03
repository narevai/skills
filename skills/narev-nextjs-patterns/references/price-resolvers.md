# Price Resolvers

Use `createNarevPriceResolver()` when billing middleware needs runtime model prices from Narev.

```typescript
import { createNarevPriceResolver } from '@ai-billing/core';

const priceResolver = createNarevPriceResolver({
  apiKey: process.env.NAREV_API_KEY ?? '',
});
```

## Runtime Pricing vs Pricing API

- Runtime app billing: use `createNarevPriceResolver()` inside the `@ai-billing/*` middleware (uses your `NAREV_API_KEY` against `https://api.narev.ai`).
- One-off lookup or cost calculation: use `narev-lookup-llm-pricing` (`GET` / `POST` on `https://api.narev.ai/models/pricing` — public, no key).
- Committed offline rates: use `narev-update-llm-pricing` (paginate `GET https://api.narev.ai/models/pricing`).

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
