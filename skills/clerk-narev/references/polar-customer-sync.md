# Polar Customer Sync from Clerk

How to provision a Polar customer when a user signs up via Clerk, and how the billing destination maps usage back to that customer.

## The Mapping

```
Clerk userId  ──────────────────────────────────────────────────────┐
                                                                     ▼
polar.customers.create({ externalId: userId })        ← onboarding page

createPolarDestination({ externalCustomerIdKey: 'userId' })   ← lib/billing.ts
        ▲
        └── providerOptions['ai-billing-tags'].userId          ← every billed call
```

Polar looks up the customer by matching the `externalCustomerIdKey` tag value against the stored `externalId`. If they match, usage is attributed to that customer.

## Polar Client

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
    // Customer may already exist on retry — safe to ignore
  }
}
```

## Onboarding Page

Triggered by `afterSignUpUrl="/onboarding"` on the `<SignUp />` component:

```tsx
// app/sign-up/[[...sign-up]]/page.tsx
import { SignUp } from '@clerk/nextjs';

export default function SignUpPage() {
  return <SignUp afterSignUpUrl="/onboarding" />;
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

## Polar Destination Wiring

```typescript
// lib/billing.ts
import { createPolarDestination } from '@ai-billing/polar';

const destination = createPolarDestination({
  accessToken: process.env.POLAR_ACCESS_TOKEN!,
  server: (process.env.POLAR_SERVER ?? 'sandbox') as 'sandbox' | 'production',
  externalCustomerIdKey: 'userId',   // must match the tag key used in providerOptions
});
```

The `externalCustomerIdKey` must exactly match the key in `providerOptions['ai-billing-tags']`. If you use `userId` as the tag key, this must be `'userId'`.

## Sandbox vs Production

| Environment | `POLAR_SERVER` | Dashboard |
|-------------|---------------|-----------|
| Development | `sandbox` | sandbox.polar.sh |
| Production | `production` | polar.sh |

Never use production credentials in development. The Polar sandbox is fully isolated.

## Webhook Alternative

If the onboarding-page pattern doesn't fit your flow (e.g. SSO sign-in that skips onboarding), use a Clerk webhook instead. See `clerk-webhooks` skill for the setup. Handle the `user.created` event:

```typescript
// app/api/webhooks/clerk/route.ts
import { verifyWebhook } from '@clerk/nextjs/webhooks';
import { createPolarCustomer } from '@/lib/polar-client';

export async function POST(req: Request) {
  const evt = await verifyWebhook(req);

  if (evt.type === 'user.created') {
    const email = evt.data.email_addresses[0]?.email_address;
    const userId = evt.data.id;

    if (email && userId) {
      await createPolarCustomer(email, userId);
    }
  }

  return new Response('OK', { status: 200 });
}
```

Requires `CLERK_WEBHOOK_SIGNING_SECRET` in env vars.

## Verification

1. Sign up a new user → check Polar sandbox dashboard → Customers → verify `externalId` matches the Clerk `userId` from Dashboard → Users.
2. Send a chat message as that user → check Polar → Usage / Events → usage event should appear attributed to the customer.
3. If usage appears as "anonymous" or unattributed: verify `externalCustomerIdKey` matches the tag key exactly.
