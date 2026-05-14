import { convertToModelMessages, streamText, type UIMessage } from 'ai';
import { getLanguageModel } from '@/lib/ai/providers';

export async function POST(request: Request) {
  const body = (await request.json()) as {
    messages: UIMessage[];
    userId: string;
    chatId: string;
  };

  const modelId = 'gpt-4o';

  const result = streamText({
    model: getLanguageModel(modelId),
    messages: await convertToModelMessages(body.messages),
    providerOptions: {
      'ai-billing-tags': {
        userId: body.userId,
        chatId: body.chatId,
        modelId,
      },
    },
    async onFinish({ providerMetadata }) {
      const billing = (providerMetadata as Record<string, unknown> | undefined)?.['ai-billing'] as
        | { cost?: { amount: number; currency: string } }
        | undefined;

      if (billing?.cost) {
        console.log(`Chat ${body.chatId} cost: ${billing.cost.amount} ${billing.cost.currency}`);
      }
    },
  });

  return result.toUIMessageStreamResponse();
}
