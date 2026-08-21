from datetime import date

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import desc

from db import SessionLocal
from models import RoadmapItem, FeatureRequest


router = APIRouter(prefix="/roadmap", tags=["Roadmap"])


# --------------------------------------------------
# Progress mapping
# --------------------------------------------------

PROGRESS_MAP = {
    "Completed": 100,
    "In Progress": 65,
    "Planned": 0,
    "Backlog": 0,
}


# --------------------------------------------------
# Helper: create safe database title
# --------------------------------------------------

def make_feature_title(text: str) -> str:
    """
    FeatureRequest.title is VARCHAR(150).
    Keep title short while preserving the complete
    product request in description.
    """

    text = (text or "").strip()

    if not text:
        return "New Product Feature"

    if len(text) <= 150:
        return text

    # Keep title below 150 characters
    short_title = text[:147].rsplit(" ", 1)[0]

    return short_title + "..."


# --------------------------------------------------
# Serialize roadmap item
# --------------------------------------------------

def _serialize(
    item: RoadmapItem,
    feature: FeatureRequest | None
) -> dict:

    status = item.status or "Planned"
    progress = PROGRESS_MAP.get(status, 0)

    return {
        "id": item.id,
        "feature_id": item.feature_id,

        "title": (
            feature.title
            if feature
            else "Unknown"
        ),

        "description": (
            feature.description
            if feature
            else ""
        ),

        "phase": item.phase or "Q1",

        # Frontend uses quarter
        "quarter": item.phase or "Q1",

        "status": status,

        "progress": progress,

        "start_date": (
            str(item.start_date)
            if item.start_date
            else ""
        ),

        "end_date": (
            str(item.end_date)
            if item.end_date
            else ""
        ),
    }


# --------------------------------------------------
# GET ROADMAP
# --------------------------------------------------

@router.get("/")
def get_roadmap():

    db: Session = SessionLocal()

    try:

        # Use JOIN instead of querying FeatureRequest
        # separately for every roadmap item.
        rows = (
            db.query(RoadmapItem, FeatureRequest)
            .outerjoin(
                FeatureRequest,
                FeatureRequest.id == RoadmapItem.feature_id
            )
            .order_by(
                RoadmapItem.phase,
                RoadmapItem.id
            )
            .all()
        )

        return [
            _serialize(item, feature)
            for item, feature in rows
        ]

    finally:
        db.close()


# --------------------------------------------------
# REQUEST MODEL
# --------------------------------------------------

class NewMilestoneRequest(BaseModel):

    title: str

    phase: str = "Q1"

    status: str = "Planned"

    user_id: str | None = None


# --------------------------------------------------
# ADD MILESTONE
# --------------------------------------------------

@router.post("/")
def add_milestone(data: NewMilestoneRequest):

    db: Session = SessionLocal()

    try:

        request_text = data.title.strip()

        if not request_text:
            raise HTTPException(
                status_code=400,
                detail="Milestone title cannot be empty."
            )

        # --------------------------------------------------
        # IMPORTANT FIX
        #
        # title <= 150 characters
        # description = complete request
        # --------------------------------------------------

        request_text = data.title.strip()

        if not request_text:
             raise HTTPException(
                     status_code=400,
                     detail="Milestone title cannot be empty."
                 )
             
    
        feature = FeatureRequest(
             title=make_feature_title(request_text),
                description=request_text,
                votes=0,
                submitted_by=data.user_id,
                request_date=date.today(),
            )
   
    

        db.add(feature)
        db.commit()
        db.refresh(feature)

        # --------------------------------------------------
        # Create roadmap item
        # --------------------------------------------------

        valid_phases = {"Q1", "Q2", "Q3", "Q4"}

        phase = (
            data.phase.upper()
            if data.phase
            else "Q1"
        )

        if phase not in valid_phases:
            phase = "Q1"

        valid_statuses = {
            "Completed",
            "In Progress",
            "Planned",
            "Backlog",
        }

        status = (
            data.status
            if data.status in valid_statuses
            else "Planned"
        )

        item = RoadmapItem(
            feature_id=feature.id,
            phase=phase,
            status=status,
        )

        db.add(item)
        db.commit()
        db.refresh(item)

        return _serialize(item, feature)

    except HTTPException:
        db.rollback()
        raise

    except Exception as e:
        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=f"Failed to create milestone: {str(e)}"
        )

    finally:
        db.close()


# --------------------------------------------------
# UPDATE STATUS
# --------------------------------------------------

@router.put("/{item_id}/status")
def update_status(
    item_id: int,
    status: str
):

    db: Session = SessionLocal()

    try:

        item = (
            db.query(RoadmapItem)
            .filter(RoadmapItem.id == item_id)
            .first()
        )

        if not item:
            raise HTTPException(
                status_code=404,
                detail="Roadmap item not found."
            )

        valid_statuses = {
            "Completed",
            "In Progress",
            "Planned",
            "Backlog",
        }

        if status not in valid_statuses:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Invalid status. "
                    "Use Completed, In Progress, "
                    "Planned, or Backlog."
                )
            )

        item.status = status

        db.commit()
        db.refresh(item)

        feature = (
            db.query(FeatureRequest)
            .filter(
                FeatureRequest.id == item.feature_id
            )
            .first()
        )

        return _serialize(item, feature)

    finally:
        db.close()


# --------------------------------------------------
# DELETE MILESTONE
# --------------------------------------------------

@router.delete("/{item_id}")
def delete_milestone(item_id: int):

    db: Session = SessionLocal()

    try:

        item = (
            db.query(RoadmapItem)
            .filter(RoadmapItem.id == item_id)
            .first()
        )

        if not item:
            raise HTTPException(
                status_code=404,
                detail="Roadmap item not found."
            )

        db.delete(item)
        db.commit()

        return {
            "message": "Roadmap milestone deleted successfully."
        }

    finally:
        db.close()