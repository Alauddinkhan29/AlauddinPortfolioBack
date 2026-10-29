# Agent instructions

Start by reading `docs/HANDOVER.md` (current state + roadmap) and `docs/discovery.md` (product decisions). These rules apply in every session.

## Working with the user
- Alauddin writes in **Hinglish** (Hindi in Roman script, mixed with English). Reply in the same style.
- He is **learning to become a Forward Deployed Engineer** through this project. Explain the *why* and any new terminology; don't just hand over code.
- He prefers **multiple-choice questions over typing** long answers. When you need input, offer options.
- **Never invent facts, URLs, numbers or store links** about his projects. If data isn't in Mongo or the docs, ask him.

## Safety
- `.env` holds real secrets and is gitignored. Never commit it, and never copy secrets into files, docs or logs.
- The Atlas cluster is **production** (the live site reads it). Ask before any write that isn't one of the existing idempotent scripts (`ingest`, `setup-vector-index`, `update-project-impact`).
- Don't commit or push unless he asks.

## Technical rules
- RAG scripts and tests must run against **Atlas**. Local `DATABASEURI` points at docker Mongo, which has no `$vectorSearch`. Override it per command with the Atlas URI from the commented line 4 of `.env`.
- Embeddings: `Xenova/bge-small-en-v1.5`, 384 dims, CLS pooling, normalized, query prefix on queries only. If the model changes: re-ingest **and** run `npm run setup-vector-index`.
- Budget is ₹0: free tiers or local only.
