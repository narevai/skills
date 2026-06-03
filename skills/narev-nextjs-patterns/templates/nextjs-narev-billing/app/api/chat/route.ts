import { createOpenAI } from '@ai-sdk/openai';
import { createOpenAIMiddleware } from '@ai-billing/openai';
import { createPolarDestination } from '@ai-billing/polar';
import { consoleDestination } from '@ai-billing/core';
import { createNarevPriceResolver } from '@ai-billing/narev';
import { convertToModelMessages, streamText, type UIMessage, wrapLanguageModel } from 'ai';

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const billingMiddleware = createOpenAIMiddleware({
  destinations: [
    consoleDestination(),
    ...(process.env.POLAR_ACCESS_TOKEN
      ? [
          createPolarDestination({
            accessToken: process.env.POLAR_ACCESS_TOKEN,
            server: process.env.POLAR_SERVER === 'production' ? 'production' : 'sandbox',
            eventName: 'llm_usage',
            externalCustomerIdKey: 'userId',
          }),
        ]
      : []),
  ],
  priceResolver: createNarevPriceResolver({
    apiKey: process.env.NAREV_API_KEY ?? '',
  }),
});

export async function POST(request: Request) {
  const body = (await request.json()) as {
    messages: UIMessage[];
  };

  const modelId = 'gpt-4o';
  // REQUIRED: userId on every billed call — session id or stable anonymous_user_* for guests.
  const userId = 'demo-user';

  const result = streamText({
    model: wrapLanguageModel({
      model: openai(modelId),
      middleware: billingMiddleware,
    }),
    messages: await convertToModelMessages(body.messages),
    providerOptions: {
      'ai-billing-tags': {
        userId,
      },
    },
  });

  return result.toUIMessageStreamResponse();
}
