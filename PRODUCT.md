# PositioningAI — Product Documentation

> **Note:** The app name is TBD. "PositioningAI" is used as a working title throughout this document.

---

## What Problem Does This Solve?

When someone asks ChatGPT, Claude, Gemini, or Perplexity a question like *"What's the best accounting software for freelancers?"* or *"Who are the top UX agencies in Austin?"*, AI assistants generate answers by retrieving and synthesizing content from across the web. This process — called **Retrieval-Augmented Generation (RAG)** — means your business's visibility in AI answers depends on how semantically relevant your content is to the questions your customers are actually asking.

Most businesses have no idea how they appear in these AI-generated answers, how they rank against competitors, or what content gaps are costing them visibility.

**PositioningAI answers three questions:**
1. *Where does my business appear in AI search results relative to competitors?*
2. *Which market niches are unclaimed and available to capture?*
3. *What content should I create to improve my AI visibility?*

This emerging discipline is called **Generative Engine Optimization (GEO)** — the next evolution of SEO for an AI-first world.

---

## How It Works

The app runs a 10-stage automated analysis pipeline when you submit a URL:

```
Your Website URL
      ↓
1. Crawl & Extract      — Scrapes your website content
2. Competitor Discovery — Finds competitors via Google Search (Serper API)
3. Fetch Competitors    — Scrapes competitor pages
4. Chunk Documents      — Splits all content into 300-word overlapping segments
5. Embed & Store        — Converts text into semantic vectors (OpenAI embeddings → ChromaDB)
6. Generate Questions   — Creates realistic customer questions from your business profile
7. RAG Evaluation       — Simulates AI retrieval: who surfaces for each question?
8. PCA Visualization    — Reduces semantic space to 2D/3D territory map
9. Blue Ocean Detection — Identifies unclaimed semantic niches
10. Recommendations     — Generates strategic content guidance (GPT-4o)
```

**The core idea:** Every business and competitor is represented as a point in semantic space. The closer two points are, the more semantically similar their content. PositioningAI makes this invisible landscape visible — as an interactive territory map — and tells you exactly how to move your position.

**Cost per analysis:** ~$0.05–$0.10 USD (OpenAI API usage).

---

## Features

### Competitive Territory Map

An interactive 2D map showing your business and all competitors as points in semantic space, rendered as a Voronoi territory visualization (think: risk board for content positioning).

- **Your business** appears as a distinct marker among competitor territories
- **Hover** any competitor to highlight their domain across all panels
- **Click** any territory zone to see strategic information about that semantic area
- **Blue ocean zones** overlay in teal, marking unclaimed opportunities
- The map updates live when you test new content or generate recommendations

---

### Visibility Scoring & Question Evaluation

The pipeline generates realistic customer questions based on your business profile, then runs RAG retrieval to score how often your content surfaces in the top results.

- **Visibility score:** 0–10 scale per question (how prominently you appear)
- **Mention rate:** percentage of questions where you're retrieved at all
- **Mention quality:** `prominent` / `brief` / `absent` per question
- **Score breakdown:** high / medium / low performing question categories
- **Per-question detail:** which competitors outrank you and by how much

This is the closest approximation of "how an AI assistant would actually answer your customers' questions today."

---

### Blue Ocean Opportunity Detection

Blue oceans are semantic niches where no competitor dominates — unclaimed territory in the AI answer space.

- **Unclaimed zones:** questions where retrieval returns no strong match (low density in semantic space)
- **Weak zones:** questions where competitors score poorly, creating an opening
- Opportunities are ranked by strength with visual badges
- Each opportunity links directly to content recommendations

---

### Archetype Classification

Your semantic position is classified into one of five positioning archetypes:

| Archetype | What It Means |
|-----------|---------------|
| **Invisible Center** | Positioned at the semantic average — generic, hard to distinguish |
| **Lone Ranger** | Highly differentiated but isolated — unique but potentially disconnected |
| **Shadow** | Close to a dominant competitor — similar content, lower visibility |
| **Pioneer** | On the frontier of semantic space — breaking new ground |
| **Contender** | Strong positioning near market leaders — competing effectively |

Your archetype updates in real-time when you test new content, letting you track how content changes shift your competitive stance.

---

### Multi-Engine Comparison

Optionally compares your visibility across four major AI platforms simultaneously:

| Engine | API Key Required |
|--------|-----------------|
| ChatGPT (GPT-4o) | OpenAI |
| Claude | Anthropic |
| Gemini | Google AI |
| Perplexity | Perplexity |

The comparison reveals which AI assistants rank you highest — important because different engines have different retrieval behaviors. A business might rank well in Perplexity but be invisible in ChatGPT.

Multi-engine is optional: the core analysis runs with only OpenAI + Serper keys.

---

### Content Lab

Test content changes in seconds without re-running the full analysis (which costs API credits and takes minutes).

1. Paste new content (homepage copy, blog post, about page, service description)
2. Click **Evaluate**
3. See the immediate impact:
   - New visibility score and delta vs. baseline
   - Updated mention rate
   - New archetype classification
   - New position on the territory map (rendered as cyan dots)

Content Lab works by replacing only your content chunks in the existing vector store and re-running retrieval — no re-scraping, no re-embedding competitors. Results appear in seconds.

**Use case:** Iterate on copy before publishing. Test whether adding a specific service description, a new FAQ, or a repositioned value proposition actually moves the needle.

---

### Recommendation Lab

Three modes for generating targeted content recommendations, all accessible from the results sidebar:

#### Mode 1: Zones
Browse detected blue ocean opportunities and click any zone to generate a tailored content brief — topic, format, sample outline — optimized to capture that unclaimed territory.

#### Mode 2: Pick
Click anywhere on the territory map to set a target position. The system generates content recommendations designed to move your semantic positioning toward that exact point.

**Use case:** You want to move toward a specific competitor's territory, or toward a high-value niche you've identified manually.

#### Mode 3: RL Agent *(Reinforcement Learning)*

The most powerful mode. An autonomous agent iteratively drafts and refines content toward your chosen target position using reinforcement learning:

1. **Set a target** (pick a point on the map or choose a blue ocean zone)
2. **Set max steps** (1–100, default 5)
3. **Run the agent** — it drafts content, evaluates positioning, critiques itself, and revises
4. Each step shows:
   - Progress toward target
   - Reward score change (↑ improving / ↓ regressing)
   - Latest critique
   - Visualization delta on the map
5. The agent stops when it converges, hits a plateau, or reaches max steps
6. **Best draft** is surfaced with its reward score

The agent uses annealing temperature control — starting exploratory and becoming more focused as it approaches the target — balancing creativity with precision.

Any draft from any mode can be sent directly to **Content Lab** for instant verification against your baseline score.

---

### Session History

The last three analyses are stored locally in your browser. Each session shows:
- The analyzed URL
- Visibility score
- Date of analysis

Click any session to reload results without re-running the analysis.

---

## API Keys

### Required

| Key | Purpose | Get It |
|-----|---------|--------|
| **OpenAI** | Embeddings, question generation, scoring, recommendations | platform.openai.com |
| **Serper** | Competitor discovery via Google Search | serper.dev |

### Optional (for Multi-Engine Comparison)

| Key | Engine |
|-----|--------|
| **Anthropic** | Claude |
| **Google AI** | Gemini |
| **Perplexity** | Perplexity |

**API keys are never sent to or stored on the server.** They are passed as query parameters per-request and stored only in your browser's localStorage.

---

## Quick Start

### Backend (FastAPI)
```bash
cd backend
pip install -r requirements.txt
python app.py
# → http://localhost:8000
```

### Frontend (React + Vite)
```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

The frontend proxies `/api` and `/ws` requests to the backend at `:8000`.

### Run Tests
```bash
cd backend
pytest tests/test_multi_engine.py -v          # unit tests (no API keys needed)
pytest tests/test_multi_engine.py -v -m live  # live tests (requires backend/.env)
```

---

## Who Is This For?

- **Small business owners** who want to know if AI assistants recommend them
- **Marketing teams** evaluating content strategy for the AI-answer era
- **SEO/GEO consultants** advising clients on AI search visibility
- **Product teams** benchmarking a product against competitors in AI-generated answers
- **Researchers** studying how AI retrieval systems rank business content

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python, FastAPI, ChromaDB, OpenAI SDK |
| Frontend | React, TypeScript, Vite, D3.js, Recharts |
| Embeddings | OpenAI `text-embedding-3-small` |
| LLM (extraction/scoring) | `gpt-4o-mini` |
| LLM (recommendations) | `gpt-4o` |
| Streaming | Server-Sent Events (SSE) |
| Vector Store | ChromaDB (in-memory, per-session) |
