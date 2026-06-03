# Narev Skills

AI agent skills for [Narev](https://www.narev.ai) Cloud, pricing APIs, framework patterns, and related billing workflows. Four skills in one installable group.

## Structure

```
skills/
├── narev-starter/                 # start here — routes to the right skill or doc path
├── narev-nextjs-patterns/         # Next.js greenfield + brownfield Narev billing
├── narev-lookup-llm-pricing/      # Pricing API reference (7 public endpoints on api.narev.ai)
└── narev-update-llm-pricing/      # snapshot / pin rates into the repo
```

## Plugin Registry

`.claude-plugin/marketplace.json` — Anthropic plugin format. The **narev** plugin lists all four skills under `skills/`.

## Contributing

1. Each skill needs `SKILL.md` with YAML frontmatter (`name`, `description`, `license`).
2. Keep skill folder names aligned with the `name` in frontmatter (for example `narev-lookup-llm-pricing`).
3. Add new skills to `.claude-plugin/marketplace.json` under the **narev** plugin `skills` array, and keep other manifests in sync when you add, remove, or move skills (see `AGENTS.md`).
