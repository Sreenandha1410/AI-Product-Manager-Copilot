# backend/routes/prioritization.py

from fastapi import APIRouter, HTTPException
from db import SessionLocal
from models import PriorityScore, FeatureRequest

router = APIRouter(
    prefix="/prioritization",
    tags=["Prioritization"]
)


# ── POST — run agent on all features ─────────────────────────
@router.post("/run")
def run_prioritization():
    """
    Runs PrioritizationAgent on all feature requests.
    Saves RICE + ICE scores to priority_scores table.
    """
    try:
        from agents.prioritization_agent import PrioritizationAgent
        agent  = PrioritizationAgent()
        result = agent.run()          # agent closes its own DB session

        if result["status"] == "error":
            raise HTTPException(
                status_code=500,
                detail=result["error"]
            )
        return result

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── POST — run agent on one feature ──────────────────────────
@router.post("/run/{feature_id}")
def run_prioritization_single(feature_id: int):
    """
    Runs PrioritizationAgent on one specific feature.
    """
    try:
        from agents.prioritization_agent import PrioritizationAgent
        agent  = PrioritizationAgent()
        result = agent.run(feature_id=feature_id)

        if result["status"] == "error":
            raise HTTPException(
                status_code=500,
                detail=result["error"]
            )
        return result

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── GET — return all saved scores ─────────────────────────────
@router.get("/scores")
def get_priority_scores():
    db = SessionLocal()
    try:
        rows = (
            db.query(PriorityScore, FeatureRequest)
            .outerjoin(
                FeatureRequest,
                FeatureRequest.id == PriorityScore.feature_id
            )
            .order_by(PriorityScore.rice_score.desc())
            .all()
        )
        return [
            {
                "id":           score.id,
                "feature_id":   score.feature_id,
                "feature":      feat.title if feat else "Unknown",
                "rice_score":   round(score.rice_score or 0, 2),
                "ice_score":    round(score.ice_score  or 0, 2),
                "reach":        score.reach,
                "impact":       score.impact,
                "confidence":   score.confidence,
                "effort":       score.effort,
                "impact_level": score.impact_level or "Medium",
            }
            for score, feat in rows
        ]
    finally:
        db.close()