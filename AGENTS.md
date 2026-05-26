# Narev Skills

AI agent skills for [Narev](https://www.narev.ai) Cloud, pricing APIs, framework patterns, and related billing workflows. Five skills in three layout areas.

## Structure

```
skills/
├── core/
│   └── narev/                          # router — when to use which skill or doc path
├── frameworks/
│   ├── narev-nextjs-quickstart/        # Greenfield Next.js + @ai-billing/nextjs billing UI
│   └── narev-nextjs-patterns/          # Brownfield retrofit for existing Vercel AI SDK apps
└── pricing/
    ├── narev-lookup-llm-pricing/       # Pricing API reference (GET catalog, POST calculate)
    └── narev-update-llm-pricing/       # Snapshot / pin rates into the repo
```

## Plugin Registry

- `.claude-plugin/marketplace.json` — Anthropic plugin format. The **narev** plugin lists the router (`skills/core/narev/`); the **pricing** plugin lists the two pricing skills under `skills/pricing/`; the **frameworks** plugin lists framework-specific skills under `skills/frameworks/`.
- `.codex-plugin/plugin.json` — Codex plugin manifest for the bundle (`skills` entry points at `./skills/`).
- `.agents/plugins/marketplace.json` — Codex marketplace registry for installing the plugin from the Git URL.

## Contributing

1. Each skill needs `SKILL.md` with YAML frontmatter (`name`, `description`, `license`).
2. Put the router in `skills/core/narev/`; framework-specific skills under `skills/frameworks/`; pricing-related skills under `skills/pricing/`.
3. Add new marketplace-backed skills to `.claude-plugin/marketplace.json` under the matching plugin group.
4. Use the `narev-` prefix for specialized skill names and folder names (for example `narev-lookup-llm-pricing`). The top-level router skill name stays `narev`.
5. When adding, removing, or moving skills, keep applicable manifests in sync: `.claude-plugin/marketplace.json`, `.codex-plugin/plugin.json` (if the bundle layout or metadata changes), and `.agents/plugins/marketplace.json` when the install source or plugin identity changes.
