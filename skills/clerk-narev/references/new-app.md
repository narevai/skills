# Greenfield Setup: Clerk + Narev Billing from Zero

Complete walkthrough for a new Next.js App Router app with Clerk auth and Narev/Polar billing.

For Clerk-only details (CLI options, keyless mode, protected routes, shadcn theme): [clerk-nextjs.md](clerk-nextjs.md).

## Step 1 — Provision Clerk

```bash
clerk init --framework next -y
```

This creates the Clerk app, writes `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` to `.env.local`, and installs `@clerk/nextjs`.

If `clerk` CLI is not available, get keys from [dashboard.clerk.com](https://dashboard.clerk.com/~/api-keys) and set them manually in `.env.local`.

## Step 2 — Install Billing Packages

```bash
# Billing — includes all middleware, Narev resolver, and Polar destination
npm install @ai-billing/nextjs

# AI SDK + provider (pick one)
npm install ai @ai-sdk/openai       # or @ai-sdk/anthropic, @ai-sdk/google, etc.

# Polar SDK — only needed for polar.customers.create() in onboarding
npm install @polar-sh/sdk
```

No need to install `@ai-billing/core`, `@ai-billing/polar`, `@ai-billing/narev`, or `@ai-billing/openai` separately — they are all included in `@ai-billing/nextjs`.

Add to `.env.local`:
```bash
NAREV_API_KEY=narev_...
POLAR_ACCESS_TOKEN=polar_pat_...
POLAR_SERVER=sandbox
OPENAI_API_KEY=sk-...   # or ANTHROPIC_API_KEY, GOOGLE_AI_STUDIO_KEY, etc.
```

## Step 3 — Add ClerkProvider

```tsx
// app/layout.tsx
import { ClerkProvider } from '@clerk/nextjs';
import './globals.css';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ClerkProvider signInUrl="/sign-in" signUpUrl="/sign-up">
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}
```

## Step 4 — Clerk Middleware

```typescript
// proxy.ts  (Next.js 15+; use middleware.ts for Next.js ≤15)
import { clerkMiddleware } from '@clerk/nextjs/server';

export default clerkMiddleware();

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
```

## Step 5 — Sign-In / Sign-Up Routes

```tsx
// app/sign-in/[[...sign-in]]/page.tsx
import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <SignIn />
    </div>
  );
}
```

```tsx
// app/sign-up/[[...sign-up]]/page.tsx
import { SignUp } from '@clerk/nextjs';

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <SignUp afterSignUpUrl="/onboarding" />
    </div>
  );
}
```

`afterSignUpUrl="/onboarding"` is required — it triggers Polar customer creation after sign-up.

## Step 6 — Polar Client + Onboarding

```typescript
// lib/polar-client.ts
import { Polar } from '@polar-sh/sdk';

function getPolarClient(): Polar | null {
  const accessToken = process.env.POLAR_ACCESS_TOKEN;
  if (!accessToken) return null;

  const server = (process.env.POLAR_SERVER ?? 'sandbox') as 'sandbox' | 'production';
  return new Polar({ accessToken, server });
}

export async function createPolarCustomer(email: string, userId: string): Promise<void> {
  const polar = getPolarClient();
  if (!polar) return;

  try {
    await polar.customers.create({ email, externalId: userId });
  } catch {
    // Customer may already exist — safe to ignore
  }
}
```

```tsx
// app/onboarding/page.tsx
import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { createPolarCustomer } from '@/lib/polar-client';

export default async function OnboardingPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-up');

  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress;
  if (email) {
    await createPolarCustomer(email, userId);
  }

  redirect('/');
}
```

## Step 7 — Billing Setup

`@ai-billing/nextjs` ships a built-in `streamChat` Server Action — no custom API route needed for chat. Register tools once at module level:

```typescript
// instrumentation.ts  (Next.js instrumentation hook — runs before any request)
export async function register() {
  const { configureChatTools } = await import('@ai-billing/nextjs/server');
  configureChatTools({ tools: {}, maxSteps: 5 });
}
```

**Multi-provider** — just add API keys to `.env.local`. Every provider whose key is present is automatically available:

```bash
# .env.local — add whichever providers you want
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_AI_STUDIO_KEY=...
DEEPSEEK_API_KEY=...
GROQ_API_KEY=...
```

No code changes when adding providers — the router discovers them from env vars automatically.

## Step 8 — Chat Component

No custom API route needed — `useChat` calls the built-in `streamChat` Server Action. Pass `userId` from a parent Server Component (never call `auth()` in client code):

```tsx
// app/chat/page.tsx  (Server Component)
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { ChatShell } from '@/components/chat-shell';

export default async function ChatPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  return <ChatShell userId={userId} />;
}
```

```tsx
// components/chat-shell.tsx  (Client Component)
'use client';
import { useChat } from '@ai-billing/nextjs';

export function ChatShell({ userId }: { userId: string }) {
  const { messages, submit, stop, selectedModel, onModelSelect, costs, status } =
    useChat({
      userId,                              // Clerk userId → billing tag
      defaultModel: 'openai:gpt-4o-mini', // 'provider:modelId'
      tags: { userId },
    });

  return (
    <div>
      {messages.map(m => (
        <div key={m.id}>{/* render message parts */}</div>
      ))}
      <button onClick={() => submit('Hello')}>Send</button>
    </div>
  );
}
```

Model IDs use `'provider:modelId'` format — every provider with a key in env is available. `onModelSelect` wires to any model-picker UI.

## Step 9 — Usage UI

```tsx
// app/usage/page.tsx
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { CreditUsagePolar, CreditTopUpPolar } from '@ai-billing/nextjs';

export default async function UsagePage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  return (
    <div className="mx-auto max-w-2xl p-8 space-y-6">
      <h1 className="text-2xl font-bold">Usage</h1>
      <CreditUsagePolar userId={userId} />
      <CreditTopUpPolar userId={userId} />
    </div>
  );
}
```

`CreditUsagePolar` and `CreditTopUpPolar` require shadcn-like CSS custom properties in `app/globals.css`. See `narev-nextjs-patterns` → `references/globals.css.example` for the full token set.

## Verification Checklist

- [ ] Sign up → redirects to `/onboarding` → Polar customer visible in sandbox dashboard with correct `externalId`
- [ ] Send a chat message → usage event appears in Polar dashboard metered usage
- [ ] `/usage` page shows credit balance and top-up button
- [ ] API route returns 401 when signed out
- [ ] No `CLERK_SECRET_KEY` or `NAREV_API_KEY` in client bundle (`next build` → check chunk output)
