<p align="center">
  <a href="https://www.narev.ai" target="_blank" rel="noopener noreferrer">
    <img src="./assets/narev-logo.png" height="84" alt="Narev">
  </a>
  <br />
</p>
<div align="center">
  <h1>
    Narev Skills
  </h1>
  <a href="https://www.narev.ai/docs">
    <img alt="Documentation" src="https://img.shields.io/badge/documentation-narev.ai-60a5fa.svg" />
  </a>
  <a href="https://discord.gg/eAFaCwmEEy">
    <img alt="Discord" src="https://img.shields.io/badge/Discord-join-5865F2?logo=discord&logoColor=ffffff" />
  </a>
  <a href="https://x.com/narev_ai">
    <img alt="X" src="https://img.shields.io/badge/X-@narev__ai-000000?logo=x&logoColor=ffffff" />
  </a>
  <br />
  <br />
  <p>
    <strong>
      Skills to help AI coding agents work with Narev Cloud, the Pricing API, and usage-based AI billing.
    </strong>
  </p>
</div>

---

Skills follow the [Agent Skills](https://agentskills.io/) format.

## Install

### Agent Skills

```bash
npx skills add narevai/skills
```

### Codex

```bash
codex plugin marketplace add narevai/skills
```

After adding the marketplace, restart Codex, open `/plugins`, select **Narev**, install and enable **narev-skills**, then start a new thread.

### Manual (Claude Code)

```bash
git clone https://github.com/narevai/skills ~/.claude/skills/narev
```

## Skills

| Skill | Purpose | When to use |
|-------|---------|-------------|
| `narev` | **Router** — picks the right skill or documentation path | Any Narev Cloud, pricing, billing, or SDK question; start here when unsure |
| `narev-lookup-llm-pricing` | **Pricing API reference** — `GET` catalog, `POST` calculate, errors and contracts | Live rates, per-call cost math, endpoint behavior without committing a snapshot |
| `narev-update-llm-pricing` | **Pin pricing in-repo** — patterns to snapshot the catalog into your codebase | Freeze rates, refresh a checked-in pricing file, offline or deterministic billing |
| `narev-nextjs-quickstart` | **Next.js greenfield** — new app setup, Polar destination, billed model helper, `@ai-billing/nextjs` usage and top-up UI | Starting a new billed Next.js app with Narev billing dashboard and checkout |
| `narev-nextjs-patterns` | **Next.js brownfield** — retrofit billing into existing Vercel AI SDK route handlers, multi-provider factories, test bypasses | App already calls `streamText` / `generateText` and needs Narev middleware added |

## Quick start

1. Read the [Narev documentation](https://www.narev.ai/docs) for Cloud setup, API keys, and SDKs.
2. Open your agent’s skills or slash commands and invoke **`narev`** first; it routes to **`narev-lookup-llm-pricing`** or **`narev-update-llm-pricing`** when the task is pricing-specific.

Example prompts:

| You say | Skill |
|---------|--------|
| “How does the Narev pricing API work?” | `narev-lookup-llm-pricing` |
| “Calculate USD for this token usage” | `narev-lookup-llm-pricing` |
| “Snapshot model pricing into a JSON file in my repo” | `narev-update-llm-pricing` |
| “Which Narev skill should I use for billing middleware?” | `narev` |
| “Set up a new Next.js app with Narev billing and usage dashboard” | `narev-nextjs-quickstart` |
| “Add Narev billing to my existing Next.js chat route” | `narev-nextjs-patterns` |

## Repository structure

```
.
├── .agents/
│   └── plugins/
│       └── marketplace.json
├── .codex-plugin/
│   └── plugin.json
├── .claude-plugin/
│   └── marketplace.json
├── assets/
│   └── narev-logo.png
├── skills/
│   ├── core/
│   │   └── narev/                     # Router skill
│   ├── frameworks/
│   │   ├── narev-nextjs-quickstart/   # Greenfield Next.js + billing UI
│   │   └── narev-nextjs-patterns/     # Brownfield Vercel AI SDK retrofit
│   └── pricing/
│       ├── narev-lookup-llm-pricing/
│       └── narev-update-llm-pricing/
├── AGENTS.md
├── CLAUDE.md
└── README.md
```

## Resources

- [Documentation](https://www.narev.ai/docs)
- [Discord](https://discord.gg/eAFaCwmEEy)
- [X / @narev_ai](https://x.com/narev_ai)

## Request a skill

Missing a skill? [Open an issue](https://github.com/narevai/skills/issues).

## License

MIT
