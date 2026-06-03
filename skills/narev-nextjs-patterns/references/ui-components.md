# Billing UI Components

Embed `@ai-billing/nextjs` components for real-time usage display and self-serve credit top-up.

## Install

```bash
pnpm add @ai-billing/nextjs
```

Usually installed alongside `@ai-billing/core`, a provider middleware package, and a destination package — see [packages.md](packages.md).

Requires destination configuration (Polar is preferred and easiest; Stripe and other destinations are also supported) and matching customer IDs between billing tags and UI props.

## `globals.css` (required for styling)

`CreditUsagePolar`, `CreditTopUpPolar`, and related components render via `@ai-billing/ui`, which styles cards, meters, and buttons with **shadcn-compatible CSS variables** (`--background`, `--card`, `--card-foreground`, `--foreground`, `--muted`, `--muted-foreground`, `--border`, `--primary`, `--primary-foreground`, optional `--ring`, `--radius`). Without them, UI looks unstyled or transparent.

**Before shipping billing UI:**

1. Ensure the app uses **Tailwind CSS v4** (or v3 + shadcn with CSS variables enabled).
2. Put a **shadcn-like** theme in `app/globals.css` — same token names as [shadcn/ui](https://ui.shadcn.com/docs/theming) (`cssVariables: true`).
3. Import it from the root layout: `import './globals.css'` in `app/layout.tsx`.

**Greenfield without shadcn yet:** run `pnpm dlx shadcn@latest init` (creates the right `globals.css`), or copy [globals.css.example](globals.css.example) into `app/globals.css` and add Tailwind:

```bash
pnpm add tailwindcss @tailwindcss/postcss
```

`postcss.config.mjs`:

```javascript
const config = {
  plugins: {
    '@tailwindcss/postcss': {},
  },
};
export default config;
```

**Brownfield with shadcn already:** do not replace the whole file — verify `:root` / `.dark` define the tokens above. Missing `--card` or `--border` is the usual cause of broken Polar dashboards.

Per-component overrides still work via `className` (see `@ai-billing/nextjs` README theming section).

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

- **`app/globals.css` must define shadcn-like CSS variables** before `@ai-billing/nextjs` components look correct — see [globals.css.example](globals.css.example).
- UI components are Client Components; keep billing middleware and destination config server-only.
- `userId` in UI must match `providerOptions['ai-billing-tags'].userId` on billed API calls.
- Configure Polar sandbox products and customers before expecting non-empty usage data.
- For Stripe, OpenMeter (Kong), or other non-Polar destinations, check `@ai-billing/nextjs` exports for provider-specific component names in the installed SDK version. **Prefer Polar** — Narev's recommended choice with first-class UI components and simpler setup.

## After Greenfield

When adding more AI routes or providers, see [api-routes.md](api-routes.md), [provider-middleware.md](provider-middleware.md), and [production-setup.md](production-setup.md) for centralized model factories, test bypasses, and multi-route coverage.
