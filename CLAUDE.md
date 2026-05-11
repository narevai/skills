# Narev Skills

AI agent skills for [Narev](https://www.narev.ai) Cloud, pricing APIs, and related billing workflows. Three skills in two layout areas.

## Structure

```
skills/
├── core/
│   └── narev/                     # router — when to use which skill or doc path
└── pricing/
    ├── narev-lookup-llm-pricing/  # Pricing API reference (GET catalog, POST calculate)
    └── narev-update-llm-pricing/  # Snapshot / pin rates into the repo
```

## Plugin Registry

`.claude-plugin/marketplace.json` — Anthropic plugin format. The **narev** plugin lists the router (`skills/core/narev/`); the **pricing** plugin lists the two pricing skills under `skills/pricing/`.

## Contributing

1. Each skill needs `SKILL.md` with YAML frontmatter (`name`, `description`, `license`).
2. Put the router in `skills/core/narev/`; pricing-related skills under `skills/pricing/`.
3. Add new marketplace-backed skills to `.claude-plugin/marketplace.json` under the right plugin group, and keep other manifests in sync when you add, remove, or move skills (see `AGENTS.md`).
4. Use the `narev-` prefix for specialized skill names and folder names (for example `narev-lookup-llm-pricing`). The top-level router skill name stays `narev`.
