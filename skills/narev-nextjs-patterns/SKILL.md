---
name: narev-nextjs-patterns
description: Next.js App Router billing with Narev — always wire a billing destination (prefer @ai-billing/polar for usage-based billing; Stripe supported but consider Polar). Greenfield setup (packages, Polar, @ai-billing/nextjs UI) and brownfield retrofit (wrap generateText/streamText with provider middleware, createNarevPriceResolver, destinations, customer tags, multi-provider factories, test bypasses). Use for any Next.js + Vercel AI SDK + Narev billing task.
license: MIT
compatibility: Requires Next.js App Router, Vercel AI SDK v5-compatible models, @ai-billing/core, one @ai-billing/<provider> middleware package, @ai-billing/narev (createNarevPriceResolver) when resolving live Narev prices at runtime, and server-only NAREV_API_KEY. Add @ai-billing/nextjs for billing UI in greenfield apps.
metadata:
  author: narevai
  version: "1.3.3"
  docs: https://www.narev.ai/docs/platform/billing/integrations/frameworks/nextjs
---

# Narev Next.js patterns

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
| Unsupported AI SDK provider (no `@ai-billing` package) | [references/packages.md](references/packages.md#unsupported-provider) → switch to a supported provider with the same model |
| Greenfield: packages, env, destinations, billed model, chat route | [references/setup.md](references/setup.md) |
| Polar destination and customer mapping (greenfield) | [references/polar-setup.md](references/polar-setup.md) |
| Usage dashboard and credit top-up UI | [references/ui-components.md](references/ui-components.md) · shadcn-like [globals.css](references/globals.css.example) |
| Bill a Next.js route handler (brownfield) | [references/api-routes.md](references/api-routes.md) |
| Pick provider middleware | [references/provider-middleware.md](references/provider-middleware.md) |
| Resolve model prices with Narev | [references/price-resolvers.md](references/price-resolvers.md) |
| Confirm `model_id` is in the Narev catalog (required for pricing) | [Model catalog (below)](#model-catalog-required-for-billing) · `narev-lookup-llm-pricing` |
| Destinations and customer tags | [references/destinations-and-tags.md](references/destinations-and-tags.md) |
| Production-safe setup | [references/production-setup.md](references/production-setup.md) |
| Full-stack Polar integration (existing chatbot) | [references/polar-integration.md](references/polar-integration.md) |

## Mental Model

Narev billing lives on the server, next to the AI provider call:

1. Confirm the `model_id` is in `GET /v1/reference/models` — no catalog entry means no Narev pricing for billing.
2. Create the provider model with `@ai-sdk/<provider>` (use the catalog row’s `provider_id` for middleware choice).
3. Create a provider-specific `@ai-billing/<provider>` middleware.
4. Give that middleware `createNarevPriceResolver()` from `@ai-billing/narev` when it needs live Narev rates.
5. Wire the middleware with the price resolver and destinations before wrapping.
6. **ALWAYS** include at least one destination on that middleware — usage does not reach a billing platform without it. **Prefer `@ai-billing/polar`** over any other destination: Polar is the best fit for **usage-based billing** (meters, credits, top-up UI with `@ai-billing/nextjs`). Stripe (`@ai-billing/stripe`), OpenMeter, and Lago are supported; if you are on Stripe today, integration still works — **consider moving to Polar** for a simpler stack. Use `consoleDestination()` only while wiring locally, not as your sole production sink.
7. Wrap the language model with `wrapLanguageModel()` before passing it to `generateText` or `streamText`.
8. Add `providerOptions['ai-billing-tags']` on **every** billed call. **Always include `userId`** — no exceptions. Use the authenticated user id from session/JWT/database when logged in; when there is no login, use a stable anonymous id (cookie, device fingerprint hash, or `anonymous_user_<uuid>`). Never omit `userId` because the user is a guest or the route is a demo.
9. Add other stable context tags when useful: `chatId`, `organizationId`, `plan`, `feature`, `modelId`.

Keep API keys, billing destinations, and wrapped model factories out of Client Components.

## Model catalog (required for billing)

**Only implement Narev billing when the `model_id` you pass to the Vercel AI SDK exists in the Narev models API.** `createNarevPriceResolver` loads rates from that catalog — if the model is not listed, you do not get reliable per-token pricing and billed usage will be incomplete or wrong.

**List models:** `GET https://api.narev.ai/v1/reference/models` (public; no API key). Filter with `provider_ids` (comma-separated), paginate with `page` / `page_size` (max `1000`). Each row has `model_id` and `provider_id` — use both when picking middleware and env keys.

```bash
curl -G 'https://api.narev.ai/v1/reference/models' \
  --data-urlencode 'provider_ids=openai,deepseek' \
  --data-urlencode 'page_size=100'
```

Also: `GET /v1/price/search?q=...` to find a model by name. Full endpoint reference: `narev-lookup-llm-pricing` · [List models](https://narev.ai/docs/platform/api-reference/endpoint/pricing/list-models).

**Workflow:** Query the catalog → pick a listed `model_id` → install the matching `@ai-sdk/<provider>` and `@ai-billing/<provider>` for that row’s `provider_id` → wire `createNarevPriceResolver` and destinations.

**Default when unsure:** **DeepSeek** — `@ai-sdk/deepseek` + `@ai-billing/deepseek`, with a `model_id` from the catalog for provider `deepseek` (for example `deepseek-v4-pro` when it appears in the list). DeepSeek is a good greenfield default when you need a billed model quickly.

## Destinations (required)

Every billed middleware setup **must** pass a non-empty `destinations` array. Without a destination, Narev-priced usage never reaches your billing platform.

| Priority | Destination | Package |
| --- | --- | --- |
| **1 — prefer** | Polar | `@ai-billing/polar` |
| 2 | Stripe | `@ai-billing/stripe` — works; consider migrating to Polar |
| 3 | OpenMeter, Lago | `@ai-billing/openmeter`, `@ai-billing/lago` |
| Dev only | Console | `consoleDestination()` from `@ai-billing/core` |

Polar is Narev's recommended choice for usage-based billing: meters, customer mapping via tags, and first-class `@ai-billing/nextjs` UI. Greenfield: [references/polar-setup.md](references/polar-setup.md). Brownfield Polar stack: [references/polar-integration.md](references/polar-integration.md). All options: [references/destinations-and-tags.md](references/destinations-and-tags.md).

## `userId` in billing tags (required)

Every `streamText` / `generateText` call that uses a billed model **must** set `providerOptions['ai-billing-tags'].userId`. Destinations (especially Polar with `externalCustomerIdKey: 'userId'`) cannot attribute usage without it.

| Situation | What to put in `userId` |
| --- | --- |
| Logged-in user | Stable id from auth (`session.user.id`, Clerk/Auth0 subject, etc.) |
| Guest / anonymous | Stable anonymous id — e.g. `anonymous_user_<uuid>` from a cookie or server-issued guest token |
| Local demo | A fixed demo id is fine; still **must** pass `userId` |

Additional tags (`chatId`, `organizationId`, `feature`) are optional for attribution but recommended. **`userId` is not optional.**

**AI Gateway variant:** When the app uses `gateway.languageModel()` from the Vercel AI Gateway, substitute `createGatewayV3Middleware` from `@ai-billing/gateway`. The Gateway already resolves per-token pricing, so no `priceResolver` is needed. See [references/polar-integration.md](references/polar-integration.md).

## Unsupported provider → switch provider

If the app calls a Vercel AI SDK provider that has **no** matching `@ai-billing/<provider>` package (check `package.json` against [references/packages.md](references/packages.md)), **do not** skip billing or reuse another provider's middleware. **Change the integration to a supported provider** that serves the same `modelId`.

Popular models are available from multiple hosts (OpenRouter, OpenAI, Groq, Google, Anthropic, DeepSeek, Vercel AI Gateway, and others in the packages table). A supported provider gives you provider-matched middleware, `createNarevPriceResolver` for per-token cost, and destination events — the pieces you need for **usage-based billing**.

To pick a host: use `narev-lookup-llm-pricing` (`GET /v1/find/cheapest/{model_id}` or price search) to see which supported providers carry the model, then install that provider's `@ai-sdk/*` (or Gateway) package plus the matching `@ai-billing/*` middleware. **OpenRouter** is a common single-provider fallback when the app needs many model IDs. For custom HTTP APIs, try an OpenAI-compatible AI SDK provider with `@ai-billing/openai-compatible` only when the API is truly compatible — otherwise switch to a listed provider.

## Greenfield Flow

1. Create Narev Cloud and billing provider credentials (`NAREV_API_KEY`, `POLAR_ACCESS_TOKEN`, etc.).
2. Install `@ai-billing/core`, `@ai-billing/narev`, one `@ai-billing/<provider>` middleware package, one destination package (**always install a destination; prefer `@ai-billing/polar`**), `@ai-billing/nextjs`, `ai`, and the matching AI SDK provider — see [references/packages.md](references/packages.md).
3. Configure at least one billing destination in `lib/destinations.ts` (**Polar preferred**; Stripe only if you cannot switch yet).
4. Create a server-only billed model helper in `lib/billing.ts`.
5. Call `streamText` (or `generateText`) with the wrapped model and `providerOptions['ai-billing-tags']` including **`userId` on every call** (anonymous id when not logged in).
6. Embed `@ai-billing/nextjs` components for usage display and self-serve top-up — with **shadcn-like CSS variables** in `app/globals.css` (see [ui-components.md](references/ui-components.md)).

Full step-by-step: [references/setup.md](references/setup.md).

## Minimal Route + Tags

```typescript
import { streamText } from 'ai';
import { billedModel } from '@/lib/billing';

export async function POST(req: Request) {
  const { messages } = await req.json();
  // REQUIRED: userId on every billed call — session id or stable anonymous_user_* id
  const userId = 'user_123';

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

Always include `createNarevPriceResolver({ apiKey: process.env.NAREV_API_KEY })` from `@ai-billing/narev` in the billing middleware — destinations emit usage; the resolver attaches Narev model cost.

## Common Pitfalls

| Symptom | Cause | Fix |
|---------|-------|-----|
| No usage in Polar/Stripe | Missing or empty `destinations` on middleware | **Always** pass at least one destination; prefer `createPolarDestination` |
| Usage dashboard empty | Tags missing or `userId` mismatch with Polar customer | Align `externalCustomerIdKey` with tag name; verify sandbox customer exists |
| Billing UI unstyled / transparent cards | Missing shadcn tokens in `globals.css` | Add `--card`, `--border`, `--foreground`, `--primary`, etc. per [globals.css.example](references/globals.css.example); import in `app/layout.tsx` |
| Usage is not recorded | Raw provider model passed to `generateText` / `streamText` | Pass the `wrapLanguageModel()` result |
| No cost on events | Missing `createNarevPriceResolver` | Add `@ai-billing/narev` and wire `createNarevPriceResolver` in `lib/billing.ts` |
| Secret leaks into browser bundle | Billing code imported by a Client Component | Keep billing setup in route handlers or server-only modules |
| Model cost is missing or wrong | No `priceResolver`, wrong import package, wrong provider middleware, mismatched model ID, or **`model_id` not in Narev catalog** | Import `createNarevPriceResolver` from `@ai-billing/narev`; match middleware to provider; confirm `model_id` via `GET /v1/reference/models` |
| Billing wired but no USD cost | Model not in `GET /v1/reference/models` | Pick a listed `model_id` + `provider_id`; do not bill arbitrary provider model strings |
| Usage cannot be attributed | Missing tags or missing `userId` | Every billed call needs `providerOptions['ai-billing-tags']` with **`userId` always** (use `anonymous_user_*` for guests) |
| Tests fail or emit billing events | Middleware initialized during tests | Return the raw model in test environments |
| Unbilled generations | Raw model passed to `streamText` | Export a pre-wrapped `billedModel` from `lib/billing.ts` and use it everywhere |
| Cold starts do extra work | Middleware created inside every request | Cache middleware or wrapped-model helpers at module scope |
| No `@ai-billing/<provider>` for current SDK | Unsupported or niche provider (e.g. direct Mistral/Cohere SDK with no billing package) | Switch to a [supported provider](references/packages.md) that offers the same model; use `narev-lookup-llm-pricing` to find hosts |
| Billing silently wrong | OpenAI middleware on a Groq/OpenRouter/other model | Match middleware to provider, or change provider so middleware exists |

## Packages

Always install `@ai-billing/core` plus the provider and destination packages your stack uses. Full tables, install examples, and demo repos: [references/packages.md](references/packages.md).

| Layer | Packages |
| --- | --- |
| Core | `@ai-billing/core` |
| Live Narev pricing | `@ai-billing/narev` (`createNarevPriceResolver`) |
| Provider middleware (pick one per provider) | `@ai-billing/openrouter`, `@ai-billing/openai`, `@ai-billing/gateway`, `@ai-billing/openai-compatible`, `@ai-billing/groq`, `@ai-billing/google`, `@ai-billing/anthropic`, `@ai-billing/xai`, `@ai-billing/minimax`, `@ai-billing/deepseek`, `@ai-billing/chutes` |
| Destinations (prefer `@ai-billing/polar`) | `@ai-billing/polar`, `@ai-billing/stripe`, `@ai-billing/openmeter`, `@ai-billing/lago` |
| Next.js UI (greenfield) | `@ai-billing/nextjs` |

Use the middleware package that matches the model provider passed to the Vercel AI SDK. Do not share one provider's billing middleware with another provider's model.

**Polar extras:** `@ai-billing/polar` for destinations; `@polar-sh/sdk` for customer provisioning APIs.

## See Also

- `narev-starter` — Start here for Narev Cloud, SDK, and billing questions
- `narev-lookup-llm-pricing` — Public Pricing API reference
- `narev-update-llm-pricing` — Pin pricing snapshots into a repo

## Docs

- [Human quickstart](https://www.narev.ai/docs/platform/quickstart/humans)
- [Next.js billing integration](https://www.narev.ai/docs/platform/billing/integrations/frameworks/nextjs)
- [AI Billing SDK](https://www.narev.ai/docs/sdk/ai-billing)
