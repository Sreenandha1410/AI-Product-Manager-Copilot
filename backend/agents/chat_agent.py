# backend/agents/chat_agent.py

from sqlalchemy.orm import Session

from config.gemini import llm

from models import (
    Feedback,
    Theme,
    FeatureRequest,
    FeatureCluster,
    PriorityScore,
    PRDDocument,
    RoadmapItem,
)


class ChatAgent:
    """
    AI Product Manager Copilot.

    Uses existing PostgreSQL project data as context
    and Gemini to answer product-management questions.
    """

    def __init__(self):
        self.llm = llm

        self.system_prompt = """
You are an AI Product Manager Copilot.

You help product managers with:

- Customer feedback analysis
- Customer pain points
- Themes and sentiment
- Feature requests
- Feature prioritization
- RICE scores
- PRD analysis
- Roadmap planning
- Product recommendations

Always use the provided project data when possible.

Rules:
1. Prefer actual project data over assumptions.
2. Do not invent statistics or product information.
3. If data is unavailable, clearly say so.
4. Give concise and practical answers.
5. Explain recommendations using available project data.
6. When recommending features, consider RICE scores and customer pain points.
7. When discussing roadmap decisions, use existing roadmap information.
"""

    # --------------------------------------------------
    # BUILD PROJECT CONTEXT
    # --------------------------------------------------

    def build_project_context(self, db: Session):

        # ----------------------------------------------
        # Basic statistics
        # ----------------------------------------------

        total_feedback = db.query(Feedback).count()
        total_themes = db.query(Theme).count()
        total_features = db.query(FeatureRequest).count()
        total_clusters = db.query(FeatureCluster).count()
        total_prds = db.query(PRDDocument).count()
        total_roadmap = db.query(RoadmapItem).count()

        # ----------------------------------------------
        # Top Themes
        # ----------------------------------------------

        themes = (
            db.query(
                Theme.theme_label,
                Theme.frequency,
                Theme.sentiment,
            )
            .order_by(
                Theme.frequency.desc()
            )
            .limit(10)
            .all()
        )

        if themes:
            themes_text = "\n".join(
                [
                    (
                        f"- Theme: {theme.theme_label} | "
                        f"Frequency: {theme.frequency} | "
                        f"Sentiment: {theme.sentiment}"
                    )
                    for theme in themes
                ]
            )
        else:
            themes_text = "No themes available."

        # ----------------------------------------------
        # Feature Requests + RICE
        # ----------------------------------------------

        feature_data = (
            db.query(
                FeatureRequest.id,
                FeatureRequest.title,
                FeatureRequest.description,
                FeatureRequest.votes,
                PriorityScore.rice_score,
                PriorityScore.impact_level,
                PriorityScore.reach,
                PriorityScore.impact,
                PriorityScore.confidence,
                PriorityScore.effort,
            )
            .outerjoin(
                PriorityScore,
                PriorityScore.feature_id == FeatureRequest.id,
            )
            .order_by(
                PriorityScore.rice_score.desc().nullslast()
            )
            .limit(10)
            .all()
        )

        if feature_data:

            feature_lines = []

            for feature in feature_data:

                rice = (
                    round(feature.rice_score, 2)
                    if feature.rice_score is not None
                    else "N/A"
                )

                feature_lines.append(
                    f"- ID: {feature.id} | "
                    f"Feature: {feature.title} | "
                    f"Votes: {feature.votes or 0} | "
                    f"RICE: {rice} | "
                    f"Impact: {feature.impact_level or 'N/A'} | "
                    f"Reach: {feature.reach or 'N/A'} | "
                    f"Effort: {feature.effort or 'N/A'}"
                )

            features_text = "\n".join(feature_lines)

        else:
            features_text = "No feature requests available."

        # ----------------------------------------------
        # Feature Clusters
        # ----------------------------------------------

        clusters = (
            db.query(
                FeatureCluster.cluster_name,
                FeatureCluster.description,
                FeatureCluster.feature_count,
            )
            .order_by(
                FeatureCluster.feature_count.desc()
            )
            .limit(10)
            .all()
        )

        if clusters:

            cluster_lines = []

            for cluster in clusters:

                cluster_lines.append(
                    f"- {cluster.cluster_name} | "
                    f"{cluster.description or 'No description'} | "
                    f"Features: {cluster.feature_count or 0}"
                )

            clusters_text = "\n".join(cluster_lines)

        else:
            clusters_text = "No feature clusters available."

        # ----------------------------------------------
        # Recent PRDs
        # ----------------------------------------------

        prds = (
            db.query(PRDDocument)
            .order_by(
                PRDDocument.created_at.desc()
            )
            .limit(5)
            .all()
        )

        if prds:

            prd_lines = []

            for prd in prds:

                prd_lines.append(
                    f"- PRD ID: {prd.id} | "
                    f"Title: {prd.title} | "
                    f"Created: {str(prd.created_at)[:10]}"
                )

            prds_text = "\n".join(prd_lines)

        else:
            prds_text = "No PRDs available."

        # ----------------------------------------------
        # Roadmap
        # ----------------------------------------------

        roadmap = (
            db.query(
                RoadmapItem.id,
                RoadmapItem.feature_id,
                RoadmapItem.phase,
                RoadmapItem.status,
                RoadmapItem.start_date,
                RoadmapItem.end_date,
                FeatureRequest.title,
            )
            .outerjoin(
                FeatureRequest,
                FeatureRequest.id == RoadmapItem.feature_id,
            )
            .order_by(
                RoadmapItem.id.desc()
            )
            .limit(10)
            .all()
        )

        if roadmap:

            roadmap_lines = []

            for item in roadmap:

                roadmap_lines.append(
                    f"- Feature: {item.title or 'Unknown'} | "
                    f"Phase: {item.phase or 'N/A'} | "
                    f"Status: {item.status or 'Planned'} | "
                    f"Start: {item.start_date or 'N/A'} | "
                    f"End: {item.end_date or 'N/A'}"
                )

            roadmap_text = "\n".join(roadmap_lines)

        else:
            roadmap_text = "No roadmap items available."

        # ----------------------------------------------
        # Final Context
        # ----------------------------------------------

        return f"""
PROJECT OVERVIEW
================

Total Feedback: {total_feedback}
Total Themes: {total_themes}
Total Feature Requests: {total_features}
Total Feature Clusters: {total_clusters}
Total PRDs: {total_prds}
Total Roadmap Items: {total_roadmap}


TOP CUSTOMER THEMES
===================

{themes_text}


FEATURE PRIORITIZATION
======================

{features_text}


FEATURE CLUSTERS
================

{clusters_text}


RECENT PRDs
===========

{prds_text}


ROADMAP
=======

{roadmap_text}
"""

    # --------------------------------------------------
    # GENERATE RESPONSE
    # --------------------------------------------------

    def generate_response(
        self,
        db: Session,
        message: str,
        history=None,
    ):

        project_context = self.build_project_context(db)

        # ----------------------------------------------
        # Conversation History
        # ----------------------------------------------

        history_text = ""

        if history:

            recent_history = history[-10:]

            history_lines = []

            for item in recent_history:

                role = item.role or "user"
                content = item.message or ""

                history_lines.append(
                    f"{role.upper()}: {content}"
                )

            history_text = (
                "\n\nCONVERSATION HISTORY\n"
                "====================\n"
                + "\n".join(history_lines)
            )

        # ----------------------------------------------
        # Final Gemini Prompt
        # ----------------------------------------------

        prompt = f"""
{self.system_prompt}

{project_context}

{history_text}

CURRENT USER QUESTION
=====================

{message}

Answer the user based on the project data.

If the user asks for a recommendation:
- explain why
- use available project data
- mention relevant themes, features, RICE scores, or roadmap information

If the required information is not available:
clearly say that it is not available.

Do not invent database values.
"""

        try:

            response = self.llm.invoke(prompt)

            if hasattr(response, "content"):
                return response.content

            return str(response)

        except Exception as exc:

            print("ChatAgent error:", exc)

            return (
                "I couldn't process your request right now. "
                "Please try again."
            )