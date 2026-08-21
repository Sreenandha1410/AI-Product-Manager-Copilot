from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from datetime import date

from db import SessionLocal
from models import FeatureRequest, PriorityScore

router = APIRouter(
    prefix="/feature-requests",
    tags=["Feature Requests"]
)

STATUS_MAP = {
    "High": "In Progress",
    "Medium": "Planned",
    "Low": "Backlog",
}


def make_feature_title(text: str) -> str:
    """
    FeatureRequest.title is VARCHAR(150).
    Keep the title within 150 characters.
    The complete request is stored in description.
    """
    text = (text or "").strip()

    if not text:
        return "New Product Feature"

    if len(text) <= 150:
        return text

    # 147 + "..." = exactly 150 characters
    return text[:147].rsplit(" ", 1)[0] + "..."


def _serialize(
    feature: FeatureRequest,
    priority: PriorityScore | None
) -> dict:

    rice = priority.rice_score if priority else 0
    ice = priority.ice_score if priority else 0
    level = priority.impact_level if priority else "Medium"

    ai_score = min(100, int(rice / 50)) if rice else 50

    return {
        "id": feature.id,
        "title": feature.title or "",
        "description": feature.description or "",
        "votes": feature.votes or 0,
        "submitted_by": feature.submitted_by or "",
        "request_date": (
            str(feature.request_date)
            if feature.request_date
            else ""
        ),
        "priority": level,
        "businessImpact": level,
        "status": STATUS_MAP.get(level, "Planned"),
        "aiScore": ai_score,
        "rice_score": round(rice, 2),
        "ice_score": round(ice, 2),
    }


@router.get("/")
def get_feature_requests():

    db: Session = SessionLocal()

    try:
        features = (
            db.query(FeatureRequest)
            .order_by(FeatureRequest.votes.desc())
            .all()
        )

        result = []

        for feature in features:

            priority = (
                db.query(PriorityScore)
                .filter(
                    PriorityScore.feature_id == feature.id
                )
                .first()
            )

            result.append(
                _serialize(feature, priority)
            )

        return result

    finally:
        db.close()


class NewFeatureRequest(BaseModel):
    title: str
    description: str = ""
    votes: int = 0
    user_id: str | None = None


@router.post("/")
def create_feature_request(
    data: NewFeatureRequest
):

    db: Session = SessionLocal()

    try:

        request_text = (data.title or "").strip()

        if not request_text:
            raise HTTPException(
                status_code=400,
                detail="Feature request cannot be empty."
            )

        # IMPORTANT:
        # title <= 150 characters
        # description contains the complete request

        feature = FeatureRequest(
            title=make_feature_title(request_text),
            description=(
                data.description.strip()
                if data.description.strip()
                else request_text
            ),
            votes=data.votes,
            submitted_by=data.user_id,
            request_date=date.today(),
        )

        db.add(feature)
        db.commit()
        db.refresh(feature)

        return _serialize(feature, None)

    except HTTPException:
        db.rollback()
        raise

    except Exception as e:
        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=f"Failed to create feature request: {str(e)}"
        )

    finally:
        db.close()


@router.put("/{feature_id}/vote")
def upvote_feature(feature_id: int):

    db: Session = SessionLocal()

    try:

        feature = (
            db.query(FeatureRequest)
            .filter(
                FeatureRequest.id == feature_id
            )
            .first()
        )

        if not feature:
            raise HTTPException(
                status_code=404,
                detail="Feature not found."
            )

        feature.votes = (feature.votes or 0) + 1

        db.commit()
        db.refresh(feature)

        return {
            "id": feature.id,
            "votes": feature.votes
        }

    finally:
        db.close()