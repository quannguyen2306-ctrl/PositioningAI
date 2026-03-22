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
  8. Run RAG evaluation
  9. Fit PCA, interpret dimensions, generate recommendations
"""

from openai import OpenAI
from .ingestion import fetch_url, chunk_text, extract_business_context
from .retrieval import search_competitors, fetch_competitor_docs
from .embeddings import EmbeddingStore
from .rag_evaluator import generate_test_questions, run_evaluation
from .pca_visualizer import fit_pca, interpret_dimensions, plot_2d, plot_3d
from .recommender import generate_recommendations
from .multi_engine import run_multi_engine_evaluation


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
        result_callback=None,
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
        self.result_callback = result_callback

        # Multi-engine API keys
        self.google_api_key = google_api_key
        self.anthropic_api_key = anthropic_api_key
        self.perplexity_api_key = perplexity_api_key

        # Pipeline outputs
        self.business_context = None
        self.user_text = None
        self.competitor_docs = None
        self.store = None
        self.eval_results = None
        self.multi_engine_results = None
        self.pca = None
        self.coords = None
        self.interpretations = None
        self.recommendations = None
        self.plot_2d_fig = None
        self.plot_3d_fig = None

    def _report_progress(self, stage: int, total_stages: int, message: str):
        """Helper to call progress callback."""
        if self.progress_callback:
            percent = int((stage / total_stages) * 100)
            self.progress_callback(percent, message)

    def _report_result(self, event: str, payload: dict):
        """Helper to call result callback with intermediate results."""
        if self.result_callback:
            self.result_callback(event, payload)

    def run(self) -> dict:
        """
        Execute the full 9-stage pipeline.
        Returns: dict with all results and visualizations.
        """
        total_stages = 10

        # --- Stage 1: Fetch user URL ---
        self._report_progress(1, total_stages, "Fetching your business website...")
        self.user_text = fetch_url(self.business_url)

        # --- Stage 2: Extract business context ---
        self._report_progress(2, total_stages, "Extracting business information...")
        self.business_context = extract_business_context(self.user_text, self.openai_client)
        self._report_result("profile", {"data": self.business_context})

        # --- Stage 3: Search for competitors ---
        self._report_progress(3, total_stages, "Searching for competitors...")
        search_query = self.business_context.get("search_query", "")
        competitor_urls = search_competitors(
            search_query,
            self.serper_api_key,
            n=self.n_competitors,
        )
        self._report_result("competitors", {"competitors": competitor_urls})

        # --- Stage 4: Fetch competitor documents ---
        self._report_progress(4, total_stages, f"Fetching {len(competitor_urls)} competitor websites...")
        self.competitor_docs = fetch_competitor_docs(competitor_urls)

        # --- Stage 5: Chunk documents ---
        self._report_progress(5, total_stages, "Chunking documents...")
        user_chunks = chunk_text(self.user_text)
        comp_chunks_map = {
            doc["url"]: chunk_text(doc["text"]) for doc in self.competitor_docs
        }

        # --- Stage 6: Embed and store ---
        self._report_progress(6, total_stages, "Building semantic embeddings...")
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

        # --- Stage 7: Generate test questions ---
        self._report_progress(7, total_stages, "Generating test questions...")
        test_questions = generate_test_questions(
            self.business_context,
            self.openai_client,
            self.custom_questions,
        )
        # Limit to requested number
        test_questions = test_questions[:self.n_questions]
        self._report_result("questions", {"questions": test_questions})

        # --- Stage 8: Run RAG evaluation ---
        self._report_progress(8, total_stages, "Evaluating visibility in AI responses...")
        self.eval_results = run_evaluation(
            test_questions,
            self.store,
            self.openai_client,
            self.business_context.get("business_name", "Your Business"),
            progress_callback=None,  # Sub-progress handled internally
        )
        self._report_result("eval", {"eval": self.eval_results})

        # --- Stage 9: Multi-engine evaluation ---
        api_keys = {
            "openai": self.openai_api_key,
            "anthropic": self.anthropic_api_key,
            "google": self.google_api_key,
            "perplexity": self.perplexity_api_key,
        }
        # Only run if at least one engine key is available
        has_engine_keys = any(api_keys.get(k) for k in api_keys)
        if has_engine_keys:
            self._report_progress(9, total_stages, "Testing across AI engines...")
            self.multi_engine_results = run_multi_engine_evaluation(
                test_questions,
                self.business_context.get("business_name", "Your Business"),
                api_keys,
                self.openai_client,
                progress_callback=self.progress_callback,
            )
        else:
            self._report_progress(9, total_stages, "Skipping multi-engine test (no extra API keys)...")

        # --- Stage 10: PCA + recommendations ---
        self._report_progress(10, total_stages, "Analyzing competitive positioning...")
        embeddings, metadata = self.store.get_all_for_pca()

        self.pca, _, self.coords = fit_pca(embeddings, n_components=3)
        self.interpretations = interpret_dimensions(
            self.pca,
            metadata,
            self.coords,
            self.openai_client,
            n_samples=5,
        )

        # Emit PCA results
        pca_points = [
            {
                "components": self.coords[i].tolist(),
                "source": m["source"],
                "domain": m["domain"],
                "text": m.get("text", "")[:200],
            }
            for i, m in enumerate(metadata)
        ]
        self._report_result("pca", {
            "points": pca_points,
            "interpretations": self.interpretations,
        })

        self.plot_2d_fig = plot_2d(
            self.coords,
            metadata,
            self.interpretations,
            self.business_context.get("business_name", "Your Business"),
        )

        self.plot_3d_fig = plot_3d(
            self.coords,
            metadata,
            self.interpretations,
            self.business_context.get("business_name", "Your Business"),
        )

        self.recommendations = generate_recommendations(
            self.business_context,
            self.eval_results,
            self.interpretations,
            self.competitor_docs,
            self.openai_client,
        )
        self._report_result("recommendations", {"recs": self.recommendations})

        return self._compile_results()

    def _compile_results(self) -> dict:
        """Compile all results into a structured output dict."""
        return {
            "business_context": self.business_context,
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
        }
