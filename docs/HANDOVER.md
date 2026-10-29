# Handover: RAG Portfolio Assistant

_Handed over from a Claude Code session on 2026-10-28. Read this file together with `docs/discovery.md`._

## 1. What this is and why

Alauddin Khan is a Senior React Native / full-stack developer. He is job hunting for **full-time remote roles: Senior React Native first, Forward Deployed Engineer (FDE) second**. He is building a **"Portfolio Assistant"**, a RAG chatbot on his portfolio site that answers recruiters' questions about his projects, experience and skills.

The project has two goals:
1. **A working product**: recruiters get accurate answers on the site, and anything that needs a human is pushed toward the contact form.
2. **Learning to be an FDE.** The project is being run like an FDE customer engagement, in 7 phases (section 6). The user is **learning as he goes**. Explain concepts and decisions; don't just dump code. He has explicitly asked for deep explanations of terminology.

## 2. Repos

| Repo | Path | Stack | Hosting |
|---|---|---|---|
| Backend (this repo) | `/Users/alauddinkhan/Documents/AlauddinPortfolioBack` | Node 20, Express, Mongoose, socket.io | Render (`https://alauddinportfolioback.onrender.com`), Docker |
| Frontend | `/Users/alauddinkhan/Documents/AlauddinPortfolioWeb/alauddin-portfolio` | React 19 (CRA), Tailwind, Framer Motion | Vercel (`https://alauddin-khan-portfolio.vercel.app`) |

**Nothing from this work is committed yet.** All backend changes are uncommitted in the working tree (see section 8). The frontend repo also has a lot of uncommitted changes from the user's own separate redesign. Those are not part of this work, so don't touch or commit them unless asked.

## 3. Architecture (current)

```
INGEST (npm run ingest, offline)            QUERY (POST /api/chat, live)

Resume PDF (RESUME_PATH)                    { "message": "..." }
+ ProjectDetails docs (Mongo)                    │ rate limit 10/min/IP, max 500 chars
   │ chunkText (1000 chars, 150 overlap)         │ embedQuery (bge prefix added)
   │ 1 project = 1 chunk                         ▼
   │ embedBatch (local bge-small, 384-d)    $vectorSearch on kbchunks (top 5)
   ▼                                             │ build context block
kbchunks collection (MongoDB Atlas) ◄────────────┘
                                                 ▼
                                            Groq openai/gpt-oss-20b
                                                 ▼
                                            { answer, sources }
```

| Concern | Choice | Why |
|---|---|---|
| Vector store | **MongoDB Atlas Vector Search** (M0 free cluster `cluster0.njtp0.mongodb.net`), collection `kbchunks`, index `kb_chunks_vector_index` (384 dims, cosine, `source` filter field) | User already had Atlas, so no second database. Supabase/pgvector was tried first and removed: the free project auto-paused and broke everything. |
| Embeddings | **Local**: `Xenova/bge-small-en-v1.5` via `@huggingface/transformers` (ONNX, `dtype: 'q8'`, CLS pooling, normalized) | ₹0 budget. OpenAI had no credits. Voyage AI free tier without a card allows only 3 requests/min. Measured locally: ~3 ms per embedding, 33 MB model, ~285 MB process RSS. |
| Generation | **Groq** `openai/gpt-oss-20b` (free tier) | Anthropic account has no credits. `@anthropic-ai/sdk` is still installed on purpose so it's easy to switch back once credits exist. |

### Gotchas that cost time (don't repeat these)
- **bge needs a query prefix**: `"Represent this sentence for searching relevant passages: "` on **queries only**, never on documents. It also needs `pooling: 'cls'`. Mean pooling silently degrades results; it never throws.
- **Changing the embedding model = re-ingest + update the Atlas index dimension.** Vectors from different models aren't comparable. `npm run setup-vector-index` detects a dimension mismatch and calls `updateSearchIndex`. The index goes `BUILDING → READY`, which takes about a minute.
- **The `kbchunks` collection must exist before the index can be created.** Run ingest first on a fresh DB.
- **Atlas score = `(1 + cosine) / 2`**, so scores sit close together (0.77–0.89). Judge by ranking, not by thresholds.
- **onnxruntime crashes on `process.exit()`** with `mutex lock failed` (exit code 134) after the model has been used. It's harmless, but scripts shouldn't call `process.exit` on success. `ingest.js` exits naturally.
- **pdf-parse is v2**: use `const { PDFParse } = require('pdf-parse')`, then `new PDFParse({ data }).getText()`. There's no default function export.
- The backend's `uploads/…LatestResumeAlauddin.pdf` is a **scanned PDF with no text layer** (extracts 16 chars). `RESUME_PATH` points at the frontend's `src/assets/NewResumeAlauddin.pdf` instead, which has real text.

## 4. Files (all new or changed in this work)

| File | Purpose |
|---|---|
| `src/services/embeddingService.js` | `chunkText`, `embedQuery` (adds bge prefix), `embedBatch`, `warmUpEmbeddings`. Model loads once (lazy singleton). |
| `src/services/ragService.js` | `retrieveRelevantChunks` (`$vectorSearch`), `answerQuestion` (Groq). Contains `SYSTEM_PROMPT`. |
| `src/routers/Chat.js` | `POST /api/chat`: `express-rate-limit` 10 req/min/IP, 500-char max message. Returns `{ status, data: { answer, sources } }`. |
| `src/models/KbChunk.js` | `{ source: 'resume'\|'project', sourceRef, content, embedding: [Number] }` with timestamps. |
| `src/models/ProjectDetails.js` | **Changed**: `picUrl`, `version`, `videoUrl` are no longer required. New optional fields: `role`, `status` (`live`\|`internal`\|`unpublished`), `downloads`, `playStoreUrl`, `appStoreUrl`, `highlights: [String]`. |
| `src/scripts/ingest.js` | Rebuilds `kbchunks` per source (`deleteMany` + `insertMany`). Project chunks include role/status/downloads/store links/highlights. |
| `src/scripts/setupVectorIndex.js` | Creates the vector index, or updates it if the dimension changed. |
| `src/scripts/updateProjectImpact.js` | One-off migration (already run on Atlas): adds impact data to the 6 projects and upserts **STP**. Idempotent. |
| `src/index.js` | **Changed**: `app.set('trust proxy', 1)` (Render proxy, needed for per-IP rate limiting), mounts `chatRouter`, calls `warmUpEmbeddings()` after the server starts. |
| `docs/discovery.md` | Phase 1 output: users, question categories, behavior rules, metrics, gaps, risks. **The source of truth for product decisions.** |

npm scripts: `ingest`, `setup-vector-index`, `update-project-impact`.

## 5. Running things locally

### Env vars (`.env`, gitignored, never commit it)
`DATABASEURI`, `GROQ_API_KEY` (**configured locally; never print it**), `ANTHROPIC_API_KEY` (no credits yet), `RESUME_PATH`, plus the existing `CLOUDINARY_*`, `EMAIL_*`, `REDIS_URL`, `PORT`.

### The DATABASEURI trap
- Local `.env` has `DATABASEURI=mongodb://mongodb:27017/portfolio`. That's the docker-compose Mongo container, and it **does not support `$vectorSearch`**.
- The Atlas URI is on the commented line 4 of `.env`. Every RAG script/test must run against Atlas. Override it per command, e.g. `DATABASEURI='<atlas uri from .env line 4>' npm run ingest`.
- Production (Render) already uses Atlas, per the user.

### Pre-existing quirk
`src/index.js` line 1 loads dotenv from `./src/.env`, which **doesn't exist**. Locally, env vars only reach the server via `docker-compose` (`env_file: .env`). The scripts load the root `.env` themselves. Don't "fix" this without asking, because it may be how the user's Render/Docker setup expects things.

### Verified so far (2026-10-12)
- Ingest: 6 resume chunks + 7 project chunks.
- Retrieval: top-1 was the correct project for 4/4 test questions (FleetVerse downloads, STP role, Teracar driver download, chatbot work).
- **Verified 2026-10-28:** actual backend server + Atlas retrieval + Groq generation via `POST /api/chat`: six smoke questions returned HTTP 200 with answers and sources (Senior RN framing, salary, availability/timezone, STP, FleetVerse chatbot ownership, unknown facts). Empty and >500-character messages returned HTTP 400. Salary was retested after resolving a prompt conflict and correctly said compensation depends on the role, with contact/call redirect. This is a smoke test, not Phase 3's golden eval set.
- **Model fix:** `llama-3.3-70b-versatile` returned Groq 404 `model_not_found` with the configured key. The authenticated models API confirmed `openai/gpt-oss-20b` is available; switched to it with `reasoning_effort: 'low'` and `max_completion_tokens: 1024` (includes reasoning). Review behavior with Phase 3 evals. Root `.env` was loaded into the test process; no dotenv-path change or production DB writes.

## 6. Roadmap (FDE-style phases)

**Phase 1: Discovery ✅** → see `docs/discovery.md`.

**Phase 2: Finish the build (IN PROGRESS)**
- [x] User adds `GROQ_API_KEY` → run an end-to-end `/api/chat` test (2026-10-28).
- [x] **Encode the discovery behavior rules into `SYSTEM_PROMPT`.** Implemented on 2026-10-28, including public-data sharing, timezone/contact redirects, untrusted-context handling, and FleetVerse ownership limits:
  - default framing is Senior React Native; use the AI/FDE angle only when asked about AI or client-facing work
  - salary/rate → no numbers, redirect to the contact form or a call
  - availability/notice period → don't answer, redirect to the contact form
  - STP: say "an automotive dealer network", don't name the client (not confirmed)
  - never invent facts
- [x] Frontend chat widget (React + Framer Motion), completed 2026-10-28. `sendChatMessage` uses `REACT_APP_API_BASE_URL`; widget mounted across routes, deduplicated sources link known case studies/resume, and handles loading, 400/429/500, timeout/network failure with retry drafts. Accessible dialog supports Escape/focus trapping, reduced motion and clear chat. Existing contact section has WhatsApp/email, not an email form; chat CTA navigates there. Real browser smoke verified FleetVerse answer + sources and salary redirect using the actual Chat router + Atlas/Groq via an isolated local server. Tests (12), lint and Node 20 production build passed. Node 23 build failed inside Webpack module concatenation; use frontend `.nvmrc` (20.19.6). Backend redirects now use "contact section" to match the current frontend. Deployment remains pending.
- [ ] Deploy: set `GROQ_API_KEY` on Render. **Risk:** the model downloads at runtime into `node_modules/@huggingface/transformers/.cache` on every cold start, and ~285 MB RSS is tight on Render free (512 MB). Consider downloading the model during the Docker build, and measure memory.

**Phase 3: Evals (baseline implemented 2026-10-28; expand over time)**
- Golden set of 20–30 real recruiter questions covering the 4 categories in `discovery.md` §3, each with the expected source chunk and the key facts.
- Measure retrieval hit@k, answer correctness, hallucinations (target 0), and correct redirects for salary/availability/out-of-scope questions (target 100%).
- Make it a script (`npm run eval`) that prints a report. Known weak spot: for "has he worked on any chatbot?", Shopmatic (irrelevant) ranked #2.

**Phase 4: Observability.** Log every query (question, retrieved chunk ids + scores, answer, latency, tokens) to Mongo. Track chat → contact clicks. Add free analytics to the frontend (e.g. Vercel Analytics). Today nothing is measured.

**Phase 5: Cost + failure report.** Cost per query, a monthly projection, failure categories, and what to change.

**Phase 6: Agent / tool use.** Intent detection with tool calling: "schedule a call" → Calendly link, "show RN projects" → filtered project list.

**Phase 7: Case study.** A write-up of this project (problem, approach, eval numbers, cost, failures) on the portfolio, **also ingested into the KB**. This fills the "what have you built with AI?" gap for FDE hiring managers.

After Phase 7, the user plans a **second project built around a real business problem**, to practice customer discovery and ROI properly.

## 7. Data facts (from the discovery interview, confirmed by the user)

| Project | Role | Stack | Status / scale |
|---|---|---|---|
| Tata FleetVerse | Lead developer | RN, Redux, JS | Live on Play Store + App Store, **50K+** Android downloads. Built the **chatbot's chat UI + API integration**; the bot backend was another team's or a vendor's. Don't overclaim this. |
| STP (Dealer CRM) | Lead developer | **React JS (web, not RN)**, Redux Toolkit, React Query, TypeScript | Internal. 400+ dealers, PV + EV business units. |
| Teracar + Teracar Driver | Lead developer | Flutter, GetX, Dart | Play Store only, 1K+ each. No App Store listing found. Both DB docs share the same `videoUrl` (data bug, not fixed). |
| Agent Contacts | Lead developer | RN, Redux Toolkit, TS | Play Store + App Store, 1K+. |
| Shopmatic | Lead developer | RN, Redux, JS | Unpublished. |
| Adihex (2024 edition) | Core team member | RN, Redux, JS | Unpublished after the event. The live ADIHEX 2025 app is **not** his. |

Behavior decisions: salary → redirect; availability → redirect; "everything in the resume is public" (the user accepted that the resume's phone number can be shared). Budget: **₹0, free tiers only**.

## 8. Uncommitted state

```
M  package.json, package-lock.json, src/index.js, src/models/ProjectDetails.js
?? docs/, src/models/KbChunk.js, src/routers/Chat.js, src/scripts/, src/services/
?? Dockerfile, docker-compose.yml, .dockerignore, nginx/   ← pre-existing, never committed, NOT from this work
```

Note: `.gitignore` contains `*.json`. `package.json` is already tracked, so it still shows as modified. Any new JSON file would be silently ignored.

## 9. Career/project retrieval correction (2026-10-28)

User reported answers claiming only ~2 years' experience and only two shipped RN apps. Read-only Atlas inspection reproduced the context gap: top-5 similarity results omitted recent employers; the model also confused currently live with historically shipped.

`src/data/assistantProfile.js` now supplies owner-confirmed 5 years / roughly 5–6 career-wide deployed mobile apps on every answer. `retrieveAnswerContext` includes all resume chunks and compact metadata for all ingested projects, alongside semantically retrieved project details. Owner profile takes precedence over partial job arithmetic. Historical shipped apps remain included even if unpublished; RN, Flutter and internal web are distinguished. Exact career-wide RN count is unconfirmed (at least four named examples). Sources are deduplicated; frontend renders `profile` as Verified profile. No Atlas writes or re-ingestion were needed.

Repeatable real-Atlas/Groq smoke checks: `npm run test:chat` (or `npm run test:chat -- rn-shipped`). Seven HTTP 200 cases passed for experience, employer history, deployed total, historical RN examples, live-vs-unpublished RN, Flutter distinction and salary redirect; refined RN wording was retested and says at least four documented apps rather than an exhaustive total. Frontend 12 tests + lint passed. Broader Phase 3 eval coverage is still pending.

UI update (2026-10-28): owner requested hiding Sources consulted. Frontend no longer renders source lists or stores source metadata in chat messages; backend sources remain available in the API for debugging/evals.

## 10. Evals, bounded memory and formatting (2026-10-28)

- `POST /api/chat` accepts optional `history`: up to 8 alternating user/assistant messages (4 completed exchanges), with user content ≤500 chars and assistant content ≤4000 chars. Missing history is backwards compatible. Invalid roles, odd counts, oversized content and non-arrays return 400. `chatHistory.js` strips other properties.
- Frontend sends only successful exchanges. Clear chat and reload remove history; no DB persistence. Last two user questions help vector retrieval resolve pronouns; recent user/assistant history is passed separately to Groq and explicitly treated as untrusted reference-resolution context, never verified facts.
- `chatPolicy.js` returns the fixed contact/call response for explicit compensation questions before retrieval or generation (zero Groq tokens). The LLM prompt remains a fallback for less explicit compensation phrasing.
- Answers use Markdown via pinned `markdown-to-jsx` 9.10.3; raw HTML disabled, images suppressed, link schemes restricted, external links have noopener/noreferrer. Source lists remain hidden. CRA Jest needs the package's entities subpath mapping (in package.json).
- `npm run eval` runs 29 golden cases through real Atlas/Groq and writes `work/chat-eval-report.json` (or use `--output PATH`). Filter one case via `--case ID`. `src/evals/goldenSet.js` records source targets and explicit fact/redirect/forbidden-claim assertions. Unicode/Markdown is normalized by `gradeAnswer.js`. Diagnostics expose vector top-5 IDs/scores, latency and tokens only to the eval runner; the public API still returns answer/sources.
- One full baseline was manually reviewed and regraded after fixing typography-sensitive checkers. Three real issues: inferred Lead titles added to resume job titles, FleetVerse labelled fleet-management, and a salary-history response omitted the mandatory role-dependency line. Tightened prompt/checks and added deterministic compensation policy; all three targeted retests passed. Reviewed baseline: 25/28 fact checks, redirects 83.3%, vector hit@5 93.3%. Latest results after three targeted fixes plus an added browser regression: 29/29 checks, redirects 100%, hit@5 93.8%. This is a 28-case baseline + targeted retests/new case, not a second full-suite run.
- Regex checks and reviewed answers do not prove zero hallucinations. One known vector miss remains: career-history top-5 omitted LogiQuad, but complete resume context supplied it. Keep complete-context fallback.
- Verification: 17 frontend tests + lint + Node 20 production build passed; 8 invalid HTTP history/message payloads rejected; valid bounds/retrieval-query checks passed against an Atlas-connected local router. No Atlas writes. Reports were delivered in the chat's outputs directory. Deployment remains pending.

Browser follow-up correction: actual two-turn Hinglish question "Usmein kaunsa tech stack use kiya?" was initially interpreted as an unknown project name, despite the seeded multi-turn eval passing. Added the exact 29th case. `resolveProjectReference` matches only KB-known project names/aliases from recent conversation; explicit topic changes bypass the hint, and multiple candidate projects return a deterministic clarification. A system hint alone still produced clarification; anchoring the resolved project next to the latest model question fixed the exact regression. The initial failure and final retest are preserved in delivered evaluation reports.

Final real-browser verification passed: opening FleetVerse role question followed by "Usmein kaunsa tech stack use kiya?" returned the FleetVerse React Native/Redux stack, with bold/list formatting and no Sources consulted block. Local preview backend was restarted with the final code.

## 11. Groq quota and recovery (2026-10-28)

The user saw generic unavailable errors after several replies. The local preview logs showed Groq HTTP 429; a single real public-context diagnostic confirmed tokens-per-day quota, with a provider Retry-After of 601 seconds at the time. Earlier extensive evals shared and consumed the same organization quota. Quotas cannot be reset or increased by application code. No secrets or raw provider response headers were logged.

The backend now disables SDK automatic retries, preserves provider 429 with a typed daily/minute/generic limit and Retry-After seconds, and maps provider 5xx/timeouts to a recoverable 503. The frontend preserves the failed draft, shows the reason and countdown, blocks repeated submits until retry time, then permits a manual retry. Public chat rate limits remain separate. A 5-minute in-memory cache keyed by a hash of question, bounded history, model and current reference context avoids repeat Groq requests; identical concurrent requests are deduplicated, and a provider cooldown prevents repeated calls during a known limit. Cache has at most 64 entries and no persistent storage.

To reduce token usage, all resume chunks, verified profile, and project metadata remain in context; detailed project descriptions are limited to the top two relevant projects. A read-only Atlas check confirmed complete summary coverage and 2,118 fewer description characters for one representative question. This context change happened after the earlier 29-case eval, so its full-answer quality has not been re-evaluated; run targeted checks after provider quota resets, then the complete eval when budget permits.

Verified: real browser showed the provider's daily-limit message, saved draft and countdown; simulated 429/503/recovery, cache/expiry/concurrency, and Atlas context/history tests passed; 18 frontend tests, lint and Node 20 production build passed. A fresh successful Groq answer after these changes could not be checked while the provider quota was exhausted. No Atlas writes; preview servers restarted with the updated code.


## 12. Local reliability and UI improvements (2026-10-29)

- Removed an old commented database URI from `src/config/database.js`. This does not revoke the credential or remove it from Git history: rotate it in Atlas, update affected deployments, then safely address repository history. Never print the URI.
- Ingestion prepares and validates both sources and embedding dimensions before writes, refuses missing/empty sources, inserts replacement documents first, and deletes old records only after successful insert. On insertion failure it attempts to remove only IDs from that attempt. Not a transaction: source swaps occur separately, search index visibility is asynchronous, cleanup/deletion can fail, and concurrent ingestion runs must be avoided. No production ingestion was run for this change.
- `/health` is liveness; `/ready` checks Mongo connection state and whether the local embedding model loaded. These do not test Atlas vector index or Groq availability. Chat requests log ID, status and duration without raw questions or answers.
- Prompt requests replies in visitor language/script; fixed salary policy remains English. Targeted Atlas/Groq runs found that an initial Hinglish experience answer was English despite passing its original fact regex. A comparison answer contained unverified claims; its original regex passed, demonstrating why manual review matters. The comparison retest after prompt changes failed the stricter Hinglish assertion. A subsequent retest after adding a per-question Hinglish hint returned provider 429, so that latest change and the full suite remain unverified.
- Chat UI adds copy, manual retry and contextual suggested questions. Clipboard requires browser support; the UI offers manual selection if it fails. Conversation storage remains in memory.
- Local unit/frontend checks do not prove production retrieval or generation quality. Re-run real Atlas/Groq evaluation when quota permits and verify after deployment.
