# Provider Middleware

Use the `@ai-billing/<provider>` middleware that matches the provider model passed to the Vercel AI SDK. Full package list and install examples: [packages.md](packages.md).

| Provider | Model factory | Billing package | Middleware factory |
| --- | --- | --- | --- |
| OpenRouter | `createOpenRouter()` from `@openrouter/ai-sdk-provider` | `@ai-billing/openrouter` | `createOpenRouterV3Middleware()` |
| OpenAI | `createOpenAI()` from `@ai-sdk/openai` | `@ai-billing/openai` | `createOpenAIMiddleware()` or `createOpenAIV3Middleware()` |
| Vercel AI Gateway | `gateway.languageModel()` from `ai` | `@ai-billing/gateway` | `createGatewayV3Middleware()` |
| OpenAI Compatible | compatible provider from `@ai-sdk/openai-compatible` | `@ai-billing/openai-compatible` | see package typedoc |
| Groq | `createGroq()` from `@ai-sdk/groq` | `@ai-billing/groq` | `createGroqMiddleware()` |
| Google Generative AI | `createGoogleGenerativeAI()` from `@ai-sdk/google` | `@ai-billing/google` | see package typedoc |
| Anthropic | `createAnthropic()` from `@ai-sdk/anthropic` | `@ai-billing/anthropic` | see package typedoc |
| xAI Grok | `createXai()` from `@ai-sdk/xai` | `@ai-billing/xai` | see package typedoc |
| MiniMax | MiniMax AI SDK provider | `@ai-billing/minimax` | see package typedoc |
| DeepSeek | DeepSeek AI SDK provider | `@ai-billing/deepseek` | see package typedoc |
| Chutes | Chutes AI SDK provider | `@ai-billing/chutes` | see package typedoc |

Factory names may differ by SDK version — confirm exports in the installed package typedoc.

## OpenAI

```typescript
import { createOpenAI } from '@ai-sdk/openai';
import { createOpenAIMiddleware } from '@ai-billing/openai';
import { consoleDestination } from '@ai-billing/core';
import { createNarevPriceResolver } from '@ai-billing/narev';
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

## OpenRouter

```typescript
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { createOpenRouterV3Middleware } from '@ai-billing/openrouter';
import { createPolarDestination } from '@ai-billing/polar';
import { wrapLanguageModel } from 'ai';

const billingMiddleware = createOpenRouterV3Middleware({
  destinations: [
    createPolarDestination({
      accessToken: process.env.POLAR_ACCESS_TOKEN!,
      eventName: 'llm_usage',
    }),
  ],
});

export function getModel(modelId: string) {
  return wrapLanguageModel({
    model: createOpenRouter({ apiKey: process.env.OPENROUTER_API_KEY! })(modelId),
    middleware: billingMiddleware,
  });
}
```

## Groq

```typescript
import { createGroq } from '@ai-sdk/groq';
import { createGroqMiddleware } from '@ai-billing/groq';
import { consoleDestination } from '@ai-billing/core';
import { createNarevPriceResolver } from '@ai-billing/narev';
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

## Unsupported provider

When the app's AI SDK provider has **no** `@ai-billing/<provider>` package (see [packages.md](packages.md#unsupported-provider)), **change to a supported provider** that serves the same model. Do not skip billing or attach the wrong middleware.

A supported host enables provider-matched middleware, Narev pricing, and destination events for usage-based billing. Use `narev-lookup-llm-pricing` to find which supported providers list the model, then swap the `@ai-sdk/*` (or Gateway) integration and matching billing package.

## Rules

- Match middleware to provider. Do not use OpenAI billing middleware for a Groq, Anthropic, Gateway, or OpenRouter model.
- No billing package for the current provider → switch provider (same model ID on a supported host), not a workaround middleware.
- Wrap at the language-model boundary, then pass the wrapped model to `generateText`, `streamText`, `embed`, or other provider-calling AI SDK methods.
- For multi-provider apps, centralize model factories so each provider path wraps with its own middleware.
- For AI Gateway middleware, prices come from Gateway usage metadata — no `createNarevPriceResolver` when using `gateway.languageModel()`.
