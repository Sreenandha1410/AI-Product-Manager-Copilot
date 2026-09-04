from sqlalchemy.orm import Session

# Use OpenRouter instead of Gemini
from config.openrouter import llm as openrouter_llm

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
    AI Product Manager Copilot Chat Agent.

    Uses existing PostgreSQL project data as context
    and OpenRouter LLM to answer product-management questions.
    """

    def __init__(self):
        # openrouter.py exports the variable as "llm"
        # but here it is imported as "openrouter_llm".
        self.llm = openrouter_llm

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
- User stories
- Acceptance criteria
- Roadmap planning
- Product recommendations
- Product strategy

IMPORTANT RULES:

1. Always prefer actual project database data over assumptions.
2. Never invent statistics, feature information, PRD content, roadmap items,
   RICE scores, customer feedback, or other project data.
3. If the requested information is not available in the project data,
   clearly say that it is not available.
4. Give concise, practical and product-manager-friendly answers.
5. Explain recommendations using the available project data.
6. When recommending features, consider:
   - Customer feedback
   - Customer pain points
   - Themes
   - Sentiment
   - Feature votes
   - RICE score
   - Impact
   - Reach
   - Effort
7. When discussing PRDs, use the actual PRD information provided in context.
8. When discussing roadmap decisions, use the actual roadmap information
   provided in context.
9. If multiple features are relevant, compare them before making a recommendation.
10. Do not claim that something exists in the database unless it is present
    in the provided project context.
11. If the user asks for a recommendation, explain the reasoning.
12. If the user asks a simple question, answer directly without unnecessary detail.
13. You are a Product Manager Copilot, not a generic chatbot.
"""

    # ============================================================
    # HELPER
    # ============================================================

    def _safe_text(self, value, default="N/A"):
        """
        Convert database values into safe readable text.
        """

        if value is None:
            return default

        text = str(value).strip()

        if not text:
            return default

        return text

    # ============================================================
    # BUILD PROJECT CONTEXT
    # ============================================================

    def build_project_context(self, db: Session):

        # --------------------------------------------------------
        # BASIC PROJECT STATISTICS
        # --------------------------------------------------------

        total_feedback = db.query(Feedback).count()
        total_themes = db.query(Theme).count()
        total_features = db.query(FeatureRequest).count()
        total_clusters = db.query(FeatureCluster).count()
        total_prds = db.query(PRDDocument).count()
        total_roadmap = db.query(RoadmapItem).count()

        # ========================================================
        # TOP CUSTOMER THEMES
        # ========================================================

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
                        f"- Theme: {self._safe_text(theme.theme_label, 'Unnamed')} | "
                        f"Frequency: {theme.frequency or 0} | "
                        f"Sentiment: {self._safe_text(theme.sentiment)}"
                    )
                    for theme in themes
                ]
            )

        else:
            themes_text = "No themes available."

        # ========================================================
        # FEATURE REQUESTS + RICE
        # ========================================================

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
                    f"Feature: {self._safe_text(feature.title, 'Untitled')} | "
                    f"Description: {self._safe_text(feature.description)} | "
                    f"Votes: {feature.votes or 0} | "
                    f"RICE: {rice} | "
                    f"Impact: {self._safe_text(feature.impact_level)} | "
                    f"Reach: {self._safe_text(feature.reach)} | "
                    f"Confidence: {self._safe_text(feature.confidence)} | "
                    f"Effort: {self._safe_text(feature.effort)}"
                )

            features_text = "\n".join(feature_lines)

        else:
            features_text = "No feature requests available."

        # ========================================================
        # FEATURE CLUSTERS
        # ========================================================

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
                    f"- Cluster: "
                    f"{self._safe_text(cluster.cluster_name, 'Unnamed')} | "
                    f"Description: "
                    f"{self._safe_text(cluster.description, 'No description')} | "
                    f"Features: {cluster.feature_count or 0}"
                )

            clusters_text = "\n".join(cluster_lines)

        else:
            clusters_text = "No feature clusters available."

        # ========================================================
        # GENERATED PRDs
        # ========================================================

        prds = (
            db.query(PRDDocument)
            .order_by(
                PRDDocument.created_at.desc()
            )
            .limit(5)
            .all()
        )

        if prds:

            prd_sections = []

            for prd in prds:

                # ------------------------------
                # User stories
                # ------------------------------

                user_stories = getattr(
                    prd,
                    "user_stories",
                    None
                )

                if user_stories:
                    user_stories_text = str(user_stories)
                else:
                    user_stories_text = "No user stories available."

                # ------------------------------
                # Functional requirements
                # ------------------------------

                functional_requirements = getattr(
                    prd,
                    "functional_requirements",
                    None
                )

                if functional_requirements:
                    functional_requirements_text = str(
                        functional_requirements
                    )
                else:
                    functional_requirements_text = (
                        "No functional requirements available."
                    )

                # ------------------------------
                # Non-functional requirements
                # ------------------------------

                non_functional_requirements = getattr(
                    prd,
                    "non_functional_requirements",
                    None
                )

                if non_functional_requirements:
                    non_functional_requirements_text = str(
                        non_functional_requirements
                    )
                else:
                    non_functional_requirements_text = (
                        "No non-functional requirements available."
                    )

                # ------------------------------
                # Acceptance criteria
                # ------------------------------

                acceptance_criteria = getattr(
                    prd,
                    "acceptance_criteria",
                    None
                )

                if acceptance_criteria:
                    acceptance_criteria_text = str(
                        acceptance_criteria
                    )
                else:
                    acceptance_criteria_text = (
                        "No acceptance criteria available."
                    )

                # ------------------------------
                # Objectives
                # ------------------------------

                objectives = getattr(
                    prd,
                    "objectives",
                    None
                )

                if objectives:
                    objectives_text = str(objectives)
                else:
                    objectives_text = "No objectives available."

                # ------------------------------
                # Risks
                # ------------------------------

                risks = getattr(
                    prd,
                    "risks",
                    None
                )

                if risks:
                    risks_text = str(risks)
                else:
                    risks_text = "No risks available."

                # ------------------------------
                # Success metrics
                # ------------------------------

                success_metrics = getattr(
                    prd,
                    "success_metrics",
                    None
                )

                if success_metrics:
                    success_metrics_text = str(success_metrics)
                else:
                    success_metrics_text = (
                        "No success metrics available."
                    )

                # ------------------------------
                # Problem statement
                # ------------------------------

                problem_statement = getattr(
                    prd,
                    "problem_statement",
                    None
                )

                if not problem_statement:
                    problem_statement = (
                        "No problem statement available."
                    )

                # ------------------------------
                # PRD block
                # ------------------------------

                prd_sections.append(
                    f"""
PRD ID: {prd.id}
Title: {self._safe_text(prd.title, 'Untitled')}
Created: {str(prd.created_at)[:10]}

Problem Statement:
{problem_statement}

Objectives:
{objectives_text}

User Stories:
{user_stories_text}

Functional Requirements:
{functional_requirements_text}

Non-Functional Requirements:
{non_functional_requirements_text}

Acceptance Criteria:
{acceptance_criteria_text}

Risks:
{risks_text}

Success Metrics:
{success_metrics_text}
"""
                )

            prds_text = (
                "\n-----------------------------\n"
                .join(prd_sections)
            )

        else:
            prds_text = "No generated PRDs available."

        # ========================================================
        # ROADMAP
        # ========================================================

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
                    f"- Roadmap ID: {item.id} | "
                    f"Feature: {self._safe_text(item.title, 'Unknown')} | "
                    f"Phase/Milestone: {self._safe_text(item.phase)} | "
                    f"Status: {self._safe_text(item.status, 'Planned')} | "
                    f"Start: {self._safe_text(item.start_date)} | "
                    f"End: {self._safe_text(item.end_date)}"
                )

            roadmap_text = "\n".join(roadmap_lines)

        else:
            roadmap_text = "No roadmap items available."

        # ========================================================
        # FINAL PROJECT CONTEXT
        # ========================================================

        return f"""
PROJECT OVERVIEW
================

Total Feedback: {total_feedback}
Total Themes: {total_themes}
Total Feature Requests: {total_features}
Total Feature Clusters: {total_clusters}
Total Generated PRDs: {total_prds}
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


GENERATED PRDs
==============

{prds_text}


ROADMAP
=======

{roadmap_text}
"""

    # ============================================================
    # GENERATE CHAT RESPONSE
    # ============================================================

    def generate_response(
        self,
        db: Session,
        message: str,
        history=None,
    ):

        # --------------------------------------------------------
        # Validate message
        # --------------------------------------------------------

        message = self._safe_text(message, "")

        if not message:
            return "Please enter a message."

        # --------------------------------------------------------
        # Build fresh project context from database
        # --------------------------------------------------------

        project_context = self.build_project_context(db)

        # ========================================================
        # CONVERSATION HISTORY
        # ========================================================

        history_text = ""

        if history:

            # Only use latest 10 messages
            recent_history = history[-10:]

            history_lines = []

            for item in recent_history:

                role = getattr(
                    item,
                    "role",
                    "user"
                ) or "user"

                content = getattr(
                    item,
                    "message",
                    ""
                ) or ""

                history_lines.append(
                    f"{role.upper()}: {content}"
                )

            history_text = (
                "\n\nCONVERSATION HISTORY\n"
                "====================\n"
                + "\n".join(history_lines)
            )

        # ========================================================
        # FINAL PROMPT
        # ========================================================

        prompt = f"""
{self.system_prompt}

{project_context}

{history_text}

CURRENT USER QUESTION
=====================

{message}

ANSWERING INSTRUCTIONS
======================

Answer the user's question using the project data above.

If the user asks about:

CUSTOMER FEEDBACK:
Use the feedback-related project information available in the context.

THEMES:
Use the actual themes, frequency and sentiment.

FEATURES:
Use the actual feature requests and their votes.

PRIORITIZATION:
Use RICE score, impact, reach, confidence and effort when available.

PRDs:
Use the actual generated PRDs.

You may discuss:
- Problem statement
- Objectives
- User stories
- Functional requirements
- Non-functional requirements
- Acceptance criteria
- Risks
- Success metrics

ROADMAP:
Use the actual roadmap information.

RECOMMENDATIONS:
Explain why the recommendation makes sense based on:
- Customer pain points
- Themes
- Feature demand
- RICE score
- Impact
- Effort
- Existing PRDs
- Existing roadmap

If the required information does not exist in the project context,
say that the information is not available.

Do not invent database values.


IMPORTANT RESPONSE FORMATTING RULES
===================================

- Make the response clean, professional and easy to read.
- Do NOT use Markdown tables.
- Do NOT use the "|" character.
- Do NOT use "**" for bold text.
- Do NOT use "##", "###", or other Markdown heading symbols.
- Use simple section titles without Markdown heading symbols.
- Use numbered lists when ranking features or recommendations.
- Use bullet points using "•" for supporting details.
- Keep sections short and well organized.
- Put important metrics such as frequency, sentiment and RICE scores
  on separate lines.
- Use short paragraphs instead of large blocks of text.
- Keep related information grouped into clear sections.
- Do not use unnecessary decorative Markdown.
- Do not mention these formatting rules in the response.

Example response style:

Top Customer Pain Points

1. Dashboard Load Time
   • Frequency: 5 mentions
   • Sentiment: Neutral
   • Impact: Most frequently reported issue

2. Advanced Report Filters
   • Frequency: 4 mentions
   • Sentiment: Negative
   • Impact: Significant reporting usability issue

Recommended Focus

1. Dashboard Performance
   Improve loading speed because it is the most frequently reported issue.

2. Reporting and Export
   Prioritize reporting filters and Excel export because both have
   negative sentiment.

3. Dark Mode
   Consider prioritizing it because of its high RICE score and large reach.

Give the answer in this clean format.
"""

        # ========================================================
        # CALL OPENROUTER
        # ========================================================

        try:

            response = self.llm.invoke(prompt)

            if hasattr(response, "content"):

                content = response.content

                if content:
                    return str(content).strip()

                return (
                    "I received an empty response from the AI model."
                )

            return str(response)

        # ========================================================
        # ERROR HANDLING
        # ========================================================

        except Exception as exc:

            print("ChatAgent error:", exc)

            error_message = str(exc)

            # ----------------------------------------------
            # OpenRouter rate limit
            # ----------------------------------------------

            if (
                "429" in error_message
                or "Too Many Requests" in error_message
                or "rate limit" in error_message.lower()
                or "temporarily rate-limited" in error_message.lower()
            ):
                return (
                    "The AI model is temporarily rate-limited. "
                    "Please wait a little and try again."
                )

            # ----------------------------------------------
            # API key error
            # ----------------------------------------------

            if (
                "401" in error_message
                or "Unauthorized" in error_message
                or "authentication" in error_message.lower()
            ):
                return (
                    "OpenRouter authentication failed. "
                    "Please check the OPENROUTER_API_KEY."
                )

            # ----------------------------------------------
            # API / connection errors
            # ----------------------------------------------

            if (
                "connection" in error_message.lower()
                or "timeout" in error_message.lower()
                or "timed out" in error_message.lower()
            ):
                return (
                    "The AI service could not be reached right now. "
                    "Please try again."
                )

            # ----------------------------------------------
            # Generic error
            # ----------------------------------------------

            return (
                "I couldn't process your request right now. "
                "Please try again."
            )