# backend/tools/scoring_tools.py

from typing import Dict


class ScoringTools:

    # =====================================================
    # RICE SCORE
    # Formula:
    # (Reach × Impact × Confidence) / Effort
    # =====================================================

    def calculate_rice(
        self,
        reach: int,
        impact: int,
        confidence: float,
        effort: int
    ) -> float:

        if effort == 0:
            return 0

        rice = (reach * impact * confidence) / effort

        return round(rice, 2)

    # =====================================================
    # ICE SCORE
    # Formula:
    # Impact × Confidence × Ease
    # =====================================================

    def calculate_ice(
        self,
        impact: int,
        confidence: float,
        ease: int
    ) -> float:

        ice = impact * confidence * ease

        return round(ice, 2)

    # =====================================================
    # PRIORITY LEVEL
    # =====================================================

    def get_priority_level(self, rice_score: float):

        if rice_score >= 5000:
            return "Critical"

        elif rice_score >= 2500:
            return "High"

        elif rice_score >= 1000:
            return "Medium"

        return "Low"

    # =====================================================
    # COMPLETE PRIORITY CALCULATION
    # =====================================================

    def calculate_priority(
        self,
        reach: int,
        impact: int,
        confidence: float,
        effort: int,
        ease: int
    ) -> Dict:

        rice = self.calculate_rice(
            reach,
            impact,
            confidence,
            effort
        )

        ice = self.calculate_ice(
            impact,
            confidence,
            ease
        )

        level = self.get_priority_level(rice)

        return {
            "rice_score": rice,
            "ice_score": ice,
            "priority": level
        }