# Clerk Setup for Next.js

Self-contained reference for adding Clerk authentication to a Next.js App Router project. Extracted from `clerk-setup` and `clerk-nextjs-patterns` so this skill works without those dependencies.

**Principle: use Clerk's prebuilt components everywhere.** You do not write sign-in forms, sign-up forms, or user profile UIs — Clerk ships them. The only custom code is `proxy.ts`, `ClerkProvider` in the layout, and reading `userId` in route handlers.

## Prebuilt Components Reference

| Component | Import | Purpose |
|-----------|--------|---------|
| `<SignIn />` | `@clerk/nextjs` | Full sign-in form (email, OAuth, MFA) |
| `<SignUp />` | `@clerk/nextjs` | Full sign-up form |
| `<UserButton />` | `@clerk/nextjs` | Avatar + dropdown (profile, sign-out) |
| `<UserProfile />` | `@clerk/nextjs` | Embedded profile management page |
| `<SignedIn>` | `@clerk/nextjs` | Renders children only when signed in |
| `<SignedOut>` | `@clerk/nextjs` | Renders children only when signed out |
| `<RedirectToSignIn />` | `@clerk/nextjs` | Client-side redirect to sign-in |

**Example — conditional nav (no custom logic):**
```tsx
import { SignedIn, SignedOut, UserButton } from '@clerk/nextjs';

export function Nav() {
  return (
    <nav>
      <SignedOut>
        <a href="/sign-in">Sign in</a>
      </SignedOut>
      <SignedIn>
        <UserButton showName />
      </SignedIn>
    </nav>
  );
}
```

## CLI Setup (Recommended)

```bash
# New project + new Clerk app
clerk init --framework next -y
```

`clerk init` creates the Clerk app, writes `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` to `.env.local`, and installs `@clerk/nextjs`.

**Existing project with existing Clerk app:**
```bash
clerk auth login                        # one-time OAuth (skip if already logged in)
clerk link --app app_xxx                # explicit form, required in agent mode
clerk env pull                          # writes env vars to .env.local
```

**Daily ops:**
```bash
clerk env pull                          # refresh keys
clerk doctor --json                     # integration health check
```

### Notes for Agents

- `clerk link` (no flags) only autolinks when `CLERK_PUBLISHABLE_KEY` is already in `.env`. Without it: run `clerk apps list --json`, ask user which `app_id` to link.
- Pass `--json` on `apps list/create` and `doctor` for parseable output.

## Manual Setup (Dashboard Fallback)

1. Get keys from [dashboard.clerk.com](https://dashboard.clerk.com/~/api-keys)
2. **Publishable Key**: starts with `pk_test_` or `pk_live_`
3. **Secret Key**: starts with `sk_test_` or `sk_live_`

```bash
# .env.local
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```

## Install Package

```bash
npm install @clerk/nextjs
```

## Middleware

```typescript
// proxy.ts  (Next.js 15+)
// middleware.ts  (Next.js ≤15 — rename this file)
import { clerkMiddleware } from '@clerk/nextjs/server';

export default clerkMiddleware();

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
```

### Protecting Specific Routes

To make only certain routes require auth (rather than protecting everything):

```typescript
// proxy.ts
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/api/chat(.*)',
  '/onboarding(.*)',
]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
```

## Root Layout

`ClerkProvider` must be placed **inside `<body>`**, not wrapping `<html>`:

```tsx
// app/layout.tsx
import { ClerkProvider } from '@clerk/nextjs';

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

**Dynamic rendering** (when you need auth data in RSC without static generation):
```tsx
<ClerkProvider dynamic>{children}</ClerkProvider>
```

## Sign-In / Sign-Up Routes

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

> `afterSignUpUrl="/onboarding"` is required for billing — see [polar-customer-sync.md](polar-customer-sync.md).

## Reading Auth Data

### Server (Route Handler, Server Component, Server Action)

```typescript
import { auth, currentUser } from '@clerk/nextjs/server';

// Get userId only (lightweight)
const { userId } = await auth();

// Get full user object (extra network call)
const user = await currentUser();
const email = user?.primaryEmailAddress?.emailAddress;

// Throw 401 automatically if unauthenticated
const { userId } = await auth.protect();
```

> `auth()` is **async** in Next.js 15+. Always `await` it.

### Client Component

```tsx
'use client';
import { useAuth, useUser } from '@clerk/nextjs';

function MyComponent() {
  const { userId, isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();

  if (!isLoaded) return null;
  if (!isSignedIn) return <p>Sign in to continue</p>;

  return <p>Hello {user?.firstName}</p>;
}
```

### User Button (Prebuilt Nav Component)

```tsx
import { UserButton } from '@clerk/nextjs';

export function Nav() {
  return <UserButton showName />;
}
```

## Protected API Route Pattern

```typescript
// app/api/example/route.ts
import { auth } from '@clerk/nextjs/server';

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return new Response('Unauthorized', { status: 401 });

  // proceed with authenticated logic
}
```

## shadcn/ui Theme (Optional)

If the project uses shadcn (`components.json` exists):

```bash
npm install @clerk/ui
```

```tsx
// app/layout.tsx
import { shadcn } from '@clerk/ui/themes';

<ClerkProvider appearance={{ theme: shadcn }}>{children}</ClerkProvider>
```

```css
/* app/globals.css */
@import '@clerk/ui/themes/shadcn.css';
```

## Common Pitfalls

> Run `clerk doctor` first — fixes most integration issues in one shot.

| Issue | Solution |
|-------|----------|
| `auth()` not async | Next.js 15+: `const { userId } = await auth()` |
| `CLERK_SECRET_KEY` in client bundle | Only `NEXT_PUBLIC_*` keys are safe client-side |
| Missing middleware matcher for API routes | Add `/(api|trpc)(.*)` to matcher |
| `ClerkProvider` wrapping `<html>` | Must be inside `<body>` |
| Sign-in/up routes blocked by middleware | `createRouteMatcher` to exclude them, or use `clerkMiddleware()` default (public by default) |
| Wrong import path | Server: `@clerk/nextjs/server`, Client: `@clerk/nextjs` |
| `currentUser()` called in client component | `currentUser()` is server-only — use `useUser()` hook client-side |

## Keyless Mode

On first `npm run dev` without env vars, Clerk auto-generates development keys and shows a "Configure your application" banner. Selecting it associates the auto-generated app with your Clerk account. No manual key setup required for new projects.
