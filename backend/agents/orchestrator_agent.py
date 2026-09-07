from sqlalchemy.orm import Session

from agents.theme_agent import ThemeAgent
from agents.sentiment_agent import SentimentAgent
from agents.clustering_agent import ClusteringAgent
from agents.prioritization_agent import PrioritizationAgent


class Orchestrator:
    """
    Coordinates the AI Product Manager Copilot pipeline.

    Pipeline:

    Feedback
        ↓
    Theme Analysis
        ↓
    Sentiment Analysis
        ↓
    Clustering
        ↓
    Feature Prioritization
    """

    def __init__(self):
        self.theme_agent = ThemeAgent()
        self.sentiment_agent = SentimentAgent()
        self.clustering_agent = ClusteringAgent()
        self.prioritization_agent = PrioritizationAgent()

    def run_pipeline(self, db: Session):
        results = {}

        # --------------------------------------------------
        # STEP 1: Theme Analysis
        # --------------------------------------------------
        try:
            theme_result = self.theme_agent.run()

            results["themes"] = {
                "status": "completed",
                "result": theme_result,
            }

        except Exception as exc:
            results["themes"] = {
                "status": "failed",
                "error": str(exc),
            }

        # --------------------------------------------------
        # STEP 2: Sentiment Analysis
        # --------------------------------------------------
        try:
            sentiment_result = self.sentiment_agent.run()

            results["sentiment"] = {
                "status": "completed",
                "result": sentiment_result,
            }

        except Exception as exc:
            results["sentiment"] = {
                "status": "failed",
                "error": str(exc),
            }

        # --------------------------------------------------
        # STEP 3: Clustering
        # --------------------------------------------------
        try:
            clustering_result = self.clustering_agent.run()

            results["clusters"] = {
                "status": "completed",
                "result": clustering_result,
            }

        except Exception as exc:
            results["clusters"] = {
                "status": "failed",
                "error": str(exc),
            }

        # --------------------------------------------------
        # STEP 4: Prioritization
        # --------------------------------------------------
        try:
            priority_result = self.prioritization_agent.run()

            results["prioritization"] = {
                "status": "completed",
                "result": priority_result,
            }

        except Exception as exc:
            results["prioritization"] = {
                "status": "failed",
                "error": str(exc),
            }

        return {
            "status": "completed",
            "pipeline": results,
        }