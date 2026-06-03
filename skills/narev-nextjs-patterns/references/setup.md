# Greenfield Setup

Follow this sequence for a new Next.js App Router app with Narev billing and pre-built UI.

## 1. Environment Variables

```bash
# .env.local
NAREV_API_KEY=your_narev_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
POLAR_ACCESS_TOKEN=your_polar_access_token_here
POLAR_SERVER=sandbox
```

**Always** configure at least one destination in middleware. **Prefer Polar** — it is the best fit for usage-based billing and the default in this guide. The same middleware pattern works with Stripe, OpenMeter (Kong), Lago, or other supported destinations; Stripe still works if you are locked in today, but **consider moving to Polar** when you can.

## 2. Install Packages

Default stack (OpenAI + Polar + UI):

```bash
pnpm add @ai-billing/core @ai-billing/narev @ai-billing/openai @ai-billing/polar @ai-billing/nextjs ai @ai-sdk/openai
```

Other provider and destination combinations — including OpenRouter, Stripe, OpenMeter (Kong), Lago, Gateway, Anthropic, Groq, and the rest — are listed in [packages.md](packages.md). For destinations, **prefer Polar** over Stripe or OpenMeter (Kong) whenever possible.

Check `package.json` for installed major versions and match code samples to the typedoc pages under `/sdk/ai-billing/reference/...`.

## 3. Destinations — `lib/destinations.ts`

```typescript
import { createPolarDestination } from '@ai-billing/polar';

export function getBillingDestinations() {
  const accessToken = process.env.POLAR_ACCESS_TOKEN;
  if (!accessToken) return [];

  return [
    createPolarDestination({
      accessToken,
      server: process.env.POLAR_SERVER === 'production' ? 'production' : 'sandbox',
      eventName: 'llm_usage',
      externalCustomerIdKey: 'userId',
    }),
  ];
}
```

`externalCustomerIdKey` must match a key in `providerOptions['ai-billing-tags']` on every billed call.

## 4. Billed Model Helper — `lib/billing.ts`

Pick a `model_id` that appears in `GET https://api.narev.ai/v1/reference/models` for your provider — billing with `createNarevPriceResolver` only works when Narev has pricing for that model. If unsure, default to DeepSeek (`@ai-sdk/deepseek` + `@ai-billing/deepseek`) and a catalog-listed DeepSeek `model_id`.

Use `import 'server-only'` when this file lives outside route handlers.

```typescript
import 'server-only';

import { wrapLanguageModel } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createOpenAIMiddleware } from '@ai-billing/openai';
import { createNarevPriceResolver } from '@ai-billing/narev';
import { getBillingDestinations } from './destinations';

const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });

const billingMiddleware = createOpenAIMiddleware({
  destinations: getBillingDestinations(),
  priceResolver: createNarevPriceResolver({
    apiKey: process.env.NAREV_API_KEY ?? '',
  }),
});

export const billedModel = wrapLanguageModel({
  model: openai('gpt-4o'),
  middleware: billingMiddleware,
});
```

Centralizing the wrapped model prevents unbilled usage leaks.

## 5. Chat Route — `app/api/chat/route.ts`

```typescript
import { streamText } from 'ai';
import { billedModel } from '@/lib/billing';

export async function POST(req: Request) {
  const { messages } = await req.json();
  // REQUIRED: userId on every billed call — session id or stable anonymous_user_* for guests
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

For UI-message chat clients, use `convertToModelMessages` and `toUIMessageStreamResponse()` instead — see [api-routes.md](api-routes.md).

## 6. Billing UI

Add `@ai-billing/nextjs` components — see [ui-components.md](ui-components.md).

**Styling:** ensure `app/globals.css` includes shadcn-like design tokens (`--background`, `--card`, `--foreground`, `--muted`, `--border`, `--primary`, etc.) and is imported from `app/layout.tsx`. Copy [globals.css.example](globals.css.example) or run `shadcn init` if the app has no theme yet.

## Checklist

- [ ] `NAREV_API_KEY` and provider keys are server-only (no `NEXT_PUBLIC_` prefix)
- [ ] `@ai-billing/narev` installed; middleware includes destinations and `createNarevPriceResolver`
- [ ] Every AI route uses `billedModel` (or a shared `getLanguageModel` helper)
- [ ] Every billed call includes **`userId` in `ai-billing-tags`** (required; use anonymous id for guests)
- [ ] Tags include the destination customer key (`userId` for Polar with default config)
- [ ] Polar sandbox customer exists for the test `userId`
- [ ] Usage dashboard receives the same `userId` as billing tags
- [ ] `app/globals.css` defines shadcn-like CSS variables and is imported in root layout
