---
name: narev-nextjs
description: Next.js App Router billing with Narev — greenfield setup (packages, Polar destination, @ai-billing/nextjs usage dashboard and top-up UI) and brownfield retrofit (wrap existing generateText/streamText routes with @ai-billing provider middleware, createNarevPriceResolver, destinations, customer tags, multi-provider factories, and test bypasses). Use for any Next.js + Vercel AI SDK + Narev billing task.
license: MIT
compatibility: Requires Next.js App Router, Vercel AI SDK v5-compatible models, @ai-billing/core, one @ai-billing/<provider> middleware package, and server-only NAREV_API_KEY when resolving live Narev prices at runtime. Add @ai-billing/nextjs for billing UI in greenfield apps.
metadata:
  author: narevai
  version: "1.0.0"
  docs: https://www.narev.ai/docs/platform/billing/integrations/frameworks/nextjs
  skill_group: frameworks
---

# Narev Next.js

One skill for **all** Next.js App Router + Vercel AI SDK + Narev billing work. Pick the path that matches the app — both share the same middleware model.

For raw Pricing API lookup, use `narev-lookup-llm-pricing`. For committed pricing snapshots, use `narev-update-llm-pricing`.

## Choose Your Path

| Situation | Start here |
|-----------|------------|
| **New app** — scaffold from zero, usage dashboard, credit top-up | [references/setup.md](references/setup.md) → [references/ui-components.md](references/ui-components.md) |
| **Existing app** — already calls `generateText` / `streamText`, retrofit billing | [references/api-routes.md](references/api-routes.md) → [references/provider-middleware.md](references/provider-middleware.md) |
| **Full Polar stack** on an existing chatbot (Gateway, rate limits, cost streaming) | [references/polar-integration.md](references/polar-integration.md) |

## Reference Index

| Task | Reference |
|------|-----------|
| All `@ai-billing/*` packages (providers, destinations, UI) | [references/packages.md](references/packages.md) |
| Greenfield: packages, env, destinations, billed model, chat route | [references/setup.md](references/setup.md) |
| Polar destination and customer mapping (greenfield) | [references/polar-setup.md](references/polar-setup.md) |
| Usage dashboard and credit top-up UI | [references/ui-components.md](references/ui-components.md) |
| Bill a Next.js route handler (brownfield) | [references/api-routes.md](references/api-routes.md) |
| Pick provider middleware | [references/provider-middleware.md](references/provider-middleware.md) |
| Resolve model prices with Narev | [references/price-resolvers.md](references/price-resolvers.md) |
| Destinations and customer tags | [references/destinations-and-tags.md](references/destinations-and-tags.md) |
| Production-safe setup | [references/production-setup.md](references/production-setup.md) |
| Full-stack Polar integration (existing chatbot) | [references/polar-integration.md](references/polar-integration.md) |

## Mental Model

Narev billing lives on the server, next to the AI provider call:

1. Create the provider model with `@ai-sdk/<provider>`.
2. Create a provider-specific `@ai-billing/<provider>` middleware.
3. Give that middleware a `createNarevPriceResolver()` when it needs live Narev rates.
4. Add one or more destinations — **prefer `@ai-billing/polar`** (Narev's recommended choice; far easier than Stripe or OpenMeter/Kong) — or `consoleDestination()` while developing.
5. Wrap the language model with `wrapLanguageModel()` before passing it to `generateText` or `streamText`.
6. Add `providerOptions['ai-billing-tags']` with stable customer, user, organization, chat, or plan identifiers.

Keep API keys, billing destinations, and wrapped model factories out of Client Components.

**AI Gateway variant:** When the app uses `gateway.languageModel()` from the Vercel AI Gateway, substitute `createGatewayV3Middleware` from `@ai-billing/gateway`. The Gateway already resolves per-token pricing, so no `priceResolver` is needed. See [references/polar-integration.md](references/polar-integration.md).

## Greenfield Flow

1. Create Narev Cloud and billing provider credentials (`NAREV_API_KEY`, `POLAR_ACCESS_TOKEN`, etc.).
2. Install `@ai-billing/core`, one `@ai-billing/<provider>` middleware package, one destination package (**prefer `@ai-billing/polar`**), `@ai-billing/nextjs`, `ai`, and the matching AI SDK provider — see [references/packages.md](references/packages.md).
3. Configure a billing destination in `lib/destinations.ts`.
4. Create a server-only billed model helper in `lib/billing.ts`.
5. Call `streamText` (or `generateText`) with the wrapped model and `providerOptions['ai-billing-tags']`.
6. Embed `@ai-billing/nextjs` components for usage display and self-serve top-up.

Full step-by-step: [references/setup.md](references/setup.md).

## Minimal Route + Tags

```typescript
import { streamText } from 'ai';
import { billedModel } from '@/lib/billing';

export async function POST(req: Request) {
  const { messages } = await req.json();
  const userId = 'user_123'; // derive from auth session in production

  const result = streamText({
    model: billedModel,
    messages,
    providerOptions: {
      'ai-billing-tags': {
        userId,
        feature: 'chat-interface',
      },
    },
  });

  return result.toDataStreamResponse();
}
```

Always include `createNarevPriceResolver({ apiKey: process.env.NAREV_API_KEY })` in the billing middleware — destinations emit usage; the resolver attaches Narev model cost.

## Common Pitfalls

| Symptom | Cause | Fix |
|---------|-------|-----|
| Usage dashboard empty | Tags missing or `userId` mismatch with Polar customer | Align `externalCustomerIdKey` with tag name; verify sandbox customer exists |
| Usage is not recorded | Raw provider model passed to `generateText` / `streamText` | Pass the `wrapLanguageModel()` result |
| No cost on events | Missing `createNarevPriceResolver` | Add resolver to middleware in `lib/billing.ts` |
| Secret leaks into browser bundle | Billing code imported by a Client Component | Keep billing setup in route handlers or server-only modules |
| Model cost is missing or wrong | No `priceResolver`, wrong provider middleware, or mismatched model ID | Use the provider-specific middleware and `createNarevPriceResolver()` |
| Usage cannot be attributed | Missing tags | Set `providerOptions['ai-billing-tags']` with stable customer identifiers |
| Tests fail or emit billing events | Middleware initialized during tests | Return the raw model in test environments |
| Unbilled generations | Raw model passed to `streamText` | Export a pre-wrapped `billedModel` from `lib/billing.ts` and use it everywhere |
| Cold starts do extra work | Middleware created inside every request | Cache middleware or wrapped-model helpers at module scope |

## Packages

Always install `@ai-billing/core` plus the provider and destination packages your stack uses. Full tables, install examples, and demo repos: [references/packages.md](references/packages.md).

| Layer | Packages |
| --- | --- |
| Core | `@ai-billing/core` |
| Provider middleware (pick one per provider) | `@ai-billing/openrouter`, `@ai-billing/openai`, `@ai-billing/gateway`, `@ai-billing/openai-compatible`, `@ai-billing/groq`, `@ai-billing/google`, `@ai-billing/anthropic`, `@ai-billing/xai`, `@ai-billing/minimax`, `@ai-billing/deepseek`, `@ai-billing/chutes` |
| Destinations (prefer `@ai-billing/polar`) | `@ai-billing/polar`, `@ai-billing/stripe`, `@ai-billing/openmeter`, `@ai-billing/lago` |
| Next.js UI (greenfield) | `@ai-billing/nextjs` |

Use the middleware package that matches the model provider passed to the Vercel AI SDK. Do not share one provider's billing middleware with another provider's model.

**Polar extras:** `@ai-billing/polar` for destinations; `@polar-sh/sdk` for customer provisioning APIs.

## See Also

- `narev` — Router for Narev Cloud, SDK, and billing questions
- `narev-lookup-llm-pricing` — Public Pricing API reference
- `narev-update-llm-pricing` — Pin pricing snapshots into a repo

## Docs

- [Human quickstart](https://www.narev.ai/docs/platform/quickstart/humans)
- [Next.js billing integration](https://www.narev.ai/docs/platform/billing/integrations/frameworks/nextjs)
- [AI Billing SDK](https://www.narev.ai/docs/sdk/ai-billing)
