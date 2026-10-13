# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

This is a **multi-context** monorepo: each runnable app under `apps/` is its own context, and shared libraries live under `packages/`.

## Before exploring, read these

- **`GLOSSARY-MAP.md`** at the repo root — it points at one `GLOSSARY.md` per context (per app). Read each one relevant to the topic.
- **`apps/<app>/GLOSSARY.md`** — the domain glossary for a specific app.
- **`docs/adr/`** — read ADRs that touch the area you're about to work in. Also check `apps/<app>/docs/adr/` for context-scoped decisions.

If any of these files don't exist, **proceed silently**. Don't flag their absence; don't suggest creating them upfront. The `/domain-modeling` skill (reached via `/grill-with-docs` and `/improve-codebase-architecture`) creates them lazily when terms or decisions actually get resolved.

## File structure

```
/
├── GLOSSARY-MAP.md
├── docs/adr/
├── apps/
│   └── amelie-engine-api/
│       ├── GLOSSARY.md
│       └── docs/adr/
└── packages/
    ├── db-amelie/
    ├── contracts/
    ├── chat-bot/
    └── chat-bot-durable-stream/
```

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal, a hypothesis, a test name), use the term as defined in the relevant `GLOSSARY.md`. Don't drift to synonyms the glossary explicitly avoids.

If the concept you need isn't in the glossary yet, that's a signal — either you're inventing language the project doesn't use (reconsider) or there's a real gap (note it for `/domain-modeling`).

## Flag ADR conflicts

If your output contradicts an existing ADR, surface it explicitly rather than silently overriding:

> _Contradicts ADR-0007 (event-sourced orders) — but worth reopening because…_
