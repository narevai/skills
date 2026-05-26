---
name: narev-nextjs-patterns
description: Brownfield Next.js patterns for adding Narev usage-based billing to existing Vercel AI SDK apps — wrap language models with @ai-billing provider middleware, createNarevPriceResolver, destinations, route handlers, streaming, customer tags, multi-provider factories, and test bypasses. Use when the app already calls generateText or streamText and you need to retrofit billing without scaffolding from scratch.
license: MIT
compatibility: Requires Next.js App Router, Vercel AI SDK v5-compatible models, @ai-billing/core, one @ai-billing/<provider> middleware package, and server-only NAREV_API_KEY when resolving live Narev prices at runtime.
metadata:
  author: narevai
  version: "1.0.0"
  docs: https://www.narev.ai/docs/sdk/ai-billing
  skill_group: frameworks
---

# Narev Next.js Patterns (Brownfield)

Use this skill when **retrofitting** Narev billing into an existing Next.js App Router app that already calls `generateText`, `streamText`, or another Vercel AI SDK method against a provider API.

**Starting a new app with billing UI and Polar checkout?** Use `narev-nextjs-quickstart` instead — it covers greenfield setup with `@ai-billing/nextjs` components.

For raw Pricing API lookup and cost calculation, use `narev-lookup-llm-pricing`. For committed pricing snapshots, use `narev-update-llm-pricing`.

## Choose Your Path

| Situation | Skill |
|-----------|-------|
| New app, usage dashboard, credit top-up, scaffold from zero | `narev-nextjs-quickstart` |
| Existing Vercel AI SDK routes, centralize billing, multi-route coverage | **This skill** |

## What Do You Need?

| Task | Reference |
|------|-----------|
| Bill a Next.js route handler | references/api-routes.md |
| Pick provider middleware | references/provider-middleware.md |
| Resolve model prices with Narev | references/price-resolvers.md |
| Send usage to destinations and tag customers | references/destinations-and-tags.md |
| Production-safe setup | references/production-setup.md |
| Full-stack Polar integration (existing chatbot) | references/polar-integration.md |

## Mental Model

Narev billing lives on the server, next to the AI provider call:

1. Create the provider model with `@ai-sdk/<provider>`.
2. Create a provider-specific `@ai-billing/<provider>` middleware.
3. Give that middleware a `createNarevPriceResolver()` when it needs live Narev rates.
4. Add one or more destinations, such as `consoleDestination()` while developing or a billing destination in production.
5. Wrap the language model with `wrapLanguageModel()` before passing it to `generateText` or `streamText`.
6. Add `providerOptions['ai-billing-tags']` with stable customer, user, organization, chat, or plan identifiers.

Keep API keys, billing destinations, and wrapped model factories out of Client Components.

**AI Gateway variant:** When the app uses `gateway.languageModel()` from the Vercel AI Gateway, substitute `createGatewayV3Middleware` from `@ai-billing/gateway` in place of a provider-specific middleware. The Gateway already resolves per-token pricing, so no `priceResolver` is needed. See `references/polar-integration.md` for the complete end-to-end pattern including customer creation, rate limiting, cost streaming to the browser, and a usage dashboard.

## Minimal Pattern

```typescript
import { createOpenAI } from '@ai-sdk/openai';
import { createOpenAIMiddleware } from '@ai-billing/openai';
import { consoleDestination, createNarevPriceResolver } from '@ai-billing/core';
import { convertToModelMessages, generateText, wrapLanguageModel } from 'ai';

const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });

const billingMiddleware = createOpenAIMiddleware({
  destinations: [consoleDestination()],
  priceResolver: createNarevPriceResolver({
    apiKey: process.env.NAREV_API_KEY ?? '',
  }),
});

export async function POST(request: Request) {
  const { messages, userId } = await request.json();
  const modelId = 'gpt-4o';

  const result = await generateText({
    model: wrapLanguageModel({
      model: openai(modelId),
      middleware: billingMiddleware,
    }),
    messages: await convertToModelMessages(messages),
    providerOptions: {
      'ai-billing-tags': {
        userId,
        modelId,
      },
    },
  });

  return Response.json(result);
}
```

## Common Pitfalls

| Symptom | Cause | Fix |
|---------|-------|-----|
| Usage is not recorded | Raw provider model is passed to `generateText` | Pass the `wrapLanguageModel()` result |
| Secret leaks into browser bundle | Billing code imported by a Client Component | Keep billing setup in route handlers or server-only modules |
| Model cost is missing or wrong | No `priceResolver`, wrong provider middleware, or mismatched model ID | Use the provider-specific middleware and `createNarevPriceResolver()` |
| Usage cannot be attributed | Missing tags | Set `providerOptions['ai-billing-tags']` with stable customer identifiers |
| Tests fail or emit billing events | Middleware initialized during tests | Return the raw model in test environments |
| Cold starts do extra work | Middleware created inside every request | Cache middleware or wrapped-model helpers at module scope |

## Package Map

| Provider | AI SDK package | Billing package |
|----------|----------------|-----------------|
| OpenAI | `@ai-sdk/openai` | `@ai-billing/openai` |
| Groq | `@ai-sdk/groq` | `@ai-billing/groq` |
| Anthropic | `@ai-sdk/anthropic` | `@ai-billing/anthropic` |
| Google | `@ai-sdk/google` | `@ai-billing/google` |
| Gateway | AI Gateway provider | `@ai-billing/gateway` |
| OpenRouter | `@openrouter/ai-sdk-provider` | `@ai-billing/openrouter` |

Use the middleware package that matches the model provider passed to the Vercel AI SDK. Do not share one provider's billing middleware with another provider's model.

**Polar destination packages:** When routing billing events to Polar, also install `@ai-billing/polar` (destination adapter) and `@polar-sh/sdk` (Polar API client for customer management). For prebuilt usage dashboard UI, install `@ai-billing/nextjs`.

## See Also

- `narev-nextjs-quickstart` - Greenfield setup with `@ai-billing/nextjs` billing UI
- `narev` - Router for Narev Cloud, SDK, and billing questions
- `narev-lookup-llm-pricing` - Public Pricing API reference
- `narev-update-llm-pricing` - Pin pricing snapshots into a repo

## Docs

- [AI Billing SDK](https://www.narev.ai/docs/sdk/ai-billing)
- [Pricing API](https://www.narev.ai/docs/platform/api-reference/endpoint/pricing/list-model-pricing)
