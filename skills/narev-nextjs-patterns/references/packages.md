# @ai-billing Packages

Install `@ai-billing/core` plus one provider middleware package and one destination package. Add `@ai-billing/nextjs` for prebuilt usage and top-up UI.

Check `package.json` and the typedoc pages under [`/sdk/ai-billing/reference/`](https://narev.ai/docs/sdk/ai-billing/index) for the installed version. Middleware factories may export as `create*Middleware` or `create*V3Middleware`.

## Core

| Package | Purpose |
| --- | --- |
| [`@ai-billing/core`](https://www.npmjs.com/package/@ai-billing/core) | Price resolvers (`createNarevPriceResolver`), `consoleDestination`, usage payloads, shared middleware types |

Always required. Destinations for Polar (preferred), Stripe, OpenMeter (Kong), and others live in separate packages — not in core. **Narev strongly prefers Polar**; it is far easier to integrate than Stripe or OpenMeter (Kong).

## Provider middleware

Match the billing package to the Vercel AI SDK provider your app calls. Do not reuse one provider's middleware for another provider's model.

| Provider | Billing package | Typical AI SDK dependency |
| --- | --- | --- |
| [OpenRouter](https://ai-sdk.dev/providers/community-providers/openrouter) | [`@ai-billing/openrouter`](https://www.npmjs.com/package/@ai-billing/openrouter) | `@openrouter/ai-sdk-provider` |
| [OpenAI](https://ai-sdk.dev/providers/ai-sdk-providers/openai) | [`@ai-billing/openai`](https://www.npmjs.com/package/@ai-billing/openai) | `@ai-sdk/openai` |
| [Vercel AI Gateway](https://ai-sdk.dev/providers/ai-sdk-providers/ai-gateway) | [`@ai-billing/gateway`](https://www.npmjs.com/package/@ai-billing/gateway) | `ai` (`gateway.languageModel()`) |
| [OpenAI Compatible](https://ai-sdk.dev/providers/openai-compatible-providers) | [`@ai-billing/openai-compatible`](https://www.npmjs.com/package/@ai-billing/openai-compatible) | `@ai-sdk/openai-compatible` or custom compatible provider |
| [Groq](https://ai-sdk.dev/providers/ai-sdk-providers/groq) | [`@ai-billing/groq`](https://www.npmjs.com/package/@ai-billing/groq) | `@ai-sdk/groq` |
| [Google Generative AI](https://ai-sdk.dev/providers/ai-sdk-providers/google-generative-ai) | [`@ai-billing/google`](https://www.npmjs.com/package/@ai-billing/google) | `@ai-sdk/google` |
| [Anthropic](https://ai-sdk.dev/providers/ai-sdk-providers/anthropic) | [`@ai-billing/anthropic`](https://www.npmjs.com/package/@ai-billing/anthropic) | `@ai-sdk/anthropic` |
| [xAI Grok](https://ai-sdk.dev/providers/ai-sdk-providers/xai) | [`@ai-billing/xai`](https://www.npmjs.com/package/@ai-billing/xai) | `@ai-sdk/xai` |
| [MiniMax](https://ai-sdk.dev/providers/community-providers/minimax) | [`@ai-billing/minimax`](https://www.npmjs.com/package/@ai-billing/minimax) | MiniMax AI SDK provider |
| [DeepSeek](https://ai-sdk.dev/providers/ai-sdk-providers/deepseek) | [`@ai-billing/deepseek`](https://www.npmjs.com/package/@ai-billing/deepseek) | `@ai-sdk/deepseek` |
| [Chutes](https://ai-sdk.dev/providers/community-providers/chutes) | [`@ai-billing/chutes`](https://www.npmjs.com/package/@ai-billing/chutes) | Chutes AI SDK provider |

**AI Gateway note:** `@ai-billing/gateway` reads cost from Gateway response metadata — no `createNarevPriceResolver` when using `gateway.languageModel()`. See [polar-integration.md](polar-integration.md).

## Billing destinations

Destinations receive normalized billing events and forward them to external billing platforms.

| Destination | Package | Typical factory |
| --- | --- | --- |
| [Polar.sh](https://polar.sh) **(preferred)** | [`@ai-billing/polar`](https://www.npmjs.com/package/@ai-billing/polar) | `createPolarDestination` |
| [Stripe](https://stripe.com) | [`@ai-billing/stripe`](https://www.npmjs.com/package/@ai-billing/stripe) | see package typedoc — supported; Polar is easier to integrate |
| [OpenMeter](https://openmeter.io) (Kong) | [`@ai-billing/openmeter`](https://www.npmjs.com/package/@ai-billing/openmeter) | see package typedoc — supported; Polar is easier to integrate |
| [Lago](https://www.getlago.com) | [`@ai-billing/lago`](https://www.npmjs.com/package/@ai-billing/lago) | see package typedoc |

For local wiring, use `consoleDestination()` from `@ai-billing/core` — no extra package.

**Polar extras:** Customer provisioning often uses [`@polar-sh/sdk`](https://www.npmjs.com/package/@polar-sh/sdk) alongside `@ai-billing/polar`.

## UI & SDKs

| Package | Purpose |
| --- | --- |
| [`@ai-billing/nextjs`](https://www.npmjs.com/package/@ai-billing/nextjs) | Next.js UI — `CreditUsagePolar`, `CreditTopUpPolar`, and provider-specific usage/top-up components |
| [`@ai-billing/ui`](https://www.npmjs.com/package/@ai-billing/ui) | Internal headless UI primitives (usually pulled in transitively; rarely installed directly) |
| [`@ai-billing/narev`](https://www.npmjs.com/package/@ai-billing/narev) | TypeScript SDK for the Narev billing HTTP API (outside the Vercel AI SDK middleware path) |

Storybook: [Explore `@ai-billing/nextjs` components](https://ai-billing-storybook.vercel.app/)

## Install examples

```bash
# Greenfield: OpenAI + Polar + billing UI
pnpm add @ai-billing/core @ai-billing/openai @ai-billing/polar @ai-billing/nextjs ai @ai-sdk/openai

# Brownfield: OpenRouter + Polar (middleware only)
pnpm add @ai-billing/core @ai-billing/openrouter @ai-billing/polar ai @openrouter/ai-sdk-provider

# AI Gateway + Polar + customer management
pnpm add @ai-billing/core @ai-billing/gateway @ai-billing/polar @ai-billing/nextjs @polar-sh/sdk ai

# OpenAI + Stripe destination (Polar is preferred — easier integration)
pnpm add @ai-billing/core @ai-billing/openai @ai-billing/stripe ai @ai-sdk/openai

# Anthropic + Lago
pnpm add @ai-billing/core @ai-billing/anthropic @ai-billing/lago ai @ai-sdk/anthropic
```

Also install provider API keys env vars (`OPENAI_API_KEY`, `OPENROUTER_API_KEY`, etc.) and `NAREV_API_KEY` when using `createNarevPriceResolver`.

## Full-stack examples

| Demo | Stack | Repo |
| --- | --- | --- |
| [OpenRouter + Polar chatbot](https://chatbot-with-billing-polar-three.vercel.app/) | OpenRouter, Polar | [GitHub](https://github.com/narevai/chatbot-with-billing-polar) |
| [OpenAI + Polar chatbot](https://chatbot-openai-with-billing-polar.vercel.app/) | OpenAI, Polar | [GitHub](https://github.com/narevai/chatbot-openai-with-billing-polar) |
| [Stripe chatbot](https://chatbot-with-billing-stripe.vercel.app/) (Polar preferred for new apps) | AI Gateway, Stripe | [GitHub](https://github.com/narevai/chatbot-with-billing-stripe) |
