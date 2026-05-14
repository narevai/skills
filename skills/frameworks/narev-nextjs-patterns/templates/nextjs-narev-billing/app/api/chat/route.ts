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
  });

  return result.toUIMessageStreamResponse();
}
