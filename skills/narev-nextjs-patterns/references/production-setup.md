# Production Setup

Use a server-only helper when multiple Next.js routes need billed models. It keeps env vars out of Client Components and avoids re-creating middleware on every request.

## Shared Helper

```typescript
import 'server-only';

import { wrapLanguageModel } from 'ai';
import type { LanguageModelV3 } from '@ai-sdk/provider';
import { createOpenAIMiddleware } from '@ai-billing/openai';
import { createPolarDestination } from '@ai-billing/polar';
import { createNarevPriceResolver } from '@ai-billing/narev';

let billingMiddleware: ReturnType<typeof createOpenAIMiddleware> | null = null;
let initAttempted = false;

function getBillingMiddleware() {
  if (initAttempted) return billingMiddleware;
  initAttempted = true;

  if (process.env.NODE_ENV === 'test') return null;

  const polarAccessToken = process.env.POLAR_ACCESS_TOKEN;
  if (!polarAccessToken) return null;

  billingMiddleware = createOpenAIMiddleware({
    destinations: [
      createPolarDestination({
        accessToken: polarAccessToken,
        server: process.env.POLAR_SERVER === 'production' ? 'production' : 'sandbox',
        eventName: 'llm_usage',
        externalCustomerIdKey: 'userId',
      }),
    ],
    priceResolver: createNarevPriceResolver({
      apiKey: process.env.NAREV_API_KEY ?? '',
    }),
  });

  return billingMiddleware;
}

export function getBillingWrappedModel(model: LanguageModelV3): LanguageModelV3 {
  const middleware = getBillingMiddleware();
  if (!middleware) return model;
  return wrapLanguageModel({ model, middleware });
}
```

## Provider Factory

```typescript
import 'server-only';

import { createOpenAI } from '@ai-sdk/openai';
import { getBillingWrappedModel } from './billing';

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export function getLanguageModel(modelId: string) {
  return getBillingWrappedModel(openai(modelId));
}
```

## Checklist

- Add `import 'server-only'` to shared billing/model helpers in Next.js apps.
- Bypass billing in tests and mock-provider paths.
- Decide whether missing destination credentials should disable billing locally or fail in production.
- Keep one helper per provider middleware type; a shared wrapper can dispatch by provider.
- Add env vars to `.env.example`: `NAREV_API_KEY`, provider API keys, destination credentials such as `POLAR_ACCESS_TOKEN`, and destination mode such as `POLAR_SERVER`.
- Validate that all provider-calling routes use the shared helper, including title generation, tool routes, background continuations, and stream resume endpoints.
