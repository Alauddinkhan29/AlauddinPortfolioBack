# Portfolio Assistant — Discovery Doc

_Phase 1 of the RAG Portfolio Assistant. Written FDE-style: problem first, solution later._

## 1. Problem

Alauddin is looking for a **full-time remote role** — **Senior React Native first**, Forward Deployed Engineer (FDE) second — across all regions (US, Europe/UK, Middle East, India-remote).

Recruiters and hiring managers keep asking the same questions over LinkedIn, email and calls. The portfolio site doesn't answer them, so every visitor who has a question either leaves or adds a back-and-forth before a real conversation starts.

**Goal:** a visitor should get accurate answers about experience, projects and fit on the site itself, and should be pushed toward contacting Alauddin when the question needs a human.

## 2. Users

| Persona | What they check | Typical questions |
|---|---|---|
| **Senior RN recruiter** (primary) | RN depth, shipped apps, scale, years | "How many production apps?", "New Architecture?", "State management?" |
| **FDE hiring manager** (secondary) | AI/LLM work, end-to-end ownership, customer-facing work | "What have you built with LLMs/RAG?", "Worked directly with clients?" |

Traffic comes from everywhere (LinkedIn, job applications, Toptal/freelance), but **there is no analytics**, so the split between these sources is unknown.

For FDE hiring managers, the assistant **is also a live demo of the candidate**. A wrong or made-up answer hurts the pitch more than having no assistant at all.

## 3. Question categories (all four come up repeatedly)

| Category | Covered by current KB? |
|---|---|
| Experience & tech stack | 🟡 Partly (resume) |
| Projects & scale (apps shipped, users, exact role, Play Store links) | 🟡 Names/stack/description only. No users, scale, role, or Play Store links |
| Availability, notice period, timezone | ❌ Not covered. **Decision: redirect to contact** |
| Salary / rate | ❌ Not covered. **Decision: redirect to contact** |

## 4. Behavior rules

1. Default framing is **Senior React Native**. Switch to the AI/FDE angle only when the visitor asks about AI, LLMs or client-facing work.
2. **Salary/rate** → don't give numbers. Say it depends on the role and point to the contact section or a call.
3. **Availability/notice period** → don't answer. Point to the contact section.
4. Everything in the resume and project data is public and can be shared.
5. Never invent facts. If the KB doesn't contain the answer, say so and point to the contact section.

Rules 2, 3 and 5 all turn a question the assistant can't answer into a **contact**, which is exactly what the outcome metric measures.

## 5. Success metrics

| Type | Metric | Target |
|---|---|---|
| Quality | Correct answers on a golden set of real recruiter questions | ≥ 90% |
| Quality | Made-up facts (hallucinations) | 0 |
| Quality | Salary / availability / out-of-scope questions redirected correctly | 100% |
| Outcome | Contact actions and call clicks that start from the chat | Baseline unknown, measure first |

## 6. Constraints

- **Budget: ₹0.** Free tiers or self-hosted only.
- Backend runs on **Render free tier (512 MB RAM)**, so an LLM can't be self-hosted in production.
- Data lives in **MongoDB Atlas M0** (free), including the vector index.

## 7. Gaps found

1. **Project impact data missing:** users, scale, exact role and Play Store links per project. Recruiters ask for these and the KB can't answer.
2. **No AI/FDE content:** nothing in the KB answers "what have you built with AI?". This project's own case study (Phase 7) should fill it.
3. **No analytics:** can't measure the outcome metric or know where traffic comes from.
4. **Data bug:** Teracar and Teracar Driver share the same demo video URL.

## 8. Risks

- **Phone number exposure:** the resume PDF contains a phone number, and "everything is public" means the assistant can repeat it to anyone, including scrapers. Owner has accepted this for now.
- **Hallucination on the FDE path:** one confident wrong answer to a hiring manager costs more than a missed visitor.

- ~~**Embedding rate limit:** Voyage's free tier without a payment method allows only **3 requests/min**.~~ **Resolved:** switched to local embeddings (`bge-small-en-v1.5` via Transformers.js), so there's no rate limit and no cost. New tradeoff: ~285 MB process RAM and a model load on cold start. This needs checking against Render's 512 MB at deploy time.

## 9. Next steps

- [x] Fill project impact data (role, users/scale, store links) for each project. Stored on `ProjectDetails` in Mongo (`npm run update-project-impact`). STP added as an internal project. Teracar has no App Store listing we could find.
- [ ] Add free analytics to the frontend (e.g. Vercel Analytics)
- [x] Encode the behavior rules from §4 into the system prompt
- [ ] Phase 2: finish the build (local embeddings, generation, chat widget)
- [x] Phase 3: turn §3 into a golden eval set (29 cases; `npm run eval`; metrics and reviewed failures recorded in handover)

## 10. Owner corrections (2026-10-28)

- Alauddin confirms **5 years of professional mobile development experience**. Do not compute a shorter total from retrieved job fragments. Career includes Softops, Shopmatic, LogiQuad and Tata Technologies.
- He confirms **roughly 5–6 mobile apps deployed across his career**, including apps subsequently unpublished. This is not an exact React Native-only or currently-live count.
- Documented shipped RN examples: FleetVerse, Agent Contacts, Shopmatic and Adihex 2024; the latter two are unpublished. Teracar and Teracar Driver are Flutter; STP is an internal React JS web CRM. Global REIT appears in the resume, but its framework and current store availability are not confirmed in structured records. Do not infer an exhaustive RN count.

Assistant follow-ups (2026-10-28): send at most four completed user/assistant pairs from browser memory. Use history to resolve references, never as verified factual evidence. Clear chat/reload removes it. Replies support safe Markdown formatting. Contact redirects refer to the existing contact section (WhatsApp/email), as the current frontend has no contact form.


## 11. Owner-confirmed backend and cloud skills (2026-10-31)

- Alauddin reports strong backend development experience with Python, Spring Boot and Node.js, and multiple backend projects across these technologies.
- He reports substantial cloud experience with AWS and Docker. Specific AWS services, durations and project details beyond the owner-confirmed examples have not been confirmed; do not infer them.
- He confirms approximately 4–5 projects in each of Python, Spring Boot and Node.js; this is per technology, not a combined total. Whether projects overlap is not confirmed.

## 12. Owner-confirmed backend project examples (2026-10-31)

- Zaykaa: Python backend and React frontend.
- Portfolio: Node.js backend and React frontend.
- Parking Slots and Splitwise projects: Node.js. Spring Boot projects: e-commerce and BookMyShow. Do not infer company affiliation, features or live status.
- Whether a separate Parking Booking project also uses Python is awaiting clarification; do not assert that mapping or assume the two parking descriptions refer to different projects.
