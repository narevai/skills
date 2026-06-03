# Polar Integration: Full-Stack Usage-Based Billing

Use this reference when adding Polar as a billing destination to an **existing** Next.js App Router chatbot that already uses the Vercel AI SDK. It covers backend setup (AI Gateway middleware, Polar customer management, rate limiting) through to streaming generation cost to the browser and rendering a usage dashboard.

Full `@ai-billing/*` package catalog: [packages.md](packages.md).

---

## 1. Install Dependencies

```bash
pnpm add @ai-billing/core @ai-billing/gateway @ai-billing/nextjs @ai-billing/polar @polar-sh/sdk
```

The `@ai-billing/gateway` middleware wraps the AI SDK's `gateway.languageModel()` provider. The `@polar-sh/sdk` client manages customers directly on the Polar API.

---

## 2. Environment Variables

Add to `.env.example` and your local `.env`:

```env
# Polar — billing destination
# POLAR_SERVER can be 'sandbox' (default) or 'production'
POLAR_ACCESS_TOKEN=****
POLAR_SERVER=sandbox
```

---

## 3. Backend Wiring

### 3.1. Polar Customer Client (`lib/polar-client.ts`)

Creates a Polar customer on registration so billing events resolve to a named account.

```typescript
import { Polar } from '@polar-sh/sdk';

let _polar: Polar | null = null;

function getPolarClient(): Polar | null {
  if (_polar) return _polar;
  const accessToken = process.env.POLAR_ACCESS_TOKEN;
  if (!accessToken) return null;
  const server = (process.env.POLAR_SERVER ?? 'sandbox') as 'sandbox' | 'production';
  _polar = new Polar({ accessToken, server });
  return _polar;
}

export async function createPolarCustomer(email: string, userId: string): Promise<void> {
  const polar = getPolarClient();
  if (!polar) return;
  try {
    await polar.customers.create({ email, externalId: userId });
  } catch (error) {
    console.error('[ai-billing] Failed to create Polar customer:', error);
  }
}
```

### 3.2. Gateway Billing Wrapper (`lib/ai/billing.ts`)

Wraps any `LanguageModelV3` with Gateway V3 billing middleware. Returns the raw model in test environments or when `POLAR_ACCESS_TOKEN` is absent.

```typescript
import { wrapLanguageModel } from 'ai';
import type { LanguageModelV3 } from '@ai-sdk/provider';
import { createGatewayV3Middleware } from '@ai-billing/gateway';
import { createPolarDestination } from '@ai-billing/polar';
import { isTestEnvironment } from '@/lib/constants';

let _billingMiddleware: ReturnType<typeof createGatewayV3Middleware> | null = null;
let _initAttempted = false;

function getBillingMiddleware() {
  if (_initAttempted) return _billingMiddleware;
  _initAttempted = true;

  if (isTestEnvironment) return null;

  const polarAccessToken = process.env.POLAR_ACCESS_TOKEN;
  const polarServer = (process.env.POLAR_SERVER ?? 'sandbox') as 'sandbox' | 'production';

  if (!polarAccessToken) return null;

  _billingMiddleware = createGatewayV3Middleware({
    destinations: [
      createPolarDestination({
        accessToken: polarAccessToken,
        server: polarServer,
        eventName: 'llm_usage',
        externalCustomerIdKey: 'userId',
      }),
    ],
  });

  return _billingMiddleware;
}

export function getBillingWrappedModel(model: LanguageModelV3): LanguageModelV3 {
  const middleware = getBillingMiddleware();
  if (!middleware) return model;
  return wrapLanguageModel({ model, middleware });
}
```

> **Note:** `createGatewayV3Middleware` reads token usage from the AI Gateway's response metadata — no `priceResolver` is required when using the Gateway provider. The Gateway itself resolves model prices, and `@ai-billing/gateway` extracts cost from the response.

### 3.3. Apply Wrapper in Provider Factory (`lib/ai/providers.ts`)

Import the wrapper and apply it to the Gateway model:

```typescript
import { getBillingWrappedModel } from './billing';

// Before (return raw gateway model):
// return gateway.languageModel(modelId);

// After (return billed model):
return getBillingWrappedModel(gateway.languageModel(modelId));
```

---

## 4. Entitlements and Rate Limiting

### 4.1. Entitlements Definition (`lib/ai/entitlements.ts`)

```typescript
import type { UserType } from '@/app/(auth)/auth';

type Entitlements = {
  maxMessagesPerHour: number;
};

export const entitlementsByUserType: Record<UserType, Entitlements> = {
  guest:   { maxMessagesPerHour: 10 },
  regular: { maxMessagesPerHour: 100 },
};
```

### 4.2. Rate-Limit Check in Chat Route (`app/(chat)/api/chat/route.ts`)

Insert before the model invocation:

```typescript
import { entitlementsByUserType } from '@/lib/ai/entitlements';

const userType: UserType = session.user.type;
const messageCount = await getMessageCountByUserId({
  id: session.user.id,
  differenceInHours: 1,
});

if (messageCount > entitlementsByUserType[userType].maxMessagesPerHour) {
  return new ChatbotError('rate_limit:chat').toResponse();
}
```

---

## 5. Billing Tags on the AI SDK Call

Pass customer context as `ai-billing-tags` in `providerOptions`. **`userId` is required on every billed call** — always set it (authenticated id or stable `anonymous_user_*` for guests). The `userId` key must match the `externalCustomerIdKey` configured in `createPolarDestination`.

```typescript
const result = streamText({
  model: getLanguageModel(chatModel),
  messages,
  providerOptions: {
    'ai-billing-tags': {
      userId: userType === 'guest' ? 'anonymous_user' : session.user.id,
      userType,
      chatId: id,
      modelId: chatModel,
    },
  },
});
```

---

## 6. Streaming Generation Cost to the Browser

After writing the result stream, extract the billing cost from `providerMetadata` and write it to the data stream:

```typescript
const providerMetadata = await result.providerMetadata;
const billing = (providerMetadata as Record<string, unknown> | undefined)?.['ai-billing'] as
  | { cost?: { amount: number; currency: string; unit: string } }
  | undefined;

if (billing?.cost) {
  dataStream.write({
    type: 'data-billing-cost',
    data: {
      amount:   billing.cost.amount,
      currency: billing.cost.currency,
      unit:     billing.cost.unit,
    },
  });
}
```

Register the `'billing-cost'` delta type in `lib/types.ts`:

```typescript
// In DataStreamDelta union:
'billing-cost': { amount: number; currency: string; unit?: string };
```

---

## 7. Customer Creation on Registration

Hook into `app/(auth)/actions.ts` so every new account maps to a Polar customer immediately:

```typescript
import { createPolarCustomer } from '@/lib/polar-client';

// Replace:
// await createUser(validatedData.email, validatedData.password);

const newUser = await createUser(validatedData.email, validatedData.password);
if (newUser) {
  await createPolarCustomer(validatedData.email, newUser.id);
}
```

---

## 8. Frontend: Cost Display

### Context (`components/chat/billing-cost-provider.tsx`)

Expose a React context mapping message IDs → `{ amount, currency, unit }`. Export `useBillingCosts` and a `setCost(messageId, cost)` setter.

### Stream Handler (`components/chat/data-stream-handler.tsx`)

Intercept `type === 'data-billing-cost'` events from the chat data stream and call `setCost(lastAssistantMessageId, delta.data)`.

### Message Component (`components/chat/message.tsx`)

Read cost from context and render it alongside assistant message actions:

```tsx
const { costs } = useBillingCosts();
const cost = costs[message.id];

// Before the actions row:
{isAssistant && cost && (
  <span className="flex items-center gap-1">
    <span className="text-[11px] text-muted-foreground/50">Generation cost:</span>
    <span className="font-mono text-[11px] tabular-nums text-green-500">
      ${(cost.amount / (cost.unit === 'nanos' ? 1_000_000_000 : 1)).toFixed(6)}
    </span>
  </span>
)}
```

---

## 9. Usage Dashboard

Use `@ai-billing/nextjs` prebuilt components for the dashboard page:

```tsx
// app/(chat)/page.tsx
import { CreditUsagePolar, CreditTopUpPolar } from '@ai-billing/nextjs';
import { auth } from '../(auth)/auth';

export default async function UsagePage() {
  const session = await auth();
  if (!session?.user || session.user.type === 'guest') {
    return <p>Sign in to view usage.</p>;
  }
  return (
    <div className="p-6 space-y-4">
      <CreditUsagePolar userId={session.user.id} />
      <CreditTopUpPolar userId={session.user.id} />
    </div>
  );
}
```

If you are moving the chat interface to `/chat`, update sidebar links to reflect the new routes: `/` → Usage, `/chat` → New Chat.

---

## Error Codes

| Code | Meaning |
|------|---------|
| `rate_limit:chat` | User exceeded `maxMessagesPerHour` for their tier |
| `bad_request:activate_gateway` | AI Gateway not activated; direct the user to add a credit card on Vercel |

---

## Checklist

- [ ] `POLAR_ACCESS_TOKEN` and `POLAR_SERVER` in `.env.example`
- [ ] `lib/polar-client.ts` — customer creation helper
- [ ] `lib/ai/billing.ts` — Gateway V3 middleware, lazily initialized, test-bypassed
- [ ] `lib/ai/providers.ts` — wraps `gateway.languageModel()` with `getBillingWrappedModel()`
- [ ] `lib/ai/entitlements.ts` — rate limits per user type
- [ ] Chat route — rate-limit check, `ai-billing-tags`, cost extraction from `providerMetadata`
- [ ] Auth actions — `createPolarCustomer` on new user registration
- [ ] `lib/types.ts` — `'billing-cost'` delta type registered
- [ ] Frontend context + stream handler wired into the chat shell
- [ ] Usage dashboard page using `@ai-billing/nextjs` components
