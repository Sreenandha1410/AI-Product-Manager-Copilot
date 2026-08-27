# backend/routes/roadmap.py

import json
import re
from datetime import date

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from db import SessionLocal
from models import (
    RoadmapItem,
    FeatureRequest,
    PRDDocument
)

from llm import llm


router = APIRouter(
    prefix="/roadmap",
    tags=["Roadmap"]
)


# ============================================================
# STATUS / PROGRESS
# ============================================================

PROGRESS_MAP = {
    "Completed": 100,
    "In Progress": 65,
    "Planned": 0,
    "Backlog": 0,
}


VALID_STATUSES = {
    "Completed",
    "In Progress",
    "Planned",
    "Backlog",
}


# ============================================================
# HELPERS
# ============================================================

def clean_json_response(text: str) -> str:

    text = text.strip()

    # Remove markdown code fences
    text = re.sub(
        r"^```(?:json)?\s*",
        "",
        text,
        flags=re.IGNORECASE
    )

    text = re.sub(
        r"\s*```$",
        "",
        text
    )

    return text.strip()


def make_feature_title(text: str) -> str:

    text = (text or "").strip()

    if not text:
        return "Roadmap Milestone"

    if len(text) <= 150:
        return text

    return (
        text[:147].rsplit(" ", 1)[0]
        + "..."
    )


def serialize_roadmap_item(
    item: RoadmapItem,
    feature: FeatureRequest | None
):

    status = item.status or "Planned"

    return {

        "id": item.id,

        "feature_id":
            item.feature_id,

        "title":
            feature.title
            if feature
            else "Roadmap Milestone",

        "description":
            feature.description
            if feature
            else "",

        # No Q1/Q2/Q3/Q4
        "phase": "",

        "quarter": "",

        "status": status,

        "progress":
            PROGRESS_MAP.get(
                status,
                0
            ),

        "start_date":
            str(item.start_date)
            if item.start_date
            else "",

        "end_date":
            str(item.end_date)
            if item.end_date
            else "",

        "created_at":
            str(item.created_at)
            if item.created_at
            else "",
    }


# ============================================================
# GET ALL ROADMAP ITEMS
# ============================================================

@router.get("/")
def get_roadmap():

    db: Session = SessionLocal()

    try:

        rows = (
            db.query(
                RoadmapItem,
                FeatureRequest
            )
            .outerjoin(
                FeatureRequest,
                FeatureRequest.id
                == RoadmapItem.feature_id
            )
            .order_by(
                RoadmapItem.id.asc()
            )
            .all()
        )

        return [
            serialize_roadmap_item(
                item,
                feature
            )
            for item, feature in rows
        ]

    finally:

        db.close()


# ============================================================
# GENERATE ROADMAP FROM PRD
# ============================================================

class GenerateFromPRDRequest(BaseModel):

    prd_id: int

    user_id: str | None = None


@router.post("/generate-from-prd")
def generate_from_prd(
    data: GenerateFromPRDRequest
):

    db: Session = SessionLocal()

    try:

        # ====================================================
        # STEP 1
        # FIND PRD
        # ====================================================

        prd = (
            db.query(PRDDocument)
            .filter(
                PRDDocument.id
                == data.prd_id
            )
            .first()
        )

        if not prd:

            raise HTTPException(
                status_code=404,
                detail=(
                    f"PRD {data.prd_id} "
                    "not found."
                )
            )

        # ====================================================
        # STEP 2
        # BUILD PRD CONTEXT
        # ====================================================

        prd_content = f"""

PRODUCT REQUIREMENTS DOCUMENT

Title:
{prd.title}

Problem Statement:
{prd.problem_statement}

Objectives:
{prd.objectives}

User Stories:
{prd.user_stories}

Acceptance Criteria:
{prd.acceptance_criteria}

Success Metrics:
{prd.success_metrics}

"""

        # ====================================================
        # STEP 3
        # ASK GEMINI FOR MILESTONES
        # ====================================================

        prompt = f"""

You are a senior product manager and technical
roadmap planner.

Read the following PRD.

{prd_content}

Create a development roadmap based ONLY on this PRD.

Generate between 3 and 6 implementation milestones.

The milestones must represent the actual implementation
sequence of the product.

Typical sequence:

1. Foundation / setup
2. Core functionality
3. Integration
4. Testing
5. Optimization / release

Do NOT use quarters.

Do NOT use:
Q1
Q2
Q3
Q4

Each milestone must contain:

- title
- description
- status
- order

The FIRST milestone must be:

"In Progress"

All remaining milestones must initially be:

"Planned"

Return ONLY valid JSON.

Example:

[
  {{
    "title": "Design dark mode architecture",
    "description": "Define theme tokens and dark mode state management.",
    "status": "In Progress",
    "order": 1
  }},
  {{
    "title": "Implement dark theme",
    "description": "Implement dark color tokens across the application.",
    "status": "Planned",
    "order": 2
  }}
]

Rules:

- 3 to 6 milestones
- short titles
- practical development tasks
- logical implementation order
- no quarters
- no markdown
- valid JSON only

"""

        # ====================================================
        # STEP 4
        # CALL GEMINI
        # ====================================================

        try:

            response = llm.invoke(prompt)

            if hasattr(
                response,
                "content"
            ):

                raw = response.content

            else:

                raw = response

            if isinstance(raw, list):

                parts = []

                for item in raw:

                    if isinstance(item, str):
                        parts.append(item)

                    elif isinstance(item, dict):

                        if "text" in item:
                            parts.append(
                                str(item["text"])
                            )

                        elif "content" in item:
                            parts.append(
                                str(item["content"])
                            )

                raw = "\n".join(parts)

            else:

                raw = str(raw)

        except Exception as e:

            error_message = str(e)

            if (
                "429" in error_message
                or "quota"
                in error_message.lower()
                or "RESOURCE_EXHAUSTED"
                in error_message
            ):

                raise HTTPException(
                    status_code=429,
                    detail=(
                        "Gemini API quota exceeded."
                    )
                )

            raise HTTPException(
                status_code=500,
                detail=f"LLM error: {error_message}"
            )

        # ====================================================
        # STEP 5
        # PARSE JSON
        # ====================================================

        clean = clean_json_response(
            raw
        )

        try:

            milestones = json.loads(
                clean
            )

        except json.JSONDecodeError:

            # Try to find JSON array
            match = re.search(
                r"\[[\s\S]*\]",
                clean
            )

            if not match:

                raise HTTPException(
                    status_code=500,
                    detail=(
                        "Gemini returned invalid "
                        "roadmap JSON."
                    )
                )

            try:

                milestones = json.loads(
                    match.group(0)
                )

            except Exception:

                raise HTTPException(
                    status_code=500,
                    detail=(
                        "Unable to parse "
                        "Gemini roadmap."
                    )
                )

        if not isinstance(
            milestones,
            list
        ):

            raise HTTPException(
                status_code=500,
                detail=(
                    "Gemini roadmap must "
                    "be a JSON array."
                )
            )

        if not milestones:

            raise HTTPException(
                status_code=500,
                detail=(
                    "Gemini returned no "
                    "roadmap milestones."
                )
            )

        # ====================================================
        # STEP 6
        # LIMIT TO 6
        # ====================================================

        milestones = milestones[:6]

        # ====================================================
        # STEP 7
        # SAVE MILESTONES
        # ====================================================

        saved = []

        for index, milestone in enumerate(
            milestones
        ):

            title = (
                milestone.get("title")
                or f"Milestone {index + 1}"
            )

            description = (
                milestone.get(
                    "description"
                )
                or ""
            )

            title = make_feature_title(
                title
            )

            # First = In Progress
            if index == 0:

                status = "In Progress"

            else:

                status = (
                    milestone.get(
                        "status",
                        "Planned"
                    )
                )

                if status not in VALID_STATUSES:
                    status = "Planned"

            # =================================================
            # IMPORTANT
            #
            # We DO NOT use data.user_id here.
            #
            # submitted_by is VARCHAR(10) in your database,
            # while your auth user ID is a UUID.
            #
            # These roadmap-generated features are system
            # generated, so submitted_by = None is correct.
            # =================================================

            feature = FeatureRequest(

                title=title,

                description=description,

                votes=0,

                submitted_by=None,

                request_date=date.today(),
            )

            db.add(feature)

            db.flush()

            # =================================================
            # ROADMAP ITEM
            # =================================================

            item = RoadmapItem(

                feature_id=feature.id,

                # No quarter
                phase="",

                status=status,
            )

            db.add(item)

            db.flush()

            saved.append({

                "id":
                    item.id,

                "feature_id":
                    feature.id,

                "title":
                    feature.title,

                "description":
                    feature.description,

                "status":
                    status,

                "progress":
                    PROGRESS_MAP.get(
                        status,
                        0
                    ),

                "phase": "",

                "quarter": "",

                "order":
                    index + 1,
            })

        db.commit()

        return {

            "success": True,

            "message":
                f"{len(saved)} roadmap milestones generated.",

            "prd_id":
                data.prd_id,

            "milestones":
                saved,
        }

    except HTTPException:

        db.rollback()

        raise

    except Exception as e:

        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=(
                f"Roadmap generation failed: "
                f"{str(e)}"
            )
        )

    finally:

        db.close()


# ============================================================
# ADD MANUAL MILESTONE
# ============================================================

class NewMilestoneRequest(BaseModel):

    title: str

    status: str = "Planned"


@router.post("/")
def add_milestone(
    data: NewMilestoneRequest
):

    db: Session = SessionLocal()

    try:

        title = data.title.strip()

        if not title:

            raise HTTPException(
                status_code=400,
                detail=(
                    "Milestone title "
                    "cannot be empty."
                )
            )

        status = data.status

        if status not in VALID_STATUSES:

            status = "Planned"

        # System-generated item.
        # Do not save UUID into VARCHAR(10).

        feature = FeatureRequest(

            title=make_feature_title(
                title
            ),

            description=title,

            votes=0,

            submitted_by=None,

            request_date=date.today(),
        )

        db.add(feature)

        db.flush()

        item = RoadmapItem(

            feature_id=feature.id,

            phase="",

            status=status,
        )

        db.add(item)

        db.commit()

        db.refresh(item)

        return serialize_roadmap_item(
            item,
            feature
        )

    except HTTPException:

        db.rollback()

        raise

    except Exception as e:

        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=(
                f"Failed to create "
                f"milestone: {str(e)}"
            )
        )

    finally:

        db.close()


# ============================================================
# UPDATE STATUS
# ============================================================

@router.put("/{item_id}/status")
def update_status(
    item_id: int,
    status: str
):

    db: Session = SessionLocal()

    try:

        if status not in VALID_STATUSES:

            raise HTTPException(
                status_code=400,
                detail=(
                    "Invalid status. "
                    "Use Completed, "
                    "In Progress, Planned "
                    "or Backlog."
                )
            )

        item = (
            db.query(RoadmapItem)
            .filter(
                RoadmapItem.id
                == item_id
            )
            .first()
        )

        if not item:

            raise HTTPException(
                status_code=404,
                detail=(
                    "Roadmap item "
                    "not found."
                )
            )

        item.status = status

        db.commit()

        db.refresh(item)

        feature = (
            db.query(FeatureRequest)
            .filter(
                FeatureRequest.id
                == item.feature_id
            )
            .first()
        )

        return serialize_roadmap_item(
            item,
            feature
        )

    finally:

        db.close()


# ============================================================
# DELETE ROADMAP ITEM
# ============================================================

@router.delete("/{item_id}")
def delete_milestone(
    item_id: int
):

    db: Session = SessionLocal()

    try:

        item = (
            db.query(RoadmapItem)
            .filter(
                RoadmapItem.id
                == item_id
            )
            .first()
        )

        if not item:

            raise HTTPException(
                status_code=404,
                detail=(
                    "Roadmap item "
                    "not found."
                )
            )

        feature_id = item.feature_id

        db.delete(item)

        db.flush()

        # Delete generated FeatureRequest
        if feature_id:

            feature = (
                db.query(
                    FeatureRequest
                )
                .filter(
                    FeatureRequest.id
                    == feature_id
                )
                .first()
            )

            if feature:
                db.delete(feature)

        db.commit()

        return {
            "success": True,
            "message":
                "Roadmap milestone deleted successfully."
        }

    finally:

        db.close()