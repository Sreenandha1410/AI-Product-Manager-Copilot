"""
Prioritization Agent
====================

Responsible for analyzing feature requests and determining
which product features should be implemented first.

The agent combines:

1. Customer demand
2. Feature votes
3. Product analytics
4. Support tickets
5. Gemini 2.5 reasoning
6. RICE scoring
7. ICE scoring

Output:
    priority_scores table

Architecture:

Feature Requests
       |
       +---- Votes
       |
       +---- Analytics
       |
       +---- Support Tickets
       |
       v
   Gemini 2.5
       |
       +---- Impact
       +---- Confidence
       +---- Effort
       |
       v
   RICE + ICE
       |
       v
   Ranking
       |
       v
 priority_scores
"""

import json
import re
from typing import Dict, List, Optional

from sqlalchemy import func, or_

from agents.base_agent import BaseAgent

from models import (
    FeatureRequest,
    PriorityScore,
    Analytics,
    SupportTicket,
)


class PrioritizationAgent(BaseAgent):
    """
    AI-powered feature prioritization agent.

    This agent is called after the Clustering Agent has generated
    feature requests.

    It analyzes each feature and calculates RICE and ICE scores.
    """

    def __init__(self):

        super().__init__("Prioritization Agent")

        self.log_info("Prioritization Agent initialized.")

    # =========================================================
    # 1. GET FEATURE REQUESTS
    # =========================================================

    def get_feature_requests(
        self,
        feature_id: Optional[int] = None
    ) -> List[FeatureRequest]:
        """
        Retrieve feature requests from PostgreSQL.

        If feature_id is supplied, only that feature is returned.
        """

        query = self.db.query(FeatureRequest)

        if feature_id is not None:

            query = query.filter(
                FeatureRequest.id == feature_id
            )

        return query.all()

    # =========================================================
    # 2. GET ANALYTICS
    # =========================================================

    def get_analytics(
        self,
        feature_title: str
    ) -> Optional[Analytics]:
        """
        Find product analytics related to a feature.
        """

        if not feature_title:
            return None

        search = f"%{feature_title}%"

        return (
            self.db.query(Analytics)
            .filter(
                or_(
                    Analytics.feature.ilike(search),
                    func.lower(Analytics.feature).contains(
                        feature_title.lower()
                    )
                )
            )
            .first()
        )

    # =========================================================
    # 3. GET SUPPORT TICKETS
    # =========================================================

    def get_support_tickets(
        self,
        feature: FeatureRequest
    ) -> List[SupportTicket]:
        """
        Find support tickets that appear to be related
        to the feature request.
        """

        keywords = self.extract_keywords(
            feature.title
        )

        if not keywords:

            return []

        conditions = []

        for keyword in keywords:

            search = f"%{keyword}%"

            conditions.append(
                or_(
                    SupportTicket.title.ilike(search),
                    SupportTicket.description.ilike(search)
                )
            )

        return (
            self.db.query(SupportTicket)
            .filter(or_(*conditions))
            .all()
        )

    # =========================================================
    # 4. EXTRACT KEYWORDS
    # =========================================================

    def extract_keywords(
        self,
        text: str
    ) -> List[str]:
        """
        Extract useful keywords from a feature title.
        """

        if not text:
            return []

        words = re.findall(
            r"[A-Za-z0-9]+",
            text.lower()
        )

        stop_words = {
            "the",
            "a",
            "an",
            "and",
            "or",
            "for",
            "to",
            "of",
            "in",
            "on",
            "with",
            "feature",
            "support",
            "improve"
        }

        keywords = [
            word
            for word in words
            if word not in stop_words
            and len(word) > 2
        ]

        return list(dict.fromkeys(keywords))

    # =========================================================
    # 5. CALCULATE REACH
    # =========================================================

    def calculate_reach(
        self,
        feature: FeatureRequest,
        analytics: Optional[Analytics],
        support_tickets: List[SupportTicket]
    ) -> int:
        """
        Estimate reach using available product data.

        Priority of data:

        1. Daily active users from analytics
        2. Feature votes
        3. Support ticket volume
        """

        if analytics and analytics.daily_users:

            reach = analytics.daily_users

        elif feature.votes:

            reach = feature.votes

        elif support_tickets:

            reach = len(support_tickets) * 10

        else:

            reach = 1

        return max(int(reach), 1)

    # =========================================================
    # 6. BUILD GEMINI INPUT
    # =========================================================

    def build_ai_context(
        self,
        feature: FeatureRequest,
        analytics: Optional[Analytics],
        support_tickets: List[SupportTicket]
    ) -> Dict:

        context = {

            "feature_id": feature.id,

            "feature_title": feature.title,

            "feature_description":
                feature.description,

            "votes":
                feature.votes or 0,

            "analytics": {

                "daily_users":
                    analytics.daily_users
                    if analytics else None,

                "avg_session_min":
                    analytics.avg_session_min
                    if analytics else None,

                "drop_off_rate":
                    analytics.drop_off_rate
                    if analytics else None,

                "satisfaction_score":
                    analytics.satisfaction_score
                    if analytics else None
            },

            "support_tickets": {

                "count":
                    len(support_tickets),

                "high_priority":
                    sum(
                        1
                        for ticket in support_tickets
                        if ticket.priority
                        and ticket.priority.lower()
                        == "high"
                    )
            }
        }

        return context

    # =========================================================
    # 7. ASK GEMINI FOR IMPACT / CONFIDENCE / EFFORT
    # =========================================================

    def estimate_with_gemini(
        self,
        context: Dict
    ) -> Dict:
        """
        Ask Gemini 2.5 to estimate product impact,
        confidence and development effort.

        Gemini does NOT calculate RICE.
        Python calculates the final score.
        """

        prompt = f"""
You are a senior product manager.

Analyze the following product feature:

{json.dumps(context, indent=2)}

Estimate the following values:

1. impact
   Scale: 1 to 5
   1 = very low business/customer impact
   5 = extremely high impact

2. confidence
   Scale: 0.0 to 1.0
   Based on the strength of the available evidence.

3. effort
   Scale: 1 to 10
   1 = very easy
   10 = extremely difficult

Use the available votes, users, drop-off,
satisfaction and support-ticket information.

Return ONLY valid JSON.

Required format:

{{
    "impact": 1,
    "confidence": 0.0,
    "effort": 1,
    "reason": "short explanation"
}}

Do not include markdown.
Do not include additional fields.
"""

        try:

            response = self.ask_llm(prompt)

            result = json.loads(response)

            impact = int(
                result.get("impact", 3)
            )

            confidence = float(
                result.get("confidence", 0.7)
            )

            effort = int(
                result.get("effort", 5)
            )

            # Keep values within allowed ranges.

            impact = max(
                1,
                min(5, impact)
            )

            confidence = max(
                0.0,
                min(1.0, confidence)
            )

            effort = max(
                1,
                min(10, effort)
            )

            return {

                "impact": impact,

                "confidence": confidence,

                "effort": effort,

                "reason":
                    result.get(
                        "reason",
                        "AI-based product assessment."
                    )
            }

        except Exception as error:

            self.log_error(f"Gemini estimation failed: {error}")

            # Safe fallback values.

            return {

                "impact": 3,

                "confidence": 0.5,

                "effort": 5,

                "reason":
                    "Fallback estimation used because "
                    "AI estimation was unavailable."
            }

    # =========================================================
    # 8. RICE SCORE
    # =========================================================

    def calculate_rice(
        self,
        reach: int,
        impact: int,
        confidence: float,
        effort: int
    ) -> float:
        """
        Calculate RICE score.

        RICE =
            (Reach × Impact × Confidence) / Effort
        """

        effort = max(effort, 1)

        return (
            reach
            * impact
            * confidence
        ) / effort

    # =========================================================
    # 9. ICE SCORE
    # =========================================================

    def calculate_ice(
        self,
        impact: int,
        confidence: float,
        ease: float
    ) -> float:
        """
        Calculate ICE score.

        ICE =
            Impact × Confidence × Ease

        Ease is represented on a 1-10 scale.
        """

        return (
            impact
            * confidence
            * ease
        )

    # =========================================================
    # 10. CALCULATE EASE
    # =========================================================

    def calculate_ease(
        self,
        effort: int
    ) -> float:
        """
        Convert development effort into ease.

        Lower effort = higher ease.
        """

        return max(
            1.0,
            11.0 - effort
        )

    # =========================================================
    # 11. ANALYZE ONE FEATURE
    # =========================================================

    def analyze_feature(
        self,
        feature: FeatureRequest
    ) -> Dict:
        """
        Perform complete prioritization analysis
        for one feature.
        """

        analytics = self.get_analytics(
            feature.title
        )

        support_tickets = (
            self.get_support_tickets(
                feature
            )
        )

        reach = self.calculate_reach(
            feature,
            analytics,
            support_tickets
        )

        context = self.build_ai_context(
            feature,
            analytics,
            support_tickets
        )

        ai_estimate = (
            self.estimate_with_gemini(
                context
            )
        )

        impact = ai_estimate["impact"]

        confidence = ai_estimate[
            "confidence"
        ]

        effort = ai_estimate["effort"]

        ease = self.calculate_ease(
            effort
        )

        rice_score = self.calculate_rice(
            reach=reach,
            impact=impact,
            confidence=confidence,
            effort=effort
        )

        ice_score = self.calculate_ice(
            impact=impact,
            confidence=confidence,
            ease=ease
        )

        return {

            "feature_id":
                feature.id,

            "feature_title":
                feature.title,

            "reach":
                reach,

            "impact":
                impact,

            "confidence":
                confidence,

            "effort":
                effort,

            "ease":
                ease,

            "rice_score":
                rice_score,

            "ice_score":
                ice_score,

            "support_ticket_count":
                len(support_tickets),

            "high_priority_tickets":
                sum(
                    1
                    for ticket in support_tickets
                    if ticket.priority
                    and ticket.priority.lower()
                    == "high"
                ),

            "reason":
                ai_estimate["reason"],

            "analytics_available":
                analytics is not None
        }

    # =========================================================
    # 12. ASSIGN PRIORITY
    # =========================================================

    def assign_priority(
        self,
        ranked_features: List[Dict]
    ) -> List[Dict]:
        """
        Assign High / Medium / Low based on
        relative RICE ranking.

        Top 25%    -> High
        Middle 50% -> Medium
        Bottom 25% -> Low
        """

        total = len(ranked_features)

        if total == 0:

            return ranked_features

        for index, feature in enumerate(
            ranked_features
        ):

            position = index + 1

            percentile = (
                position / total
            )

            if percentile <= 0.25:

                priority = "High"

            elif percentile <= 0.75:

                priority = "Medium"

            else:

                priority = "Low"

            feature[
                "priority"
            ] = priority

        return ranked_features

    # =========================================================
    # 13. SAVE SCORE
    # =========================================================

    def save_priority(
        self,
        result: Dict
    ) -> PriorityScore:
        """
        Save or update priority score.
        """

        feature_id = result[
            "feature_id"
        ]

        existing = (
            self.db.query(PriorityScore)
            .filter(
                PriorityScore.feature_id
                == feature_id
            )
            .first()
        )

        if existing:

            record = existing

        else:

            record = PriorityScore(
                feature_id=feature_id
            )

            self.db.add(record)

        record.rice_score = result[
            "rice_score"
        ]

        record.ice_score = result[
            "ice_score"
        ]

        record.reach = result[
            "reach"
        ]

        record.impact = result[
            "impact"
        ]

        record.confidence = result[
            "confidence"
        ]

        record.effort = result[
            "effort"
        ]

        record.impact_level = result[
            "priority"
        ]

        self.db.commit()

        self.db.refresh(record)

        return record

    # =========================================================
    # 14. RUN AGENT
    # =========================================================

    def run(
        self,
        feature_id: Optional[int] = None
    ) -> Dict:
        """
        Main entry point.

        If feature_id is supplied:
            prioritize only that feature.

        Otherwise:
            prioritize all feature requests.
        """

        try:

            self.log_info("Starting feature prioritization.")

            features = (
                self.get_feature_requests(
                    feature_id
                )
            )

            if not features:

                return self.success({

                    "message":
                        "No feature requests found.",

                    "features": []
                })

            results = []

            for feature in features:

                self.log_info(f"Analyzing feature: {feature.title}")

                result = (
                    self.analyze_feature(
                        feature
                    )
                )

                results.append(result)

            # Rank by RICE score.

            results.sort(
                key=lambda item:
                    item["rice_score"],
                reverse=True
            )

            # Assign High / Medium / Low.

            results = self.assign_priority(
                results
            )

            # Save to database.

            for result in results:

                self.save_priority(
                    result
                )

            self.log_info(f"Prioritization completed for {len(results)} features.")

            return self.success({

                "total_features":
                    len(results),

                "ranked_features":
                    results
            })

        except Exception as error:

            self.db.rollback()

            self.log_error("Prioritization failed.")

            return self.failure(
                str(error)
            )

    # =========================================================
    # 15. CLOSE DATABASE
    # =========================================================

    def close(self):

        super().close()