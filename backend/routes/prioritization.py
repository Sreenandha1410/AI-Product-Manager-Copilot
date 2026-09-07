# backend/routes/prioritization.py

from fastapi import APIRouter, HTTPException

from db import SessionLocal
from models import PriorityScore, FeatureRequest


router = APIRouter(
    prefix="/prioritization",
    tags=["Prioritization"]
)


# ============================================================
# POST — RUN AGENT ON ALL FEATURES
# ============================================================

@router.post("/run")
def run_prioritization():
    """
    Runs PrioritizationAgent on all feature requests.

    Saves RICE + ICE scores to the priority_scores table.
    """

    try:
        from agents.prioritization_agent import PrioritizationAgent

        agent = PrioritizationAgent()

        result = agent.run()

        if result.get("status") == "error":
            raise HTTPException(
                status_code=500,
                detail=result.get(
                    "error",
                    "Prioritization failed."
                )
            )

        return result

    except HTTPException:
        raise

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=str(exc)
        )


# ============================================================
# POST — RUN AGENT ON ONE FEATURE
# ============================================================

@router.post("/run/{feature_id}")
def run_prioritization_single(
    feature_id: int
):
    """
    Runs PrioritizationAgent on one specific feature.
    """

    try:
        from agents.prioritization_agent import PrioritizationAgent

        agent = PrioritizationAgent()

        result = agent.run(
            feature_id=feature_id
        )

        if result.get("status") == "error":
            raise HTTPException(
                status_code=500,
                detail=result.get(
                    "error",
                    "Prioritization failed."
                )
            )

        return result

    except HTTPException:
        raise

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=str(exc)
        )


# ============================================================
# GET — RETURN ALL SAVED PRIORITY SCORES
# ============================================================

@router.get("/scores")
def get_priority_scores():

    db = SessionLocal()

    try:

        rows = (
            db.query(
                PriorityScore,
                FeatureRequest
            )
            .outerjoin(
                FeatureRequest,
                FeatureRequest.id
                == PriorityScore.feature_id
            )
            .order_by(
                PriorityScore.rice_score.desc()
            )
            .all()
        )

        return [
            {
                "id": score.id,

                "feature_id": score.feature_id,

                "feature": (
                    feat.title
                    if feat
                    else "Unknown"
                ),

                "description": (
                    feat.description
                    if feat
                    else ""
                ),

                "rice_score": round(
                    score.rice_score or 0,
                    2
                ),

                "ice_score": round(
                    score.ice_score or 0,
                    2
                ),

                "reach": score.reach,

                "impact": score.impact,

                "confidence": score.confidence,

                "effort": score.effort,

                "impact_level": (
                    score.impact_level
                    or "Medium"
                ),
            }

            for score, feat in rows
        ]

    finally:
        db.close()


# ============================================================
# GET — RETURN FEATURES IN ROADMAP FORMAT
# ============================================================

@router.get("/roadmap-features")
def get_roadmap_features():
    """
    Returns prioritized features in the exact structure
    required by the Roadmap Agent.

    Flow:

        FeatureRequest
              ↓
        PriorityScore
              ↓
        roadmap-features
              ↓
        RoadmapAgent
    """

    db = SessionLocal()

    try:

        rows = (
            db.query(
                FeatureRequest,
                PriorityScore
            )
            .outerjoin(
                PriorityScore,
                PriorityScore.feature_id
                == FeatureRequest.id
            )
            .order_by(
                PriorityScore.rice_score.desc()
            )
            .all()
        )

        features = []

        for feature, score in rows:

            # Skip features that have not yet been
            # prioritized.
            if score is None:
                continue

            # Convert stored priority information
            # into the Roadmap Agent format.

            if score.impact_level:
                impact_level = (
                    score.impact_level
                    .strip()
                    .capitalize()
                )
            else:
                impact_level = "Medium"

            # Map impact level to roadmap priority.
            #
            # If your PrioritizationAgent already returns
            # an explicit priority field, that should be
            # preferred. Since PriorityScore currently stores
            # impact_level, we use it as a fallback.

            if impact_level in {
                "High",
                "Medium",
                "Low"
            }:
                priority = impact_level
            else:
                priority = "Medium"

            features.append(
                {
                    "feature_id": feature.id,

                    "feature_name": (
                        feature.title
                    ),

                    "feature_title": (
                        feature.title
                    ),

                    "description": (
                        feature.description
                        or "No description provided."
                    ),

                    "feature_description": (
                        feature.description
                        or "No description provided."
                    ),

                    "priority": priority,

                    "rice_score": (
                        score.rice_score
                    ),

                    "ice_score": (
                        score.ice_score
                    ),

                    # Dependencies are currently not
                    # stored in PriorityScore, so default
                    # to an empty list.
                    "dependencies": [],
                }
            )

        return {
            "success": True,
            "data": {
                "features": features
            }
        }

    finally:

        db.close()