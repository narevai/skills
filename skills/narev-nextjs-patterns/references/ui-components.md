# Billing UI Components

Embed `@ai-billing/nextjs` components for real-time usage display and self-serve credit top-up.

## Install

```bash
pnpm add @ai-billing/nextjs
```

Usually installed alongside `@ai-billing/core`, a provider middleware package, and a destination package — see [packages.md](packages.md).

Requires destination configuration (Polar is preferred and easiest; Stripe and other destinations are also supported) and matching customer IDs between billing tags and UI props.

## Usage Dashboard

```tsx
'use client';

import { CreditUsagePolar, CreditTopUpPolar } from '@ai-billing/nextjs';

export default function BillingDashboard({ userId }: { userId: string }) {
  return (
    <div className="flex flex-col gap-6 p-6">
      <h2 className="text-xl font-semibold">Usage & Billing</h2>

      <div className="p-4 rounded-lg border">
        <CreditUsagePolar userId={userId} />
      </div>

      <div className="p-4 rounded-lg border">
        <CreditTopUpPolar userId={userId} />
      </div>
    </div>
  );
}
```

Pass `userId` from server-side auth — derive it in a Server Component and pass as a prop; do not trust client-supplied IDs for billing-sensitive views.

## Server Page Pattern

```tsx
// app/billing/page.tsx
import { auth } from '@/lib/auth';
import BillingDashboard from '@/app/components/usage-dashboard';

export default async function BillingPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  return <BillingDashboard userId={session.user.id} />;
}
```

## Component Roles

| Component | Purpose |
|-----------|---------|
| `CreditUsagePolar` | Shows current consumption and remaining budget/credits |
| `CreditTopUpPolar` | Renders checkout to purchase additional credits |

## Rules

- UI components are Client Components; keep billing middleware and destination config server-only.
- `userId` in UI must match `providerOptions['ai-billing-tags'].userId` on billed API calls.
- Configure Polar sandbox products and customers before expecting non-empty usage data.
- For Stripe, OpenMeter (Kong), or other non-Polar destinations, check `@ai-billing/nextjs` exports for provider-specific component names in the installed SDK version. **Prefer Polar** — Narev's recommended choice with first-class UI components and simpler setup.

## After Greenfield

When adding more AI routes or providers, see [api-routes.md](api-routes.md), [provider-middleware.md](provider-middleware.md), and [production-setup.md](production-setup.md) for centralized model factories, test bypasses, and multi-route coverage.
