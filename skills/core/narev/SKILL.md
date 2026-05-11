---
name: narev
description:
  Narev router. Use when the user asks about Narev Cloud, the Pricing API, model pricing
  (API reference skill vs applied workflows on top of that API), live LLM pricing, token costs,
  cost calculation, pinning or snapshotting model rates, Narev SDK,
  @ai-billing/core, provider middleware packages, Vercel AI SDK billing, usage-based billing,
  billing integrations (Polar, Stripe, Lago), benchmarks, routers, routing API, FOCUS format,
  Narev Self-Hosted, deployment, COGS, customer tagging, FinOps for AI, or this documentation
  site. Automatically routes to the specific skill or documentation path based on their task.
license: MIT
metadata:
  author: narevai
  version: "1.1.0"
  skill_group: core
---

# Narev Skills Router

Check `package.json` (and the lockfile if versions disagree) for `@ai-billing/core` and any `@ai-billing/<provider>` packages. Use the **typedoc** pages under `/sdk/ai-billing/reference/...` that match the installed major versions for code samples and option shapes. If there is no SDK in the project (for example edits to this docs repo only), treat the docs site as source of truth for the latest APIs.

| Package                  | What it covers                                                            |
| ------------------------ | ------------------------------------------------------------------------- |
| `@ai-billing/core`       | Billing middleware, usage payloads, price resolvers, destinations, errors |
| `@ai-billing/<provider>` | Provider-specific V3 middleware (OpenAI, Anthropic, gateway, and so on)   |

**Public Pricing API base URL:** `https://www.narev.ai`. Pricing skills live under `.mintlify/skills/pricing/` (`lookup-llm-pricing` and `update-llm-pricing` in each `SKILL.md` frontmatter `name`).

---

## By task

**Model pricing (API reference)** → Use `narev-lookup-llm-pricing`

- **Live API only:** public `GET` catalog (filters, pagination) and `POST` calculate for one call’s USD total — no committed files.
- **Semantics:** USD per token, required `usage` integers, when **`subprovider`** is required for the same `model_id` on different hosts.
- **Contracts and troubleshooting:** request/response shapes, `402` / `404` / `400`, and links to `/platform/api-reference/endpoint/pricing/...` for the canonical spec.

**Model pricing (snapshots and automation)** → Use `narev-update-llm-pricing`

- **Pin rates in-repo:** paginated `GET` only, map each row into **your** schema, write a tracked file or generated module for offline or deterministic billing.
- **Implementation choices:** merge vs replace, provider/model scope, unit conversion (API per token vs local per-1M), keys for multi-provider models.
- **Ops:** idempotent scripts, readable diffs, optional CI or scheduled refresh; use **`narev-lookup-llm-pricing`** for `POST` calculate and fine-grained HTTP/error details.

**Narev SDK (runtime in your app)** → `/sdk/ai-billing/index`

- `@ai-billing/core` and `@ai-billing/<provider>` middleware
- Destinations, price resolvers, usage payloads, errors
- Prefer this over raw Pricing HTTP when billing runs inside the app

**Usage-based billing concepts** → `/platform/concepts/usage-based-billing`

- Meters, products, how Narev Cloud fits the model

**Billing integrations and revenue** → `/platform/billing/overview`

- Polar, Stripe, Lago, frameworks (for example Next.js)

**Benchmarks** → `/platform/benchmark/introduction`

- Creating benchmarks, data sources, variants, integrations

**Routers** → `/platform/routing/introduction`

- Filter and sequential routers, routing API

**Other Narev Cloud HTTP APIs** → `/platform/api-reference/introduction`

- Applications, custom metrics, router chat-completions

**Narev Self-Hosted** → `/narev-oss/index`

- Docker agent, deployment, provider sync, FOCUS format, COGS tagging

**Guides** → `/guides/index`

- FinOps for AI, model choice, prompt cost deep dives

**Blog** → `/blog/index`

---

## Quick navigation

If you know your task, you can directly access:

- `/narev-lookup-llm-pricing` — Pricing API **reference** (list + calculate); skill `narev-lookup-llm-pricing`
- `/narev-update-llm-pricing` — **Applied** workflows using that API (snapshots, registries); skill `narev-update-llm-pricing`

Or describe what you need and I'll recommend the right one.
