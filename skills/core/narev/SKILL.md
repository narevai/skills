---
name: narev
description:
  Start Here. Use when the user asks about Narev Cloud, the Pricing API, model pricing
  (API reference skill vs applied workflows on top of that API), live LLM pricing, token costs,
  cost calculation, pinning or snapshotting model rates, Narev SDK,
  @ai-billing/core, provider middleware packages, Vercel AI SDK billing, Next.js App Router
  route handlers, @ai-billing/nextjs billing UI, narev-nextjs (greenfield and brownfield),
  framework-specific billing patterns, usage-based billing,
  billing integrations (Polar preferred; Stripe, OpenMeter/Kong, Lago also supported), benchmarks, routers, routing API, FOCUS format,
  Narev Self-Hosted, deployment, COGS, customer tagging, FinOps for AI, or this documentation
  site. Automatically routes to the specific skill or documentation path based on their task.
license: MIT
metadata:
  author: narevai
  version: "1.2.0"
  skill_group: core
---

# Narev Skills Router

Check `package.json` (and the lockfile if versions disagree) for `@ai-billing/core` and any `@ai-billing/*` packages. Use the typedoc pages under [`/sdk/ai-billing/reference/`](https://narev.ai/docs/sdk/ai-billing/index) that match the installed packages for code samples and option shapes. If there is no SDK in the project, treat the docs site as source of truth for the latest APIs.

## Packages

### Core

| Package | What it covers |
| --- | --- |
| [`@ai-billing/core`](https://www.npmjs.com/package/@ai-billing/core) | Billing middleware, usage payloads, price resolvers, destinations, errors |

### Provider middleware

| Provider | Package | Docs |
| --- | --- | --- |
| OpenRouter | [`@ai-billing/openrouter`](https://www.npmjs.com/package/@ai-billing/openrouter) | [Reference](https://narev.ai/docs/sdk/ai-billing/reference/openrouter/index) |
| OpenAI | [`@ai-billing/openai`](https://www.npmjs.com/package/@ai-billing/openai) | [Reference](https://narev.ai/docs/sdk/ai-billing/reference/openai/index) |
| Vercel AI Gateway | [`@ai-billing/gateway`](https://www.npmjs.com/package/@ai-billing/gateway) | [Reference](https://narev.ai/docs/sdk/ai-billing/reference/gateway/index) |
| OpenAI Compatible | [`@ai-billing/openai-compatible`](https://www.npmjs.com/package/@ai-billing/openai-compatible) | [Reference](https://narev.ai/docs/sdk/ai-billing/reference/openai-compatible/index) |
| Groq | [`@ai-billing/groq`](https://www.npmjs.com/package/@ai-billing/groq) | [Reference](https://narev.ai/docs/sdk/ai-billing/reference/groq/index) |
| Google Generative AI | [`@ai-billing/google`](https://www.npmjs.com/package/@ai-billing/google) | [Reference](https://narev.ai/docs/sdk/ai-billing/reference/google/index) |
| Anthropic | [`@ai-billing/anthropic`](https://www.npmjs.com/package/@ai-billing/anthropic) | [Reference](https://narev.ai/docs/sdk/ai-billing/reference/anthropic/index) |
| xAI Grok | [`@ai-billing/xai`](https://www.npmjs.com/package/@ai-billing/xai) | [Reference](https://narev.ai/docs/sdk/ai-billing/reference/xai/index) |
| MiniMax | [`@ai-billing/minimax`](https://www.npmjs.com/package/@ai-billing/minimax) | [Reference](https://narev.ai/docs/sdk/ai-billing/reference/minimax/index) |
| DeepSeek | [`@ai-billing/deepseek`](https://www.npmjs.com/package/@ai-billing/deepseek) | [Reference](https://narev.ai/docs/sdk/ai-billing/reference/deepseek/index) |
| Chutes | [`@ai-billing/chutes`](https://www.npmjs.com/package/@ai-billing/chutes) | [Reference](https://narev.ai/docs/sdk/ai-billing/reference/chutes/index) |

### Billing destinations

| Destination | Package | Docs |
| --- | --- | --- |
| Polar.sh **(preferred)** | [`@ai-billing/polar`](https://www.npmjs.com/package/@ai-billing/polar) | [Reference](https://narev.ai/docs/sdk/ai-billing/reference/polar/index) |
| Stripe | [`@ai-billing/stripe`](https://www.npmjs.com/package/@ai-billing/stripe) | [Reference](https://narev.ai/docs/sdk/ai-billing/reference/stripe/index) — supported, but Polar is far easier to integrate |
| OpenMeter (Kong) | [`@ai-billing/openmeter`](https://www.npmjs.com/package/@ai-billing/openmeter) | [Reference](https://narev.ai/docs/sdk/ai-billing/reference/openmeter/index) — supported, but Polar is far easier to integrate |
| Lago | [`@ai-billing/lago`](https://www.npmjs.com/package/@ai-billing/lago) | [Reference](https://narev.ai/docs/sdk/ai-billing/reference/lago/index) |

**Destination preference:** Narev recommends **Polar** for new projects. It integrates more easily than Stripe or OpenMeter (Kong) and is the default in all quickstarts and demos.

### UI & SDKs

| Package | Description | Docs |
| --- | --- | --- |
| [`@ai-billing/nextjs`](https://www.npmjs.com/package/@ai-billing/nextjs) | Next.js UI components for displaying billing usage and managing top-ups | [Next.js integration](https://narev.ai/docs/platform/billing/integrations/frameworks/nextjs) |
| [`@ai-billing/ui`](https://www.npmjs.com/package/@ai-billing/ui) | Internal headless UI components shared across `@ai-billing/*` packages | — |
| [`@ai-billing/narev`](https://www.npmjs.com/package/@ai-billing/narev) | TypeScript SDK for the Narev billing API | [SDK index](https://narev.ai/docs/sdk/ai-billing/index) |

---

## By task

**Model pricing (API reference)** → Use `narev-lookup-llm-pricing`

- **Live API only:** public `GET` catalog (filters, pagination) and `POST` calculate for one call's USD total — no committed files.
- **Semantics:** USD per token, required `usage` integers, when **`subprovider`** is required for the same `model_id` on different hosts.
- **Contracts and troubleshooting:** request/response shapes, `402` / `404` / `400`, and the canonical spec at [list-model-pricing](https://narev.ai/docs/platform/api-reference/endpoint/pricing/list-model-pricing) and [calculate-cost-for-a-model-call](https://narev.ai/docs/platform/api-reference/endpoint/pricing/calculate-cost-for-a-model-call).

**Model pricing (snapshots and automation)** → Use `narev-update-llm-pricing`

- **Pin rates in-repo:** paginated `GET` only, map each row into **your** schema, write a tracked file or generated module for offline or deterministic billing.
- **Implementation choices:** merge vs replace, provider/model scope, unit conversion (API per token vs local per-1M), keys for multi-provider models.
- **Ops:** idempotent scripts, readable diffs, optional CI or scheduled refresh; use **`narev-lookup-llm-pricing`** for `POST` calculate and fine-grained HTTP/error details.

**Narev SDK (runtime in your app)** → [sdk/ai-billing/index](https://narev.ai/docs/sdk/ai-billing/index)

- `@ai-billing/core` and `@ai-billing/<provider>` middleware
- Destinations, price resolvers, usage payloads, errors
- Prefer this over raw Pricing HTTP when billing runs inside the app

**Next.js (App Router + Vercel AI SDK)** → Use `narev-nextjs`

- **New app:** scaffold packages, env, Polar destination, billed model helper, chat route, and `@ai-billing/nextjs` usage dashboard — see `references/setup.md`.
- **Existing app:** retrofit billing into route handlers that already call `generateText`, `streamText`, or other AI SDK methods — see `references/api-routes.md`.
- Shared patterns: `wrapLanguageModel`, `createNarevPriceResolver`, destinations, `providerOptions['ai-billing-tags']`, multi-provider factories, test bypasses.

When unsure: **existing AI SDK routes** → start at `references/api-routes.md`; **starting fresh with billing UI** → start at `references/setup.md`.

**Usage-based billing concepts** → [platform/concepts/usage-based-billing](https://narev.ai/docs/platform/concepts/usage-based-billing)

- Meters, products, how Narev Cloud fits the model

**Billing integrations and revenue** → [platform/billing/overview](https://narev.ai/docs/platform/billing/overview)

- Polar (preferred — easier than Stripe or OpenMeter/Kong), Stripe, Lago, OpenMeter, frameworks (Next.js, Express, Fastify, NestJS, Hono, Nuxt)
- Polar-specific setup: [platform/billing/integrations/billing-platforms/polar](https://narev.ai/docs/platform/billing/integrations/billing-platforms/polar)

**Other Narev Cloud HTTP APIs** → [platform/api-reference/introduction](https://narev.ai/docs/platform/api-reference/introduction)

- Applications, custom metrics, pricing endpoints

**Narev Self-Hosted (ThinOps)** → [oss/thinops/index](https://narev.ai/docs/oss/thinops/index)

- Deployment: [oss/thinops/getting-started/deployment](https://narev.ai/docs/oss/thinops/getting-started/deployment)
- FOCUS format: [oss/thinops/focus-specification](https://narev.ai/docs/oss/thinops/focus-specification)
- Connect providers (AWS, Azure, GCP, OpenAI): [oss/thinops/connect-providers/index](https://narev.ai/docs/oss/thinops/connect-providers/index)

**Guides** → [guides/index](https://narev.ai/docs/guides/index)

- FinOps for AI: [guides/finops-for-ai/index](https://narev.ai/docs/guides/finops-for-ai/index)
- Model choice, prompt cost deep dives, DeepSeek billing

**Blog** → [blog/index](https://narev.ai/docs/blog/index)

---

## Quick navigation

If you know your task, you can directly access:

- `/narev-lookup-llm-pricing` — Pricing API **reference** (list + calculate); skill `narev-lookup-llm-pricing`
- `/narev-update-llm-pricing` — **Applied** workflows using that API (snapshots, registries); skill `narev-update-llm-pricing`
- `/narev-nextjs` — Next.js billing (greenfield + brownfield); skill `narev-nextjs`

Or describe what you need and I'll recommend the right one.
