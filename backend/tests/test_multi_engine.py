"""
test_multi_engine.py
--------------------
Tests for the multi-engine AI visibility evaluation pipeline.

Run with:
    cd backend
    pytest tests/test_multi_engine.py -v

For live API tests (requires .env with real keys):
    pytest tests/test_multi_engine.py -v -m live
"""

import json
import pytest
from unittest.mock import patch, MagicMock

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from pipeline.multi_engine import (
    query_openai,
    query_claude,
    query_gemini,
    query_perplexity,
    evaluate_engine_response,
    _evaluate_engine,
    _generate_comparison_summary,
    run_multi_engine_evaluation,
    ENGINE_REGISTRY,
    USER_PROMPT,
)


# ═══════════════════════════════════════════════════════════════════════════
# Test fixtures & sample data
# ═══════════════════════════════════════════════════════════════════════════

SAMPLE_BUSINESS = "Shopify"

SAMPLE_QUESTIONS = [
    "What is the best ecommerce platform for small businesses in Canada?",
    "Shopify vs WooCommerce — which is better for dropshipping?",
    "Top online store builders in 2025",
    "How do I start selling online with no technical skills?",
    "What platforms do Canadian entrepreneurs use for ecommerce?",
]

SAMPLE_ANSWER_MENTIONS = (
    "For small businesses in Canada, Shopify is widely considered one of the "
    "best ecommerce platforms. It offers an intuitive interface, built-in payment "
    "processing via Shopify Payments, and a robust app ecosystem. Other strong "
    "options include WooCommerce for WordPress users and BigCommerce for "
    "larger catalogs."
)

SAMPLE_ANSWER_NO_MENTION = (
    "For small businesses looking to sell online, popular options include "
    "WooCommerce, Squarespace Commerce, and BigCommerce. Each offers different "
    "strengths depending on your product type and technical expertise."
)

SAMPLE_EVAL_RESULT_HIGH = {
    "business_mentioned": True,
    "mention_quality": "prominent",
    "visibility_score": 9,
    "competitor_names_mentioned": ["WooCommerce", "BigCommerce"],
    "key_observation": "Shopify is the primary recommendation.",
}

SAMPLE_EVAL_RESULT_LOW = {
    "business_mentioned": False,
    "mention_quality": "absent",
    "visibility_score": 1,
    "competitor_names_mentioned": ["WooCommerce", "Squarespace"],
    "key_observation": "Shopify was not mentioned; competitors dominate.",
}


def _make_mock_openai_client(eval_response: dict):
    """Create a mock OpenAI client that returns a fixed eval JSON."""
    client = MagicMock()
    mock_resp = MagicMock()
    mock_resp.choices = [MagicMock()]
    mock_resp.choices[0].message.content = json.dumps(eval_response)
    client.chat.completions.create.return_value = mock_resp
    return client


# ═══════════════════════════════════════════════════════════════════════════
# Unit tests (no API calls — fully mocked)
# ═══════════════════════════════════════════════════════════════════════════


class TestUserPrompt:
    """Verify the prompt template works correctly."""

    def test_prompt_format(self):
        result = USER_PROMPT.format(question="What is Shopify?")
        assert "What is Shopify?" in result
        assert "Answer the following question" in result

    def test_prompt_with_special_chars(self):
        result = USER_PROMPT.format(question="What's the best {platform} for 'ecommerce'?")
        assert "'ecommerce'" in result


class TestEngineRegistry:
    """Verify all engines are registered."""

    def test_all_engines_present(self):
        assert "chatgpt" in ENGINE_REGISTRY
        assert "claude" in ENGINE_REGISTRY
        assert "gemini" in ENGINE_REGISTRY
        assert "perplexity" in ENGINE_REGISTRY

    def test_registry_values_callable(self):
        for name, fn in ENGINE_REGISTRY.items():
            assert callable(fn), f"{name} engine is not callable"


class TestEvaluateEngineResponse:
    """Test the evaluation scoring function."""

    def test_high_visibility_response(self):
        client = _make_mock_openai_client(SAMPLE_EVAL_RESULT_HIGH)
        result = evaluate_engine_response(
            question="Best ecommerce platform?",
            answer=SAMPLE_ANSWER_MENTIONS,
            business_name="Shopify",
            engine="chatgpt",
            eval_client=client,
        )
        assert result["visibility_score"] == 9
        assert result["business_mentioned"] is True
        assert result["mention_quality"] == "prominent"

    def test_low_visibility_response(self):
        client = _make_mock_openai_client(SAMPLE_EVAL_RESULT_LOW)
        result = evaluate_engine_response(
            question="Best ecommerce platform?",
            answer=SAMPLE_ANSWER_NO_MENTION,
            business_name="Shopify",
            engine="gemini",
            eval_client=client,
        )
        assert result["visibility_score"] == 1
        assert result["business_mentioned"] is False
        assert result["mention_quality"] == "absent"

    def test_handles_malformed_json(self):
        client = MagicMock()
        mock_resp = MagicMock()
        mock_resp.choices = [MagicMock()]
        mock_resp.choices[0].message.content = "not valid json"
        client.chat.completions.create.return_value = mock_resp

        result = evaluate_engine_response(
            question="test?",
            answer="some answer",
            business_name="Test",
            engine="chatgpt",
            eval_client=client,
        )
        assert result["visibility_score"] == 0
        assert result["business_mentioned"] is False

    def test_engine_name_passed_to_prompt(self):
        client = _make_mock_openai_client(SAMPLE_EVAL_RESULT_HIGH)
        evaluate_engine_response(
            question="test?",
            answer="answer",
            business_name="Biz",
            engine="perplexity",
            eval_client=client,
        )
        call_args = client.chat.completions.create.call_args
        prompt_content = call_args[1]["messages"][0]["content"]
        assert "perplexity" in prompt_content


class TestEvaluateEngine:
    """Test the full single-engine evaluation loop."""

    def test_evaluates_all_questions(self):
        client = _make_mock_openai_client(SAMPLE_EVAL_RESULT_HIGH)
        mock_query = MagicMock(return_value="Shopify is great.")

        result = _evaluate_engine(
            engine_name="chatgpt",
            query_fn=mock_query,
            api_key="fake-key",
            questions=SAMPLE_QUESTIONS[:3],
            business_name=SAMPLE_BUSINESS,
            eval_client=client,
        )

        assert result["engine"] == "chatgpt"
        assert result["available"] is True
        assert len(result["results"]) == 3
        assert mock_query.call_count == 3

    def test_calculates_avg_score(self):
        client = _make_mock_openai_client(SAMPLE_EVAL_RESULT_HIGH)
        mock_query = MagicMock(return_value="answer")

        result = _evaluate_engine(
            engine_name="claude",
            query_fn=mock_query,
            api_key="fake-key",
            questions=SAMPLE_QUESTIONS[:2],
            business_name=SAMPLE_BUSINESS,
            eval_client=client,
        )
        # All mocked as score 9
        assert result["avg_visibility_score"] == 9.0
        assert result["mention_rate"] == 100.0

    def test_handles_query_error_gracefully(self):
        """If an engine query throws, it should still evaluate (with error text)."""
        client = _make_mock_openai_client(SAMPLE_EVAL_RESULT_LOW)
        mock_query = MagicMock(side_effect=Exception("API timeout"))

        result = _evaluate_engine(
            engine_name="gemini",
            query_fn=mock_query,
            api_key="fake-key",
            questions=["test question?"],
            business_name=SAMPLE_BUSINESS,
            eval_client=client,
        )

        assert result["available"] is True
        assert len(result["results"]) == 1
        assert "[Error querying gemini" in result["results"][0]["answer"]


class TestRunMultiEngineEvaluation:
    """Test the main orchestration function."""

    def test_returns_none_when_no_keys(self):
        client = MagicMock()
        result = run_multi_engine_evaluation(
            questions=SAMPLE_QUESTIONS,
            business_name=SAMPLE_BUSINESS,
            api_keys={},
            openai_client=client,
        )
        assert result is None

    def test_returns_none_when_all_keys_empty(self):
        client = MagicMock()
        result = run_multi_engine_evaluation(
            questions=SAMPLE_QUESTIONS,
            business_name=SAMPLE_BUSINESS,
            api_keys={"openai": "", "anthropic": "", "google": "", "perplexity": ""},
            openai_client=client,
        )
        assert result is None

    @patch("pipeline.multi_engine._generate_comparison_summary", return_value="Test summary.")
    @patch("pipeline.multi_engine._evaluate_engine")
    def test_runs_available_engines_only(self, mock_eval_engine, mock_summary):
        mock_eval_engine.return_value = {
            "engine": "chatgpt",
            "available": True,
            "results": [],
            "avg_visibility_score": 7.0,
            "mention_rate": 80.0,
        }
        client = MagicMock()

        result = run_multi_engine_evaluation(
            questions=SAMPLE_QUESTIONS[:2],
            business_name=SAMPLE_BUSINESS,
            api_keys={"openai": "key1"},  # Only one engine
            openai_client=client,
        )

        assert result is not None
        assert len(result["engines"]) == 1
        assert result["engines"][0]["engine"] == "chatgpt"
        assert mock_eval_engine.call_count == 1

    @patch("pipeline.multi_engine._generate_comparison_summary", return_value="Comparison text.")
    @patch("pipeline.multi_engine._evaluate_engine")
    def test_identifies_best_and_worst(self, mock_eval_engine, mock_summary):
        def side_effect(engine_name, *args, **kwargs):
            scores = {"chatgpt": 8.0, "claude": 6.0, "gemini": 4.0}
            return {
                "engine": engine_name,
                "available": True,
                "results": [],
                "avg_visibility_score": scores[engine_name],
                "mention_rate": 50.0,
            }

        mock_eval_engine.side_effect = side_effect
        client = MagicMock()

        result = run_multi_engine_evaluation(
            questions=SAMPLE_QUESTIONS[:2],
            business_name=SAMPLE_BUSINESS,
            api_keys={"openai": "k1", "anthropic": "k2", "google": "k3"},
            openai_client=client,
        )

        assert result["best_engine"] == "chatgpt"
        assert result["worst_engine"] == "gemini"
        assert result["cross_engine_avg"] == 6.0

    @patch("pipeline.multi_engine._generate_comparison_summary", return_value="Summary.")
    @patch("pipeline.multi_engine._evaluate_engine")
    def test_handles_engine_failure(self, mock_eval_engine, mock_summary):
        """If an engine throws during evaluation, it should be marked unavailable."""
        def side_effect(engine_name, *args, **kwargs):
            if engine_name == "gemini":
                raise Exception("Gemini API down")
            return {
                "engine": engine_name,
                "available": True,
                "results": [],
                "avg_visibility_score": 7.0,
                "mention_rate": 80.0,
            }

        mock_eval_engine.side_effect = side_effect
        client = MagicMock()

        result = run_multi_engine_evaluation(
            questions=SAMPLE_QUESTIONS[:1],
            business_name=SAMPLE_BUSINESS,
            api_keys={"openai": "k1", "google": "k2"},
            openai_client=client,
        )

        engines_by_name = {e["engine"]: e for e in result["engines"]}
        assert engines_by_name["chatgpt"]["available"] is True
        assert engines_by_name["gemini"]["available"] is False

    @patch("pipeline.multi_engine._generate_comparison_summary", return_value="Summary.")
    @patch("pipeline.multi_engine._evaluate_engine")
    def test_progress_callback_called(self, mock_eval_engine, mock_summary):
        mock_eval_engine.return_value = {
            "engine": "chatgpt",
            "available": True,
            "results": [],
            "avg_visibility_score": 5.0,
            "mention_rate": 50.0,
        }
        client = MagicMock()
        callback = MagicMock()

        run_multi_engine_evaluation(
            questions=SAMPLE_QUESTIONS[:1],
            business_name=SAMPLE_BUSINESS,
            api_keys={"openai": "k1"},
            openai_client=client,
            progress_callback=callback,
        )

        callback.assert_called()


class TestGenerateComparisonSummary:
    """Test the cross-engine comparison summary generation."""

    def test_generates_summary(self):
        client = _make_mock_openai_client({"comparison_summary": "ChatGPT ranks highest."})
        engine_results = [
            {"engine": "chatgpt", "avg_visibility_score": 8.0, "mention_rate": 90.0},
            {"engine": "claude", "avg_visibility_score": 5.0, "mention_rate": 60.0},
        ]

        result = _generate_comparison_summary(engine_results, "Shopify", client)
        assert result == "ChatGPT ranks highest."

    def test_handles_malformed_json(self):
        client = MagicMock()
        mock_resp = MagicMock()
        mock_resp.choices = [MagicMock()]
        mock_resp.choices[0].message.content = "broken json"
        client.chat.completions.create.return_value = mock_resp

        result = _generate_comparison_summary([], "Test", client)
        assert "Could not generate" in result


# ═══════════════════════════════════════════════════════════════════════════
# Live API tests (require real API keys in .env)
# ═══════════════════════════════════════════════════════════════════════════

def _load_env_key(name: str) -> str:
    """Load an API key from .env file or environment."""
    from dotenv import load_dotenv
    load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))
    return os.getenv(name, "")


@pytest.mark.live
class TestLiveOpenAI:
    """Live test against OpenAI API."""

    def test_query_openai(self):
        key = _load_env_key("OPENAI_API_KEY")
        if not key:
            pytest.skip("OPENAI_API_KEY not set")
        answer = query_openai("What is the capital of Canada?", key)
        assert len(answer) > 10
        assert "Ottawa" in answer

    def test_query_openai_business(self):
        key = _load_env_key("OPENAI_API_KEY")
        if not key:
            pytest.skip("OPENAI_API_KEY not set")
        answer = query_openai("What is the best ecommerce platform for small businesses in Canada?", key)
        assert len(answer) > 50


@pytest.mark.live
class TestLiveClaude:
    """Live test against Anthropic API."""

    def test_query_claude(self):
        key = _load_env_key("ANTHROPIC_API_KEY")
        if not key:
            pytest.skip("ANTHROPIC_API_KEY not set")
        answer = query_claude("What is the capital of Canada?", key)
        assert len(answer) > 10
        assert "Ottawa" in answer


@pytest.mark.live
class TestLiveGemini:
    """Live test against Google Gemini API."""

    def test_query_gemini(self):
        key = _load_env_key("GOOGLE_API_KEY")
        if not key:
            pytest.skip("GOOGLE_API_KEY not set")
        answer = query_gemini("What is the capital of Canada?", key)
        assert len(answer) > 10
        assert "Ottawa" in answer


@pytest.mark.live
class TestLivePerplexity:
    """Live test against Perplexity API."""

    def test_query_perplexity(self):
        key = _load_env_key("PERPLEXITY_API_KEY")
        if not key:
            pytest.skip("PERPLEXITY_API_KEY not set")
        answer = query_perplexity("What is the capital of Canada?", key)
        assert len(answer) > 10


@pytest.mark.live
class TestLiveFullPipeline:
    """End-to-end live test of the multi-engine evaluation."""

    BUSINESS_QUESTIONS = [
        "What is the best ecommerce platform for small businesses in Canada?",
        "Shopify vs WooCommerce — which is better for beginners?",
        "Top Canadian tech companies for online retail solutions",
    ]

    def test_full_multi_engine_run(self):
        openai_key = _load_env_key("OPENAI_API_KEY")
        if not openai_key:
            pytest.skip("OPENAI_API_KEY not set")

        from openai import OpenAI
        client = OpenAI(api_key=openai_key)

        api_keys = {
            "openai": openai_key,
            "anthropic": _load_env_key("ANTHROPIC_API_KEY"),
            "google": _load_env_key("GOOGLE_API_KEY"),
            "perplexity": _load_env_key("PERPLEXITY_API_KEY"),
        }

        result = run_multi_engine_evaluation(
            questions=self.BUSINESS_QUESTIONS,
            business_name="Shopify",
            api_keys=api_keys,
            openai_client=client,
        )

        assert result is not None
        assert "engines" in result
        assert len(result["engines"]) >= 1
        assert "best_engine" in result
        assert "worst_engine" in result
        assert "cross_engine_avg" in result
        assert isinstance(result["cross_engine_avg"], float)

        # Print results for manual review
        print("\n" + "=" * 60)
        print("MULTI-ENGINE EVALUATION RESULTS")
        print("=" * 60)
        for engine in result["engines"]:
            status = "OK" if engine["available"] else "FAILED"
            print(f"\n{engine['engine'].upper()} [{status}]")
            if engine["available"]:
                print(f"  Avg Score: {engine['avg_visibility_score']}/10")
                print(f"  Mention Rate: {engine['mention_rate']}%")
                for r in engine["results"]:
                    print(f"  Q: {r['question'][:60]}...")
                    print(f"     Score: {r['visibility_score']}/10 | {r['mention_quality']}")
                    print(f"     Answer: {r['answer'][:100]}...")
        print(f"\nBest: {result['best_engine']}")
        print(f"Worst: {result['worst_engine']}")
        print(f"Cross-engine avg: {result['cross_engine_avg']}")
        print(f"Summary: {result['comparison_summary']}")


# ═══════════════════════════════════════════════════════════════════════════
# Sample test question sets for different business types
# ═══════════════════════════════════════════════════════════════════════════

SAMPLE_TEST_SCENARIOS = {
    "ecommerce_platform": {
        "business_name": "Shopify",
        "questions": [
            "What is the best ecommerce platform for small businesses in Canada?",
            "Shopify vs WooCommerce — which is better for dropshipping?",
            "Top online store builders in 2025",
            "How do I start selling online with no technical skills?",
            "What platforms do Canadian entrepreneurs use for ecommerce?",
            "Best payment processing for Canadian online stores",
            "Which ecommerce platform has the lowest transaction fees?",
            "How to migrate from Etsy to my own online store",
            "Best ecommerce tools for subscription-based businesses",
            "What ecommerce platform do most successful Shopify stores use?",
        ],
    },
    "canadian_university": {
        "business_name": "University of Toronto",
        "questions": [
            "What are the best universities in Canada for computer science?",
            "University of Toronto vs McGill — which is better for engineering?",
            "Top research universities in Ontario",
            "Best Canadian universities for international students",
            "How to apply to graduate school in Canada",
            "What Canadian universities have the best AI research programs?",
            "Most affordable top universities in Canada",
            "University of Toronto acceptance rate and requirements",
            "Best co-op programs at Canadian universities",
            "Top MBA programs in Toronto",
        ],
    },
    "canadian_nonprofit": {
        "business_name": "United Way",
        "questions": [
            "What are the best charities to donate to in Canada?",
            "How does United Way help Canadian communities?",
            "Top nonprofits fighting poverty in Canada",
            "Where to volunteer in Toronto for community service",
            "Best charitable organizations for tax deductions in Canada",
            "How to support homeless communities in Canadian cities",
            "Most impactful nonprofits in Canada 2025",
            "United Way vs Red Cross — where should I donate?",
            "Community development organizations in Ontario",
            "How do Canadian nonprofits measure their impact?",
        ],
    },
    "local_restaurant": {
        "business_name": "Canoe Restaurant",
        "questions": [
            "Best fine dining restaurants in downtown Toronto",
            "Top Canadian cuisine restaurants in Toronto",
            "Where to eat for a business dinner in Toronto?",
            "Best restaurants with a view in Toronto",
            "Canoe Restaurant Toronto reviews and menu",
            "Farm-to-table dining in Toronto",
            "Most popular upscale restaurants in the Financial District Toronto",
            "Best places for Canadian wine pairings in Toronto",
            "Where to take clients for dinner in Toronto?",
            "Award-winning restaurants in Toronto 2025",
        ],
    },
    "tech_startup": {
        "business_name": "Wealthsimple",
        "questions": [
            "Best robo-advisors in Canada",
            "Wealthsimple vs Questrade — which is better for beginners?",
            "How to start investing in Canada with little money",
            "Top fintech companies in Canada",
            "Best TFSA investment platforms in Canada",
            "Cheapest way to buy ETFs in Canada",
            "What investment app do Canadians recommend?",
            "Wealthsimple Trade vs Interactive Brokers for Canadian stocks",
            "Best apps for passive investing in Canada",
            "How do Canadian robo-advisors compare to US ones?",
        ],
    },
}


class TestSampleScenarios:
    """Verify the sample test scenarios are well-formed."""

    def test_all_scenarios_have_required_fields(self):
        for name, scenario in SAMPLE_TEST_SCENARIOS.items():
            assert "business_name" in scenario, f"{name} missing business_name"
            assert "questions" in scenario, f"{name} missing questions"
            assert len(scenario["questions"]) == 10, f"{name} should have 10 questions"

    def test_questions_are_diverse(self):
        """Each scenario should have a mix of question types."""
        for name, scenario in SAMPLE_TEST_SCENARIOS.items():
            questions = " ".join(scenario["questions"]).lower()
            # Should have at least some variety in question types
            has_comparison = "vs" in questions or "compare" in questions or "which is better" in questions
            has_best = "best" in questions or "top" in questions
            assert has_comparison or has_best, f"{name} lacks question variety"

    def test_business_name_appears_in_at_least_one_question(self):
        """At least one question should directly reference the business."""
        for name, scenario in SAMPLE_TEST_SCENARIOS.items():
            biz = scenario["business_name"].lower()
            mentions = sum(1 for q in scenario["questions"] if biz in q.lower())
            assert mentions >= 1, f"{name}: business name should appear in at least 1 question"
