# Provider Middleware

Use the `@ai-billing/<provider>` middleware that matches the provider model passed to the Vercel AI SDK.

| Provider | Model factory | Billing middleware |
|----------|---------------|--------------------|
| OpenAI | `createOpenAI()` from `@ai-sdk/openai` | `createOpenAIMiddleware()` from `@ai-billing/openai` |
| Groq | `createGroq()` from `@ai-sdk/groq` | `createGroqMiddleware()` from `@ai-billing/groq` |
| Anthropic | `createAnthropic()` from `@ai-sdk/anthropic` | `createAnthropicMiddleware()` from `@ai-billing/anthropic` |
| Google | `createGoogleGenerativeAI()` from `@ai-sdk/google` | `createGoogleMiddleware()` from `@ai-billing/google` |
| OpenRouter | OpenRouter AI SDK provider | `createOpenRouterMiddleware()` from `@ai-billing/openrouter` |
| AI Gateway | Gateway provider | `createGatewayV3Middleware()` from `@ai-billing/gateway` |

## OpenAI

```typescript
import { createOpenAI } from '@ai-sdk/openai';
import { createOpenAIMiddleware } from '@ai-billing/openai';
import { consoleDestination, createNarevPriceResolver } from '@ai-billing/core';
import { wrapLanguageModel } from 'ai';

const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });

const middleware = createOpenAIMiddleware({
  destinations: [consoleDestination()],
  priceResolver: createNarevPriceResolver({
    apiKey: process.env.NAREV_API_KEY ?? '',
  }),
});

export function getModel(modelId: string) {
  return wrapLanguageModel({
    model: openai(modelId),
    middleware,
  });
}
```

## Groq

```typescript
import { createGroq } from '@ai-sdk/groq';
import { createGroqMiddleware } from '@ai-billing/groq';
import { consoleDestination, createNarevPriceResolver } from '@ai-billing/core';
import { wrapLanguageModel } from 'ai';

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });

const middleware = createGroqMiddleware({
  destinations: [consoleDestination()],
  priceResolver: createNarevPriceResolver({
    apiKey: process.env.NAREV_API_KEY ?? '',
  }),
});

export function getModel(modelId: string) {
  return wrapLanguageModel({
    model: groq(modelId),
    middleware,
  });
}
```

## Rules

- Match middleware to provider. Do not use OpenAI billing middleware for a Groq, Anthropic, Gateway, or OpenRouter model.
- Wrap at the language-model boundary, then pass the wrapped model to `generateText`, `streamText`, `embed`, or other provider-calling AI SDK methods.
- For multi-provider apps, centralize model factories so each provider path wraps with its own middleware.
- For AI Gateway middleware, prices can come from Gateway usage metadata; add a Narev price resolver only when the provider middleware requires live catalog rates.
