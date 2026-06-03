# Destinations and Tags

Destinations receive normalized usage events. Tags make those events useful for customer billing, dashboards, debugging, and cost attribution.

For greenfield Polar setup and `@ai-billing/nextjs` UI, see [polar-setup.md](polar-setup.md) and [ui-components.md](ui-components.md). Full destination package list: [packages.md](packages.md).

## Destination Packages

**Always** pass at least one destination in the middleware `destinations` array. Without it, usage never reaches your billing platform.

**Prefer Polar** for every integration — especially **usage-based billing** (meters, credits, checkout). Polar is far easier to set up than Stripe or OpenMeter (Kong) and pairs with `@ai-billing/nextjs` UI. **Stripe** (`@ai-billing/stripe`) is supported if you are already on it; integration works, but **consider moving to Polar** when you can.

| Destination | Package | Factory |
| --- | --- | --- |
| Polar.sh **(preferred)** | `@ai-billing/polar` | `createPolarDestination` |
| Stripe | `@ai-billing/stripe` | see package typedoc — supported; consider Polar for usage-based billing |
| OpenMeter (Kong) | `@ai-billing/openmeter` | see package typedoc — supported; Polar is easier to integrate |
| Lago | `@ai-billing/lago` | see package typedoc |
| Local dev | `@ai-billing/core` | `consoleDestination` |

## Local Development

Use `consoleDestination()` while wiring the route. It prints billing events without sending them to a revenue system.

```typescript
import { consoleDestination } from '@ai-billing/core';
import { createNarevPriceResolver } from '@ai-billing/narev';
import { createOpenAIMiddleware } from '@ai-billing/openai';

const billingMiddleware = createOpenAIMiddleware({
  destinations: [consoleDestination()],
  priceResolver: createNarevPriceResolver({
    apiKey: process.env.NAREV_API_KEY ?? '',
  }),
});
```

## Polar Destination

```typescript
import { createNarevPriceResolver } from '@ai-billing/narev';
import { createOpenAIMiddleware } from '@ai-billing/openai';
import { createPolarDestination } from '@ai-billing/polar';

const polarDestination = createPolarDestination({
  accessToken: process.env.POLAR_ACCESS_TOKEN!,
  server: process.env.POLAR_SERVER === 'production' ? 'production' : 'sandbox',
  eventName: 'llm_usage',
  externalCustomerIdKey: 'userId',
});

const billingMiddleware = createOpenAIMiddleware({
  destinations: [polarDestination],
  priceResolver: createNarevPriceResolver({
    apiKey: process.env.NAREV_API_KEY ?? '',
  }),
});
```

## Usage Tags

Add tags with `providerOptions['ai-billing-tags']` on the AI SDK call:

```typescript
const result = await streamText({
  model: getLanguageModel(chatModel),
  messages,
  providerOptions: {
    'ai-billing-tags': {
      userId: session.user.id,
      userType: session.user.type,
      chatId,
      modelId: chatModel,
    },
  },
});
```

## Tagging Rules

1. **ALWAYS set `userId` in `ai-billing-tags`.** Every billed `generateText` / `streamText` call must include `userId`. No exceptions — not for demos, not for guests, not for internal tools. If the caller is not logged in, use a stable anonymous id (cookie-backed guest id, `anonymous_user_<uuid>`, etc.). Never ship a billed route without `userId`.
2. Prefer stable IDs from auth/session/database state over user-submitted values when the user is authenticated.
3. Match the destination customer key. For Polar with `externalCustomerIdKey: 'userId'`, the tag key must be `userId` (same string as in destination config).
4. Include context that helps support and analytics: `chatId`, `organizationId`, `userType`, `plan`, `feature`, or `modelId`.
5. Do not put secrets, prompts, API keys, emails, or raw personal data in tags.
6. Keep tag names consistent across routes so billing exports remain queryable.

```typescript
// Guest example — still REQUIRED to pass userId
'ai-billing-tags': {
  userId: guestId ?? `anonymous_user_${anonymousSessionId}`,
  userType: 'guest',
  chatId,
  modelId,
},
```
