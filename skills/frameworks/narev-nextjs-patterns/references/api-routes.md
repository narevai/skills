# Next.js Route Handlers

Billing middleware belongs in App Router route handlers or server-only helpers used by those handlers. Wrap the model before any Vercel AI SDK call that reaches a provider API.

## Non-Streaming `generateText`

```typescript
import { createOpenAI } from '@ai-sdk/openai';
import { createOpenAIMiddleware } from '@ai-billing/openai';
import { consoleDestination, createNarevPriceResolver } from '@ai-billing/core';
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

  return Response.json(result);
}
```

## Streaming `streamText`

```typescript
import { createOpenAI } from '@ai-sdk/openai';
import { createOpenAIMiddleware } from '@ai-billing/openai';
import { createNarevPriceResolver } from '@ai-billing/core';
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
  });

  return result.toUIMessageStreamResponse();
}
```

## Route Handler Checklist

- Keep `NAREV_API_KEY`, provider keys, and destination credentials server-only.
- Validate request bodies before calling the model; billing tags should come from trusted session or database values when possible.
- Use the same `modelId` string for the provider model and billing tags.
- Create middleware at module scope or in a cached helper, not inside every request unless config is request-specific.
- Add billing to every provider-calling path, including tool loops, title generation, and retry routes if they call `generateText` or `streamText`.
