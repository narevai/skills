# Narev Skills

AI agent skills for [Narev](https://www.narev.ai) Cloud, pricing APIs, framework patterns, and related billing workflows. Four skills in three layout areas.

## Structure

```
skills/
├── core/
│   └── narev/                     # router — when to use which skill or doc path
├── frameworks/
│   └── narev-nextjs-patterns/     # Next.js App Router + Vercel AI SDK billing patterns
└── pricing/
    ├── narev-lookup-llm-pricing/  # Pricing API reference (GET catalog, POST calculate)
    └── narev-update-llm-pricing/  # Snapshot / pin rates into the repo
```

## Plugin Registry

`.claude-plugin/marketplace.json` — Anthropic plugin format. The **narev** plugin lists the core skill (`skills/core/narev/`); the **pricing** plugin lists the two pricing skills under `skills/pricing/`; the **frameworks** plugin lists framework-specific skills under `skills/frameworks/`.

## Contributing

1. Each skill needs `SKILL.md` with YAML frontmatter (`name`, `description`, `license`).
2. Put the core skill in `skills/core/narev/`; framework-specific skills under `skills/frameworks/`; pricing-related skills under `skills/pricing/`.
3. Add new marketplace-backed skills to `.claude-plugin/marketplace.json` under the right plugin group, and keep other manifests in sync when you add, remove, or move skills (see `AGENTS.md`).
4. Use the `narev-` prefix for specialized skill names and folder names (for example `narev-lookup-llm-pricing`). The top-level skill name stays `narev`.
