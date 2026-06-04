# Brownfield Setup: Clerk auth + billing for existing Vercel AI SDK apps

Use this path when you already have a Next.js app that calls `streamText` or `generateText` directly and want to add Clerk auth + Narev billing without replacing your route handlers or chat UI.

For Clerk-only setup details: [clerk-nextjs.md](clerk-nextjs.md).

## Step 1 — Add Clerk

```bash
clerk init --framework next -y
# or: npm install @clerk/nextjs + manual env setup
```

Then add `ClerkProvider` and `proxy.ts` — see [clerk-nextjs.md](clerk-nextjs.md).

## Step 2 — Install Billing

```bash
npm install @ai-billing/nextjs   # includes all middleware, Narev, Polar
npm install @polar-sh/sdk        # for polar.customers.create() in onboarding
```

Add to `.env.local`:
```bash
NAREV_API_KEY=narev_...
POLAR_ACCESS_TOKEN=polar_pat_...
POLAR_SERVER=sandbox
```

## Step 3 — Provision Polar Customer on Sign-Up

Add `afterSignUpUrl="/onboarding"` to your `<SignUp />` component, then create the onboarding page:

```tsx
// app/onboarding/page.tsx
import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { Polar } from '@polar-sh/sdk';

async function createPolarCustomer(email: string, userId: string) {
  const accessToken = process.env.POLAR_ACCESS_TOKEN;
  if (!accessToken) return;
  const polar = new Polar({
    accessToken,
    server: (process.env.POLAR_SERVER ?? 'sandbox') as 'sandbox' | 'production',
  });
  try {
    await polar.customers.create({ email, externalId: userId });
  } catch { /* already exists — safe to ignore */ }
}

export default async function OnboardingPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-up');

  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress;
  if (email) await createPolarCustomer(email, userId);

  redirect('/');
}
```

## Step 4 — Wrap Your AI Model

Replace your existing model instantiation with a billed factory from `@ai-billing/nextjs/server`. The factory reads env vars automatically — no manual wiring of price resolver or Polar destination:

```typescript
// Before
import { openai } from '@ai-sdk/openai';
const model = openai('gpt-4o-mini');

// After
import { createOpenAIWithBilling } from '@ai-billing/nextjs/server';
const model = createOpenAIWithBilling('gpt-4o-mini');
```

Available factories:

| Provider | Factory | API key env var |
|----------|---------|----------------|
| OpenAI | `createOpenAIWithBilling` | `OPENAI_API_KEY` |
| Anthropic | `createAnthropicWithBilling` | `ANTHROPIC_API_KEY` |
| Google | `createGoogleWithBilling` | `GOOGLE_AI_STUDIO_KEY` |
| DeepSeek | `createDeepSeekWithBilling` | `DEEPSEEK_API_KEY` |
| Groq | `createGroqWithBilling` | `GROQ_API_KEY` |
| xAI | `createXaiWithBilling` | `XAI_API_KEY` |
| OpenRouter | `createOpenRouterWithBilling` | `OPENROUTER_API_KEY` |
| Vercel AI Gateway | `createGatewayWithBilling` | `AI_GATEWAY_API_KEY` |

## Step 5 — Forward userId to Billing Tags

In every route handler that calls `streamText` / `generateText`, read `userId` from Clerk and pass it as a billing tag:

```typescript
// app/api/chat/route.ts
import { auth } from '@clerk/nextjs/server';
import { streamText } from 'ai';
import { createOpenAIWithBilling } from '@ai-billing/nextjs/server';

const billedModel = createOpenAIWithBilling('gpt-4o-mini');

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return new Response('Unauthorized', { status: 401 });

  const { messages } = await req.json();

  const result = streamText({
    model: billedModel,
    messages,
    providerOptions: {
      'ai-billing-tags': { userId },   // required — maps usage to Polar customer
    },
  });

  return result.toDataStreamResponse();
}
```

`userId` must be present on every billed call. See [auth-bridge.md](auth-bridge.md) for Server Actions and Server Component patterns.

## Step 6 — Usage UI (Optional)

```tsx
// app/usage/page.tsx
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { CreditUsagePolar, CreditTopUpPolar } from '@ai-billing/nextjs';

export default async function UsagePage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  return (
    <>
      <CreditUsagePolar userId={userId} />
      <CreditTopUpPolar userId={userId} />
    </>
  );
}
```

Requires shadcn CSS tokens in `globals.css` — see `narev-nextjs-patterns` → `references/globals.css.example`.

## Verification

- [ ] Sign up → `/onboarding` → Polar customer appears in sandbox dashboard with `externalId` matching Clerk `userId`
- [ ] Send request to your AI route → usage event appears in Polar metered usage
- [ ] Request without auth → 401 returned
- [ ] `/usage` page shows credit balance
