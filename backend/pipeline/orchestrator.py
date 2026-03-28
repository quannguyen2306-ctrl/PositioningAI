"""
orchestrator.py
---------------
Wraps the entire 9-step analysis pipeline into a single AnalysisPipeline class.

Pipeline stages:
  1. Fetch user business URL
  2. Extract business context
  3. Search for competitors
  4. Fetch competitor documents
  5. Chunk all documents
  6. Embed and store in vector DB
  7. Generate test questions
  8. Run RAG evaluation (parallel)
  9. Fit PCA, interpret dimensions, blue ocean analysis, generate recommendations
"""

from openai import OpenAI
from sklearn.preprocessing import StandardScaler

from .ingestion import fetch_url, fetch_url_with_html, chunk_text, extract_business_context
from .retrieval import search_competitors, fetch_competitor_docs
from .embeddings import EmbeddingStore
from .rag_evaluator import generate_test_questions, run_evaluation
from .pca_visualizer import fit_pca, interpret_dimensions, plot_2d, plot_3d
from .recommender import generate_recommendations
from .multi_engine import run_multi_engine_evaluation
from .blue_ocean import classify_archetype, find_blue_ocean_zones
from .schema_auditor import audit_schema_markup


class AnalysisPipeline:
    """
    Orchestrates the complete competitive analysis + PCA + RAG evaluation pipeline.
    """

    def __init__(
        self,
        business_url: str,
        openai_api_key: str,
        serper_api_key: str,
        n_competitors: int = 5,
        n_questions: int = 10,
        custom_questions: list[str] | None = None,
        progress_callback=None,
        event_callback=None,
        google_api_key: str = "",
        anthropic_api_key: str = "",
        perplexity_api_key: str = "",
    ):
        self.business_url = business_url
        self.openai_client = OpenAI(api_key=openai_api_key)
        self.openai_api_key = openai_api_key
        self.serper_api_key = serper_api_key
        self.n_competitors = n_competitors
        self.n_questions = n_questions
        self.custom_questions = custom_questions
        self.progress_callback = progress_callback
        self.event_callback = event_callback

        # Multi-engine API keys
        self.google_api_key = google_api_key
        self.anthropic_api_key = anthropic_api_key
        self.perplexity_api_key = perplexity_api_key

        # Pipeline outputs
        self.business_context = None
        self.user_text = None
        self.user_html = None
        self.competitor_docs = None
        self.schema_audit = None
        self.store = None
        self.eval_results = None
        self.multi_engine_results = None
        self.pca = None
        self.scaler = None
        self.coords = None
        self.pca_metadata = None
        self.interpretations = None
        self.recommendations = None
        self.plot_2d_fig = None
        self.plot_3d_fig = None
        self.archetype = None
        self.blue_ocean_zones = None
        self.test_questions = None

    def _report_progress(self, stage: int, total_stages: int, message: str):
        """Helper to call progress callback."""
        if self.progress_callback:
            percent = int((stage / total_stages) * 100)
            self.progress_callback(percent, message)

    def _emit(self, event_type: str, data: dict):
        """Helper to fire an SSE-style event via event_callback."""
        if self.event_callback:
            self.event_callback({"event": event_type, **data})

    def run(self) -> dict:
        """
        Execute the full 9-stage pipeline.
        Returns: dict with all results and visualizations.
        """
        total_stages = 11

        # --- Stage 1: Fetch user URL ---
        self._report_progress(1, total_stages, "Fetching your business website...")
        self.user_text, self.user_html = fetch_url_with_html(self.business_url)

        # --- Stage 1.5: Audit schema.org markup ---
        self._report_progress(2, total_stages, "Auditing structured data markup...")
        self.schema_audit = audit_schema_markup(self.user_html, self.business_url)
        schema_audit_dict = {
            "url": self.schema_audit.url,
            "schemas_found": [
                {
                    "schema_type": s.schema_type,
                    "found": s.found,
                    "field_count": s.field_count,
                    "missing_fields": s.missing_fields,
                }
                for s in self.schema_audit.schemas_found
            ],
            "overall_completeness": self.schema_audit.overall_completeness,
            "recommendations": self.schema_audit.recommendations,
        }
        self._emit("schema_audit", schema_audit_dict)

        # --- Stage 3: Extract business context ---
        self._report_progress(3, total_stages, "Extracting business information...")
        self.business_context = extract_business_context(self.user_text, self.openai_client)
        self._emit("profile", {"data": self.business_context})

        # --- Stage 4: Search for competitors ---
        self._report_progress(4, total_stages, "Searching for competitors...")
        search_query = self.business_context.get("search_query", "")
        competitor_urls = search_competitors(
            search_query,
            self.serper_api_key,
            n=self.n_competitors,
        )
        self._emit("competitors", {"competitors": competitor_urls})

        # --- Stage 5: Fetch competitor documents ---
        self._report_progress(5, total_stages, f"Fetching {len(competitor_urls)} competitor websites...")
        self.competitor_docs = fetch_competitor_docs(competitor_urls)

        # --- Stage 6: Chunk documents ---
        self._report_progress(6, total_stages, "Chunking documents...")
        user_chunks = chunk_text(self.user_text)
        comp_chunks_map = {
            doc["url"]: chunk_text(doc["text"]) for doc in self.competitor_docs
        }

        # --- Stage 7: Embed and store ---
        self._report_progress(7, total_stages, "Building semantic embeddings...")
        self.store = EmbeddingStore(self.openai_client)

        self.store.store(
            user_chunks,
            source="user",
            url=self.business_url,
            domain="",
        )

        for doc in self.competitor_docs:
            chunks = comp_chunks_map.get(doc["url"], [])
            self.store.store(
                chunks,
                source="competitor",
                url=doc["url"],
                domain=doc.get("domain", ""),
            )

        # --- Stage 8: Generate test questions ---
        self._report_progress(8, total_stages, "Generating test questions...")
        self.test_questions = generate_test_questions(
            self.business_context,
            self.openai_client,
            self.custom_questions,
        )
        # Limit to requested number
        self.test_questions = self.test_questions[:self.n_questions]
        self._emit("questions", {"questions": self.test_questions})

        # --- Stage 9: Run RAG evaluation (parallel) ---
        self._report_progress(9, total_stages, "Evaluating visibility in AI responses...")
        self.eval_results = run_evaluation(
            self.test_questions,
            self.store,
            self.openai_client,
            self.business_context.get("business_name", "Your Business"),
            progress_callback=None,
        )
        # Normalise mention_rate to 0.0–1.0 fraction (frontend multiplies by 100)
        eval_for_sse = {
            **self.eval_results,
            "mention_rate": round(self.eval_results["mention_rate"] / 100, 4),
        }
        self._emit("eval", {"eval": eval_for_sse})

        # --- Stage 10: Multi-engine evaluation ---
        api_keys = {
            "openai": self.openai_api_key,
            "anthropic": self.anthropic_api_key,
            "google": self.google_api_key,
            "perplexity": self.perplexity_api_key,
        }
        # Only run if at least one engine key is available
        has_engine_keys = any(api_keys.get(k) for k in api_keys)
        if has_engine_keys:
            self._report_progress(10, total_stages, "Testing across AI engines...")
            self.multi_engine_results = run_multi_engine_evaluation(
                self.test_questions,
                self.business_context.get("business_name", "Your Business"),
                api_keys,
                self.openai_client,
                progress_callback=self.progress_callback,
            )
            self._emit("multi_engine", {"data": self.multi_engine_results})
        else:
            self._report_progress(10, total_stages, "Skipping multi-engine test (no extra API keys)...")

        # --- Stage 11: PCA + recommendations ---
        self._report_progress(11, total_stages, "Analyzing competitive positioning...")
        embeddings, metadata = self.store.get_all_for_pca()
        self.pca_metadata = metadata

        self.pca, self.scaler, self.coords = fit_pca(embeddings, n_components=3)
        self.interpretations = interpret_dimensions(
            self.pca,
            self.pca_metadata,
            self.coords,
            self.openai_client,
            n_samples=5,
        )

        self.plot_2d_fig = plot_2d(
            self.coords,
            self.pca_metadata,
            self.interpretations,
            self.business_context.get("business_name", "Your Business"),
        )

        self.plot_3d_fig = plot_3d(
            self.coords,
            self.pca_metadata,
            self.interpretations,
            self.business_context.get("business_name", "Your Business"),
        )

        # Blue ocean analysis
        self.archetype = classify_archetype(
            self.coords,
            self.pca_metadata,
            self.eval_results["results"],
            user_domain="",
        )
        self.blue_ocean_zones = find_blue_ocean_zones(self.coords, self.pca_metadata)

        # Build PCA points for SSE (coords rows + metadata)
        pca_points = [
            {
                "components": self.coords[i].tolist(),
                "source": metadata[i]["source"],
                "domain": metadata[i]["domain"],
                "text": metadata[i].get("text", "")[:200],
            }
            for i in range(len(self.coords))
        ]
        self._emit("pca", {"points": pca_points, "interpretations": self.interpretations})
        self._emit("archetype", {"archetype": self.archetype})
        self._emit("blue_ocean", {
            "zones": self.blue_ocean_zones,
            "opportunities": self.eval_results.get("blue_ocean_opportunities", []),
        })

        self.recommendations = generate_recommendations(
            self.business_context,
            self.eval_results,
            self.interpretations,
            self.competitor_docs,
            self.openai_client,
        )
        self._emit("recommendations", {"recs": self.recommendations})
        self._emit("complete", {})

        return self._compile_results()

    def _compile_results(self) -> dict:
        """Compile all results into a structured output dict."""
        schema_audit_dict = None
        if self.schema_audit:
            schema_audit_dict = {
                "url": self.schema_audit.url,
                "schemas_found": [
                    {
                        "schema_type": s.schema_type,
                        "found": s.found,
                        "field_count": s.field_count,
                        "missing_fields": s.missing_fields,
                    }
                    for s in self.schema_audit.schemas_found
                ],
                "overall_completeness": self.schema_audit.overall_completeness,
                "recommendations": self.schema_audit.recommendations,
            }

        return {
            "business_context": self.business_context,
            "schema_audit": schema_audit_dict,
            "eval_results": self.eval_results,
            "multi_engine_results": self.multi_engine_results,
            "interpretations": self.interpretations,
            "recommendations": self.recommendations,
            "plot_2d_json": self.plot_2d_fig.to_json() if self.plot_2d_fig else None,
            "plot_3d_json": self.plot_3d_fig.to_json() if self.plot_3d_fig else None,
            "pca_variance_explained": (
                self.pca.explained_variance_ratio_.tolist()
                if self.pca else None
            ),
            "archetype": self.archetype,
            "blue_ocean_zones": self.blue_ocean_zones,
            "blue_ocean_opportunities": self.eval_results.get("blue_ocean_opportunities", []) if self.eval_results else [],
        }

    def get_pipeline_data_for_content_lab(self) -> dict:
        """
        Return the data needed by the Content Lab endpoint to re-evaluate
        new content without re-running the full pipeline.
        """
        return {
            "store": self.store,
            "pca": self.pca,
            "scaler": self.scaler,
            "metadata": self.pca_metadata,
            "questions": self.test_questions,
            "business_context": self.business_context,
            "interpretations": self.interpretations,
        }
