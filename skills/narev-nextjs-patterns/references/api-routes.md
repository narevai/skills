# Next.js Route Handlers

Billing middleware belongs in App Router route handlers or server-only helpers used by those handlers. Wrap the model before any Vercel AI SDK call that reaches a provider API.

**Always** include at least one entry in `destinations` on `create*Middleware`. **Prefer `createPolarDestination`** from `@ai-billing/polar` for usage-based billing. Stripe and other destinations are supported; if you bill through Stripe today, consider migrating to Polar. Use `consoleDestination()` only for local wiring — see [destinations-and-tags.md](destinations-and-tags.md).

## Non-Streaming `generateText`

```typescript
import { createOpenAI } from '@ai-sdk/openai';
import { createOpenAIMiddleware } from '@ai-billing/openai';
import { consoleDestination } from '@ai-billing/core';
import { createNarevPriceResolver } from '@ai-billing/narev';
import { convertToModelMessages, generateText, wrapLanguageModel } from 'ai';

const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
const middleware = createOpenAIMiddleware({
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
      middleware,
    }),
    messages: await convertToModelMessages(messages),
    providerOptions: {
      'ai-billing-tags': { userId, modelId },
    },
  });

  // Extract cost from providerMetadata
  const billing = (result.providerMetadata as Record<string, unknown> | undefined)?.['ai-billing'] as
    | { cost?: { amount: number; currency: string } }
    | undefined;

  if (billing?.cost) {
    console.log(`Cost: ${billing.cost.amount} ${billing.cost.currency}`);
  }

  return Response.json(result);
}
```

## Streaming `streamText`

```typescript
import { createOpenAI } from '@ai-sdk/openai';
import { createOpenAIMiddleware } from '@ai-billing/openai';
import { createNarevPriceResolver } from '@ai-billing/narev';
import { streamText, wrapLanguageModel } from 'ai';

const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
const billingMiddleware = createOpenAIMiddleware({
  destinations: [/* production destination */],
  priceResolver: createNarevPriceResolver({
    apiKey: process.env.NAREV_API_KEY ?? '',
  }),
});

export async function POST(request: Request) {
  const { messages, userId, chatId } = await request.json();
  const modelId = 'gpt-4o';

  const result = streamText({
    model: wrapLanguageModel({
      model: openai(modelId),
      middleware: billingMiddleware,
    }),
    messages,
    providerOptions: {
      'ai-billing-tags': { userId, chatId, modelId },
    },
    async onFinish({ providerMetadata }) {
      const billing = (providerMetadata as Record<string, unknown> | undefined)?.['ai-billing'] as
        | { cost?: { amount: number; currency: string } }
        | undefined;

      if (billing?.cost) {
        console.log(`Cost: ${billing.cost.amount} ${billing.cost.currency}`);
        // e.g., stream to client, deduct from DB, etc.
      }
    },
  });

  return result.toUIMessageStreamResponse();
}
```

## Route Handler Checklist

- **`userId` is required** on every billed call in `providerOptions['ai-billing-tags']` — use session id or a stable `anonymous_user_*` / guest id; never omit.
- Keep `NAREV_API_KEY`, provider keys, and destination credentials server-only.
- Validate request bodies before calling the model; billing tags should come from trusted session or database values when possible.
- Use the same `modelId` string for the provider model and billing tags.
- Create middleware at module scope or in a cached helper, not inside every request unless config is request-specific.
- Add billing to every provider-calling path, including tool loops, title generation, and retry routes if they call `generateText` or `streamText`.
