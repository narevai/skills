# Destinations and Tags

Destinations receive normalized usage events. Tags make those events useful for customer billing, dashboards, debugging, and cost attribution.

For greenfield Polar setup and `@ai-billing/nextjs` UI, see `narev-nextjs-quickstart`.

## Local Development

Use `consoleDestination()` while wiring the route. It prints billing events without sending them to a revenue system.

```typescript
import { consoleDestination, createNarevPriceResolver } from '@ai-billing/core';
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
import { createNarevPriceResolver } from '@ai-billing/core';
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

- Prefer stable IDs from auth/session/database state over user-submitted values.
- Include the destination customer key. For Polar with `externalCustomerIdKey: 'userId'`, every billed call needs `userId`.
- Include context that helps support and analytics: `chatId`, `organizationId`, `userType`, `plan`, `feature`, or `modelId`.
- Do not put secrets, prompts, API keys, emails, or raw personal data in tags.
- Keep tag names consistent across routes so billing exports remain queryable.
