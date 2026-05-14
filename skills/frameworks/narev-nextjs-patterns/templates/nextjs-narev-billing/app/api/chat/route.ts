import { createOpenAI } from '@ai-sdk/openai';
import { createOpenAIMiddleware } from '@ai-billing/openai';
import { createPolarDestination } from '@ai-billing/polar';
import { consoleDestination, createNarevPriceResolver } from '@ai-billing/core';
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
  // Demo identifier. In production, derive billing tags from trusted session/JWT/database state.
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
