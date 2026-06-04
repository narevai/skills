---
name: clerk-narev
description: Add Clerk auth + Narev/Polar usage-based billing to a Next.js App Router app. Two paths — new app (prebuilt useChat hook + @ai-billing/nextjs UI, no custom route handler) or existing Vercel AI SDK app (wrap streamText/generateText calls with create[Provider]WithBilling). Covers the Clerk userId → billing tags bridge, Polar customer provisioning on sign-up, and @ai-billing/nextjs usage/top-up UI. Self-contained — works without clerk-setup or narev-nextjs-patterns installed.
license: MIT
compatibility: Requires Next.js App Router, @clerk/nextjs v6+, @ai-billing/nextjs (includes all middleware, Narev resolver, and Polar destination), @polar-sh/sdk for customer provisioning, and the Vercel AI SDK. Env vars: NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY, CLERK_SECRET_KEY, NAREV_API_KEY, POLAR_ACCESS_TOKEN, POLAR_SERVER=sandbox|production. Node.js 20.9.0+.
metadata:
  author: narevai
  version: "1.0.0"
  docs: https://www.narev.ai/docs/platform/billing/integrations/frameworks/nextjs
---

# Clerk + Narev billing for Next.js

Narev billing requires a stable `userId` per request. Clerk is the fastest way to get one — and you write almost no UI. Clerk ships prebuilt `<SignIn />`, `<SignUp />`, `<UserButton />` components; `@ai-billing/nextjs` ships the chat hook, usage dashboard, and top-up UI.

The two systems connect at one point: Clerk's `userId` becomes the billing `userId` tag, and the same string is stored as `externalId` on the Polar customer.

This skill is **self-contained** — all Clerk and Narev details are in the references below.

## Choose Your Path

| Situation | Start here |
|-----------|------------|
| **New app** — no auth, no billing yet | [references/new-app.md](references/new-app.md) |
| **Existing Vercel AI SDK app** — add Clerk auth + billing to existing `streamText`/`generateText` calls | [references/existing-app.md](references/existing-app.md) |

## Reference Index

| Topic | Reference |
|-------|-----------|
| New app — prebuilt UI, multi-provider, no custom route handler | [references/new-app.md](references/new-app.md) |
| Existing Vercel AI SDK app — add auth + billing | [references/existing-app.md](references/existing-app.md) |
| Clerk Next.js setup (middleware, components, keys, pitfalls) | [references/clerk-nextjs.md](references/clerk-nextjs.md) |
| Clerk `userId` → billing tags in every context (RSC, route handler, Server Action, client) | [references/auth-bridge.md](references/auth-bridge.md) |
| Polar customer provisioning on Clerk sign-up | [references/polar-customer-sync.md](references/polar-customer-sync.md) |

## The Bridge: Clerk `userId` → Narev Billing

This is the integration point not covered by either `clerk-setup` or `narev-nextjs-patterns`:

```
Clerk auth()  →  userId  →  useChat({ userId })  or  providerOptions['ai-billing-tags'].userId
                                    ↑
              Polar destination: externalCustomerIdKey: 'userId'  (hardwired in @ai-billing/nextjs)
                                    ↑
              Onboarding: polar.customers.create({ email, externalId: userId })
```

**Greenfield** — `useChat` from `@ai-billing/nextjs` handles everything; pass `userId` as a prop from a Server Component:

```tsx
// Server Component
const { userId } = await auth();

// Client Component
const { messages, submit, selectedModel, onModelSelect } = useChat({
  userId,                              // Clerk userId → billing tag
  defaultModel: 'openai:gpt-4o-mini', // 'provider:modelId'
  tags: { userId },
});
```

**Brownfield** — wrap existing model with `create[Provider]WithBilling` from `@ai-billing/nextjs/server`, then pass `userId` from `auth()` in the tag:

```typescript
import { createOpenAIWithBilling } from '@ai-billing/nextjs/server';
import { auth } from '@clerk/nextjs/server';

const billedModel = createOpenAIWithBilling('gpt-4o-mini');

// In your route handler:
const { userId } = await auth();
streamText({ model: billedModel, messages, providerOptions: { 'ai-billing-tags': { userId } } });
```

Full context variants (RSC, Server Actions, client hooks): [references/auth-bridge.md](references/auth-bridge.md).

## Packages

```bash
npm install @clerk/nextjs                    # auth
npm install @ai-billing/nextjs               # billing — includes all middleware, Narev, Polar
npm install ai @ai-sdk/openai                # Vercel AI SDK + provider (swap as needed)
npm install @polar-sh/sdk                    # Polar SDK for customer provisioning only
```

`@ai-billing/nextjs` already bundles `@ai-billing/core`, `@ai-billing/polar`, `@ai-billing/narev`, and all provider middleware — no separate installs needed.

**Multi-provider** — add whichever API keys are needed, no code changes:

```bash
OPENAI_API_KEY=...        # enables openai:*
ANTHROPIC_API_KEY=...     # enables anthropic:*
GOOGLE_AI_STUDIO_KEY=...  # enables google:*
DEEPSEEK_API_KEY=...      # enables deepseek:*
GROQ_API_KEY=...          # enables groq:*
```

## Common Pitfalls

| Symptom | Cause | Fix |
|---------|-------|-----|
| No usage in Polar | Polar customer not provisioned on sign-up | Check `afterSignUpUrl="/onboarding"` on `<SignUp />`; verify customer in Polar Dashboard |
| Usage unattributed / anonymous | `userId` tag missing or mismatched | `useChat({ userId })` or `providerOptions['ai-billing-tags'].userId` — never omit |
| 401 on API routes | Middleware not matching API routes | Add `/(api|trpc)(.*)` to `proxy.ts` matcher |
| `auth()` in Client Component | `auth()` is server-only | Use `useAuth()` / `useUser()` hooks client-side; pass `userId` as prop |
| `CLERK_SECRET_KEY` in client bundle | Key in a file imported by a Client Component | Move all server Clerk calls to route handlers or Server Components |
| Billing UI unstyled | Missing shadcn CSS tokens | Add `--card`, `--border`, `--foreground`, `--primary` to `globals.css` |
| `auth()` not awaited | Next.js 15+ `auth()` is async | `const { userId } = await auth()` |

## See Also

- `narev-nextjs-patterns` — full Narev billing reference (all providers, destinations, pitfalls)
- `clerk-setup` — Clerk setup for all frameworks, keyless mode, migration
- `clerk-billing` — Clerk-native subscription plans and feature entitlements
- `clerk-webhooks` — alternative to onboarding page: sync `user.created` event to Polar
- `clerk-orgs` — B2B multi-tenant: add `organizationId` to billing tags alongside `userId`
