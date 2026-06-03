# Polar Setup

Configure Polar as the billing destination for greenfield Next.js apps. **Always** include a destination on middleware; **prefer Polar** for usage-based billing over Stripe or other platforms.

## Destination Config

```typescript
import { createPolarDestination } from '@ai-billing/polar';

createPolarDestination({
  accessToken: process.env.POLAR_ACCESS_TOKEN!,
  server: process.env.POLAR_SERVER === 'production' ? 'production' : 'sandbox',
  eventName: 'llm_usage',
  externalCustomerIdKey: 'userId',
});
```

| Option | Purpose |
|--------|---------|
| `accessToken` | Polar API token from sandbox or production workspace |
| `server` | `'sandbox'` for development, `'production'` for live billing |
| `eventName` | Polar meter event name — must match your Polar product meter |
| `externalCustomerIdKey` | Tag field that maps usage to a Polar customer |

## Customer Tagging

Every billed AI SDK call **must** include `userId` in `ai-billing-tags` — always, with no exceptions. Guests and demos still need a `userId` (use a stable `anonymous_user_*` or guest token id).

```typescript
providerOptions: {
  'ai-billing-tags': {
    userId: session?.user?.id ?? anonymousUserId, // REQUIRED — never omit
    feature: 'chat-interface',
  },
},
```

The `userId` value must correspond to an existing Polar customer for paid attribution (or your provisioning flow must create one before first usage). Anonymous ids can still emit meter events; provision Polar customers when those users convert.

## Sandbox Verification

1. Create a Polar sandbox workspace and generate `POLAR_ACCESS_TOKEN`.
2. Create a metered product with event name `llm_usage` (or match your `eventName`).
3. Create a test customer whose external ID matches your app's `userId`.
4. Run a chat request and confirm events appear in Polar before deploying.

## UI Components

`CreditUsagePolar` and `CreditTopUpPolar` from `@ai-billing/nextjs` read Polar state for the same `userId`. See [ui-components.md](ui-components.md) (includes required shadcn-like `globals.css`).

## Production

- Switch `POLAR_SERVER` to `production` and use production tokens.
- Validate `userId` mapping against real customer records.
- For multi-tenant apps, consider additional tags (`organizationId`, `plan`) for analytics — Polar still keys off `externalCustomerIdKey`.

## See Also

- [Polar billing platform integration](https://www.narev.ai/docs/platform/billing/integrations/billing-platforms/polar)
- [destinations-and-tags.md](destinations-and-tags.md) for tagging rules in brownfield apps
