# PositioningAI Feature Roadmap

> Generated 2026-03-27. Brainstormed from full codebase analysis targeting casual business owners, power users, and engine optimization intelligence.

---

## What the App Currently Does

A 7-stage pipeline that scrapes a business URL + competitors, embeds everything into ChromaDB, simulates RAG scoring, renders a PCA "ocean map" with unclaimed zones, generates GEO recommendations, runs multi-engine comparisons, and has two power labs (Rec Lab + Content Lab).

---

## Strategic Gap Analysis

The product is **technically deep but has a steep onboarding wall** — API keys upfront, zero educational context, and a dashboard that assumes the user knows what PCA, RAG, and GEO mean. The power features (Rec Lab, Content Lab, Blue Ocean zones) are buried under a sidebar most casual users will never discover.

---

## Brainstormed Feature Set

### Tier 1 — Casual Business Owner Usability (Highest ROI)

#### 1. Remove the API key wall (Demo / Hosted Mode)
**Problem**: A plumber or bakery owner won't have OpenAI keys. They bounce immediately.
**Solution**: Add a "Try a Demo" button on the homepage that loads a pre-baked example result (a real run for a sample business). No keys needed. Then upsell: "Want to analyze YOUR business? Add your API keys."
- Optional extension: hosted backend with your own keys, charge per scan via Stripe.
- Complexity: LOW (demo mode = load static JSON result). HIGH if you do billing.

#### 2. Plain-English Score Explainer
**Problem**: "Visibility score: 4.2" means nothing without context.
**Solution**: Below the hero metrics, auto-generate a 2–3 sentence plain-English digest. E.g.:
> "Your business appears in **3 of 10** AI searches. When customers ask 'best physiotherapy near [city]', AI mentions your top competitor 7× more than you. The biggest gap is your lack of content about [topic]."

Reuses existing data from `eval.results`, `top_competitor_domains`, and `recommendations.executive_summary`. No new pipeline work needed.

#### 3. Guided Setup Wizard (Replace the flat form)
**Problem**: The form dumps all inputs at once — URL + 2 required keys + 6 optional fields. Overwhelming.
**Solution**: 3-step wizard:
- Step 1: "Your website URL" + brief explainer of what the scan does
- Step 2: API keys with inline "how to get this" links and estimated cost ($0.05–$0.10)
- Step 3: Optional power settings (competitors, questions, custom questions, extra engine keys)

Progressive disclosure. Casual users finish at step 2.

#### 4. Friendly Loading Screen with Stage Explanations
**Problem**: Current loading shows "Mapping the Ocean" + a percentage. Users don't know if it's working or stuck.
**Solution**: Replace with named stage cards that check off as they complete:
```
✅ Reading your website
✅ Finding your 8 competitors
⏳ Building the AI knowledge map...
   Scoring your visibility against 10 questions
   Generating your battle plan
```
Ties directly into the existing WebSocket progress messages.

#### 5. First-Run Tutorial Overlay (Tooltips / Highlights)
**Problem**: First time on the results dashboard, users see 5 sidebar items + 2 right panels and don't know where to start.
**Solution**: A dismissible highlight tour on first visit. 3 steps: "Your score → Click a question to see why → Your recommendations." Drives engagement with the deeper features.

#### 6. Share Results / PDF Export (wire up `reportExporter.ts`)
`reportExporter.ts` already exists in the codebase. Needs a visible "Export PDF" button in the dashboard header. Casual users want to share results with their web developer or marketing team.
- Also: shareable read-only link (encode session data as base64 in URL hash, or persist to localStorage and share key).

#### 7. Competitor Name Display (Who Is Beating You?)
**Problem**: The score breakdown says "3 competitors mentioned more than you" — but which ones? Business owners recognize brand names, not domains.
**Solution**: In the EvaluationTable, next to each question, show: "ChatGPT mentioned: [Competitor A], [Competitor B]." In the HeroMetrics, make competitor count a clickable link to the competitor ranking. Makes the threat concrete and motivating.

#### 8. Re-Run / Rescan Button
After reading recommendations and making changes to their site, users need to re-scan to measure progress. A "Re-analyze" button on the results page that pre-fills the form with the same URL and keys (already in localStorage) and starts a new run. Creates a natural improvement loop.

---

### Tier 2 — Power Features for Serious Business

#### 9. Historical Tracking / Score Over Time
Every scan is a data point. Currently sessions are stored in localStorage with score. Connect these into a sparkline/trend chart on the homepage or in the History panel:
```
Jan 15: 4.2  →  Jan 22: 5.1  →  Feb 3: 6.7  📈 +2.5 over 3 scans
```
Zero new pipeline work. Pure frontend analytics over the existing `sessionHistory`.

#### 10. Custom Competitor List
**Problem**: Serper auto-discovers competitors but sometimes surfaces irrelevant domains (directories, Wikipedia, etc.). Power users know exactly who they're competing against.
**Solution**: In Advanced Settings, add a "Specify competitors" text field (one domain per line). If provided, skip Serper discovery and use the provided list directly in the retrieval stage. Simple bypass in `retrieval.py`.

#### 11. Content Calendar Generator
After recommendations are generated, add a "Build My Content Plan" button that calls `gpt-4o` with the recommendation topics + `content_to_add` list and produces a 30/60/90-day editorial calendar as a structured table (topic, format, target question, priority). Exportable to CSV.

#### 12. A/B Content Tester (Extend Content Lab)
The Content Lab currently re-scores ONE piece of content. Extend it to accept two drafts side-by-side and return a score for each. "Version A scores 7.1, Version B scores 8.4. Use Version B — it uses the phrase 'same-day service' which appears in 4 customer questions."

#### 13. Agency / Multi-URL Mode
A simple workspace concept: manage 3–10 URLs under one settings panel. Each URL gets its own session. A portfolio view shows all clients ranked by visibility score with color-coded health. Same underlying pipeline, repeated.

#### 14. Semantic Keyword Gap Report
New pipeline stage: compare the topics covered by user content vs. competitor content at the chunk level. Surface the top 10 topics competitors write about that the user's site does NOT cover. Presented as a prioritized list with estimated visibility lift per topic.

#### 15. Citation Quality Monitor (Track AI Sentiment)
When the business IS mentioned, how? The `mention_quality` field is already there (`prominent` / `brief` / `absent`). Extend it to extract the exact citation sentence from the AI answer and analyze sentiment (positive/neutral/negative). "ChatGPT mentioned you briefly but described your pricing as 'expensive'."

---

### Tier 3 — Engine Optimization Intelligence

#### 16. Per-Engine Content Strategy
The multi-engine comparison shows scores per engine side-by-side. Add engine-specific recommendations: "For Perplexity: add more 'best of' list content, cite statistics with sources. For Claude: structure your services page as Q&A. For ChatGPT: ensure your Google My Business profile is complete." Each engine has known retrieval biases — encode that knowledge.

#### 17. Structured Data Audit (Schema.org)
Scrape the business URL and check for `LocalBusiness`, `FAQPage`, `HowTo`, `Product` schema. AI engines crawl structured data aggressively. A simple audit panel showing "Missing: FAQPage schema — add 5 FAQs to gain +15% retrieval likelihood." Very high ROI for casual users, zero AI cost.

#### 18. NAP Consistency Checker (Entity Optimization)
AI engines build entity graphs. If the business name, address, phone is inconsistent across their website, GMB, and Yelp — they score lower. Use Serper to cross-reference the business across directories and flag inconsistencies. "Your Yelp page says 'John's Plumbing LLC' but your website says 'Johns Plumbing' — this confuses AI entity resolution."

#### 19. Freshness Score
Embed the last-modified date of the business site's key pages (check HTTP headers + `<meta>` tags). "Your about page hasn't been updated in 14 months. AI engines slightly prefer fresh content for local service queries." Simple heuristic, big perception value.

#### 20. Answer Box / FAQ Optimizer
Analyze the RAG-retrieved answers: what format of content did AI cite most? If competitor bullet-point lists get cited 8× more than paragraphs, surface that insight. Suggest reformatting existing content for better citation likelihood.

---

### Tier 4 — UX Polish & Retention

#### 21. Contextual Benchmarks
"Businesses in your industry average **5.8/10**. You scored **4.2**." Use historical session data across users (or hardcoded industry-average proxies at launch) to provide context. Without benchmarks, users don't know if 4.2 is terrible or fine.

#### 22. "Ask Your Data" Chat Interface
A small chat widget on the results page where users can ask natural language questions about their results: "Why did I score low on question 4?" → "What should I write about first?" → "What is my competitor doing differently?" The context is already in memory (the full `results` object) — this is just a system-prompted LLM call.

#### 23. Browser Extension
A Chrome extension with a "Check AI Visibility" button. Clicking it on any business website sends the URL to the app's API for a lightweight scan. Drive viral discovery — any business owner could install it and check competitors.

#### 24. Email Digest / Scheduled Rescan
"Email me my monthly GEO report" — schedule automatic re-scans and deliver a PDF summary. Pairs with hosted mode. Core retention mechanic.

#### 25. Undo / Draft Saving in Content Lab
Drafts disappear on page refresh. Add auto-save to localStorage. Show saved drafts as a list. Add "Saved to drafts" confirmation when a draft is scored.

---

## Priority Matrix (Impact vs. Effort)

| Feature | Impact | Effort | Target |
|---|---|---|---|
| Demo mode (pre-baked example) | 🔴 High | 🟢 Low | Casual |
| Plain-English score explainer | 🔴 High | 🟢 Low | Casual |
| Friendly loading stages | 🟡 Med | 🟢 Low | Casual |
| Re-run button | 🔴 High | 🟢 Low | Both |
| Wire up PDF export | 🟡 Med | 🟢 Low | Casual |
| Competitor name display | 🔴 High | 🟢 Low | Casual |
| Historical score chart | 🔴 High | 🟢 Low | Both |
| Custom competitor list | 🟡 Med | 🟢 Low | Power |
| First-run tutorial | 🟡 Med | 🟡 Med | Casual |
| Guided setup wizard | 🟡 Med | 🟡 Med | Casual |
| Structured data audit | 🔴 High | 🟡 Med | Engine Opt |
| Content calendar generator | 🟡 Med | 🟡 Med | Power |
| A/B content tester | 🟡 Med | 🟡 Med | Power |
| Per-engine content strategy | 🔴 High | 🟡 Med | Engine Opt |
| NAP consistency checker | 🟡 Med | 🔴 High | Engine Opt |
| Agency / multi-URL mode | 🟡 Med | 🔴 High | Power |
| "Ask your data" chat | 🔴 High | 🔴 High | Both |
| Benchmarks database | 🟡 Med | 🔴 High | Both |
| Browser extension | 🟡 Med | 🔴 High | Both |
| Email digest / scheduling | 🟡 Med | 🔴 High | Both |

---

## Recommended Execution Order

### Sprint 1 — Zero-Cost Quick Wins (2–3 days)
1. **Demo mode** — load a static pre-run JSON result on "Try Demo" click
2. **Plain-English explainer** — auto-generate from existing `executive_summary` + `eval.results`
3. **Friendly loading stages** — remap WebSocket messages to user-friendly labels with checkmarks
4. **Re-run button** — pre-fill form with stored keys + URL, trigger new analysis
5. **Historical score sparkline** — chart over existing `sessionHistory` data

### Sprint 2 — Usability Polish (3–4 days)
6. **Competitor name cards** in EvaluationTable — show who mentioned vs. who didn't
7. **PDF export button** — wire up `reportExporter.ts` to dashboard header
8. **Content Lab auto-save** — localStorage drafts
9. **First-run tooltip tour** — 3-step highlight walkthrough

### Sprint 3 — Power Features (4–5 days)
10. **Custom competitor list** — form field + `retrieval.py` bypass
11. **Structured data audit** — scrape + check schema.org markup, show gaps
12. **Content calendar generator** — new LLM call from recommendations data
13. **A/B content tester** — extend Content Lab UI + backend

### Sprint 4 — Engine Intelligence (5–7 days)
14. **Per-engine content strategy** — extend multi-engine recommendations
15. **Freshness score** — HTTP header + meta date scraping
16. **Semantic keyword gap report** — new pipeline stage
17. **NAP consistency checker** — Serper cross-reference
