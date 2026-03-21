"""
pipeline/__init__.py
--------------------
Pipeline module containing ingestion, retrieval, embeddings, and analysis components.
"""

from .orchestrator import AnalysisPipeline

__all__ = ["AnalysisPipeline"]
