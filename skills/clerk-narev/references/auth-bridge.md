# Auth Bridge: Clerk userId → Narev Billing Tags

How to correctly read the Clerk `userId` and forward it to Narev billing in every context.

## The Rule

Every `streamText` / `generateText` call that uses a billed model must set `providerOptions['ai-billing-tags'].userId` to the Clerk `userId`. Without it, Polar cannot map usage to the customer.

```typescript
providerOptions: {
  'ai-billing-tags': { userId },   // Clerk userId — never omit
}
```

## Reading userId by Context

### Route Handler (API Route)

```typescript
// app/api/chat/route.ts
import { auth } from '@clerk/nextjs/server';

export async function POST(req: Request) {
  const { userId } = await auth();   // async in Next.js 15+
  if (!userId) return new Response('Unauthorized', { status: 401 });
  // use userId in billing tags
}
```

### Server Component

```tsx
// app/chat/page.tsx
import { auth } from '@clerk/nextjs/server';

export default async function ChatPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  return <ChatShell userId={userId} />;  // pass down to client component
}
```

### Server Action

```typescript
'use server';
import { auth } from '@clerk/nextjs/server';

export async function submitMessage(messages: Message[]) {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');

  const result = await streamText({
    model: billedModel,
    messages,
    providerOptions: { 'ai-billing-tags': { userId } },
  });

  return result.toDataStreamResponse();
}
```

### Client Component — Never Call auth() Here

Client components cannot call `auth()`. Receive `userId` as a prop from the parent Server Component:

```tsx
// components/chat/shell.tsx
'use client';
import { useChat } from '@ai-billing/nextjs';

interface Props {
  userId: string;   // passed from Server Component
  chatId: string;
}

export function ChatShell({ userId, chatId }: Props) {
  const { messages, submit } = useChat({
    userId,
    tags: { userId, chatId },
  });
  // ...
}
```

If you need Clerk identity client-side (for display only), use `useUser()` from `@clerk/nextjs`:

```tsx
'use client';
import { useUser } from '@clerk/nextjs';

export function UserAvatar() {
  const { user } = useUser();
  return <img src={user?.imageUrl} alt={user?.fullName ?? ''} />;
}
```

## Database User Sync Pattern

When the app has a local database, keep the Clerk `userId` as the primary key. Create the DB record lazily on first request:

```typescript
// lib/db/queries.ts
import { auth, currentUser } from '@clerk/nextjs/server';
import { db } from './index';
import { user } from './schema';
import { eq } from 'drizzle-orm';

export async function ensureUser() {
  const { userId: clerkId } = await auth();
  if (!clerkId) return null;

  const [existing] = await db.select().from(user).where(eq(user.id, clerkId));
  if (existing) return existing;

  const clerkUser = await currentUser();
  const email = clerkUser?.primaryEmailAddress?.emailAddress ?? `${clerkId}@clerk`;

  const [created] = await db
    .insert(user)
    .values({ id: clerkId, email })
    .onConflictDoNothing()
    .returning();

  return created ?? null;
}

export async function getUserId() {
  const u = await ensureUser();
  return u?.id ?? null;
}
```

Database schema (Drizzle example — Clerk userId as PK):

```typescript
// lib/db/schema.ts
import { pgTable, text, varchar, boolean, timestamp } from 'drizzle-orm/pg-core';

export const user = pgTable('User', {
  id: text('id').primaryKey().notNull(),         // Clerk userId
  email: varchar('email', { length: 64 }).notNull(),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
});
```

## Guest / Anonymous Users

When the app allows unauthenticated usage, never omit `userId`. Use a stable anonymous ID:

```typescript
import { cookies } from 'next/headers';
import { randomUUID } from 'crypto';

export function getOrCreateAnonymousId(): string {
  const cookieStore = cookies();
  const existing = cookieStore.get('anon_id')?.value;
  if (existing) return `anonymous_user_${existing}`;

  const id = randomUUID();
  cookieStore.set('anon_id', id, { maxAge: 60 * 60 * 24 * 365 });
  return `anonymous_user_${id}`;
}
```

Usage in route:

```typescript
const { userId } = await auth();
const billingUserId = userId ?? getOrCreateAnonymousId();

providerOptions: { 'ai-billing-tags': { userId: billingUserId } }
```

## Protecting API Routes

Two patterns — choose one:

**Explicit check (flexible):**
```typescript
const { userId } = await auth();
if (!userId) return new Response('Unauthorized', { status: 401 });
```

**`auth.protect()` (throws automatically):**
```typescript
const { userId } = await auth.protect();
// throws 401 if not authenticated — no manual check needed
```

For B2B apps, also verify organization membership:
```typescript
const { userId, orgId } = await auth();
if (!userId || !orgId) return new Response('Unauthorized', { status: 401 });

providerOptions: {
  'ai-billing-tags': { userId, organizationId: orgId },
}
```
