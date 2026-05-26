---
name: narev-nextjs-quickstart
description: Greenfield Next.js setup for Narev usage-based AI billing — install @ai-billing packages, configure Polar (or other destinations), meter Vercel AI SDK calls with provider middleware and createNarevPriceResolver, tag customer usage, and embed @ai-billing/nextjs usage and top-up components. Use when starting a new Next.js app, scaffolding billed chat, or adding the Narev billing dashboard and checkout UI.
license: MIT
compatibility: Requires Next.js App Router, Vercel AI SDK v5-compatible models, @ai-billing/core, @ai-billing/nextjs, one @ai-billing/<provider> middleware package, and server-only NAREV_API_KEY for live Narev prices.
metadata:
  author: narevai
  version: "1.0.0"
  docs: https://www.narev.ai/docs/platform/quickstart/humans
  skill_group: frameworks
---

# Narev Next.js Quickstart (Greenfield)

Use this skill when **starting a new Next.js app** or building a billed AI product from scratch with Narev pre-built UI (usage dashboard, credit top-up).

**Already have Vercel AI SDK routes?** Use `narev-nextjs-patterns` instead — it covers retrofitting existing `streamText` / `generateText` handlers without assuming a greenfield layout.

For raw Pricing API lookup, use `narev-lookup-llm-pricing`. For committed pricing snapshots, use `narev-update-llm-pricing`.

## What Do You Need?

| Task | Reference |
|------|-----------|
| Packages, env vars, destinations, billed model helper, chat route | references/setup.md |
| Polar destination and customer mapping | references/polar-setup.md |
| Usage dashboard and credit top-up UI | references/ui-components.md |

## End-to-End Flow

1. Create Narev Cloud and billing provider credentials (`NAREV_API_KEY`, `POLAR_ACCESS_TOKEN`, etc.).
2. Install `@ai-billing/core`, `@ai-billing/<provider>`, `@ai-billing/polar` (or another destination), `@ai-billing/nextjs`, `ai`, and `@ai-sdk/<provider>`.
3. Configure a billing destination in `lib/destinations.ts`.
4. Create a server-only billed model helper in `lib/billing.ts` with provider middleware, `createNarevPriceResolver()`, and destinations.
5. Call `streamText` (or `generateText`) with the wrapped model and `providerOptions['ai-billing-tags']`.
6. Embed `@ai-billing/nextjs` components for usage display and self-serve top-up.

Keep API keys, billing helpers, and destination config in server-only modules — never in Client Components except where UI components accept a public `userId`.

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

## After Quickstart

When the app grows beyond a single route, adopt patterns from `narev-nextjs-patterns`:

- Centralize `getLanguageModel()` for multiple routes
- Add test bypasses (`NODE_ENV === 'test'`)
- Bill tool loops, title generation, and background continuations
- Support multiple providers with matched middleware

## Common Pitfalls

| Symptom | Cause | Fix |
|---------|-------|-----|
| Usage dashboard empty | Tags missing or `userId` mismatch with Polar customer | Align `externalCustomerIdKey` with tag name; verify sandbox customer exists |
| No cost on events | Missing `createNarevPriceResolver` | Add resolver to middleware in `lib/billing.ts` |
| Billing UI in wrong bundle | Imported billing setup in Client Component | Keep `lib/billing.ts` and `lib/destinations.ts` server-only; only import UI components in client pages |
| Unbilled generations | Raw model passed to `streamText` | Export a pre-wrapped `billedModel` from `lib/billing.ts` and use it everywhere |

## See Also

- `narev-nextjs-patterns` — Retrofit billing into existing Vercel AI SDK apps
- `narev` — Router for Narev Cloud, SDK, and billing questions

## Docs

- [Human quickstart](https://www.narev.ai/docs/platform/quickstart/humans)
- [Next.js billing integration](https://www.narev.ai/docs/platform/billing/integrations/frameworks/nextjs)
- [AI Billing SDK](https://www.narev.ai/docs/sdk/ai-billing)
