from datetime import date
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from db import SessionLocal
from models import (
    RoadmapItem,
    FeatureRequest,
    PRDDocument,
    PriorityScore,
)

from agents.roadmap_agent import RoadmapAgent


router = APIRouter(
    prefix="/roadmap",
    tags=["Roadmap"],
)


# ============================================================
# STATUS / PROGRESS
# ============================================================

PROGRESS_MAP = {
    "Completed": 100,
    "In Progress": 65,
    "Planned": 0,
    "Blocked": 0,
    "Backlog": 0,
}


VALID_STATUSES = {
    "Completed",
    "In Progress",
    "Planned",
    "Blocked",
    "Backlog",
}


# ============================================================
# HELPERS
# ============================================================

def make_feature_title(text: str) -> str:
    """
    Create a clean title for a roadmap feature.
    """

    text = (text or "").strip()

    if not text:
        return "Roadmap Feature"

    if len(text) <= 150:
        return text

    return text[:147].rsplit(" ", 1)[0] + "..."


def serialize_roadmap_item(
    item: RoadmapItem,
    feature: FeatureRequest | None,
):
    """
    Convert a RoadmapItem database object into a frontend-friendly
    dictionary.
    """

    status = item.status or "Planned"

    return {
        "id": item.id,

        "feature_id": item.feature_id,

        "title": (
            feature.title
            if feature
            else "Roadmap Feature"
        ),

        "description": (
            feature.description
            if feature
            else ""
        ),

        # Sprint-based roadmap.
        "phase": item.phase or "",

        # Kept for frontend compatibility.
        # We intentionally do not use Q1/Q2/Q3/Q4.
        "quarter": "",

        "status": status,

        "progress": PROGRESS_MAP.get(
            status,
            0,
        ),

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

        "created_at": (
            str(item.created_at)
            if item.created_at
            else ""
        ),
    }


def roadmap_feature_to_dict(feature: Any) -> dict:
    """
    Convert the structured Roadmap Agent output into
    a JSON-compatible dictionary.
    """

    return {
        "feature_name": feature.feature_name,

        "description": feature.description,

        "priority": feature.priority,

        "rice_score": feature.rice_score,

        "ice_score": feature.ice_score,

        "dependencies": feature.dependencies,

        "unresolved_dependencies": (
            feature.unresolved_dependencies
        ),

        "blocked_by": feature.blocked_by,

        "release": feature.release,

        "milestone": feature.milestone,

        "status": feature.status,

        "reason": feature.reason,
    }


# ============================================================
# PRD USER STORY PARSER
# ============================================================

def extract_prd_user_stories(
    user_stories_text: str | None,
) -> list[str]:
    """
    Extract user stories from the text stored in PRDDocument.

    The PRD Agent stores user stories in a format similar to:

        User Story 1:
        As a user, I want to ...

        Acceptance Criteria:
        ...
        ...

        User Story 2:
        As a user, I want to ...

    Only the actual user-story text is passed to the
    Roadmap Agent.
    """

    if not user_stories_text:
        return []

    text = user_stories_text.strip()

    if not text:
        return []

    stories: list[str] = []

    # --------------------------------------------------------
    # Primary parsing method
    # --------------------------------------------------------

    sections = text.split("User Story ")

    for section in sections:

        section = section.strip()

        if not section:
            continue

        lines = section.splitlines()

        story_lines: list[str] = []

        for line in lines:

            line = line.strip()

            if not line:
                continue

            # Skip numeric story number.
            if line.rstrip(":").isdigit():
                continue

            # Stop when acceptance criteria begins.
            if line.lower().startswith(
                "acceptance criteria"
            ):
                break

            # Remove common numbering.
            if line.startswith(("1.", "2.", "3.", "4.", "5.")):
                line = line[2:].strip()

            story_lines.append(line)

        if story_lines:

            story = " ".join(
                story_lines
            ).strip()

            if story:
                stories.append(story)

    # --------------------------------------------------------
    # Fallback
    # --------------------------------------------------------

    if not stories:

        lines = text.splitlines()

        current_story: list[str] = []

        for line in lines:

            line = line.strip()

            if not line:
                continue

            if line.lower().startswith(
                "acceptance criteria"
            ):
                if current_story:

                    story = " ".join(
                        current_story
                    ).strip()

                    if story:
                        stories.append(story)

                    current_story = []

                continue

            current_story.append(line)

        if current_story:

            story = " ".join(
                current_story
            ).strip()

            if story:
                stories.append(story)

    return stories


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
                FeatureRequest,
            )
            .outerjoin(
                FeatureRequest,
                FeatureRequest.id
                == RoadmapItem.feature_id,
            )
            .order_by(
                RoadmapItem.id.asc()
            )
            .all()
        )

        return [
            serialize_roadmap_item(
                item,
                feature,
            )
            for item, feature in rows
        ]

    except Exception as exc:

        raise HTTPException(
            status_code=500,
            detail=(
                f"Failed to fetch roadmap: "
                f"{str(exc)}"
            ),
        )

    finally:

        db.close()


# ============================================================
# GENERATE ROADMAP REQUEST
# ============================================================

class PrioritizedFeatureRequest(BaseModel):

    feature_id: int | None = None

    feature_name: str = Field(
        ...,
        min_length=1,
    )

    description: str = Field(
        ...,
        min_length=1,
    )

    priority: str

    rice_score: float | None = None

    ice_score: float | None = None

    dependencies: list[str] = Field(
        default_factory=list,
    )


class GenerateRoadmapRequest(BaseModel):

    # --------------------------------------------------------
    # If PRD is selected from Roadmap Planner,
    # this value is supplied.
    # --------------------------------------------------------

    prd_id: int | None = None

    # --------------------------------------------------------
    # Optional manually supplied features.
    # --------------------------------------------------------

    features: list[
        PrioritizedFeatureRequest
    ] | None = None

    user_id: str | None = None


# ============================================================
# GET PRIORITIZED FEATURES FROM DATABASE
# ============================================================

def get_prioritized_features(
    db: Session,
) -> list[dict]:
    """
    Read the latest prioritization results from PostgreSQL.

    PriorityScore.impact_level stores the High / Medium / Low
    priority assigned by the Prioritization Agent.
    """

    rows = (
        db.query(
            FeatureRequest,
            PriorityScore,
        )
        .join(
            PriorityScore,
            PriorityScore.feature_id
            == FeatureRequest.id,
        )
        .order_by(
            PriorityScore.rice_score.desc()
        )
        .all()
    )

    features = []

    for feature, score in rows:

        features.append(
            {
                "feature_id": feature.id,

                "feature_name": (
                    feature.title
                    or f"Feature {feature.id}"
                ),

                "description": (
                    feature.description
                    or "No description provided."
                ),

                # PrioritizationAgent saves the assigned
                # priority in impact_level.
                "priority": (
                    score.impact_level
                    or "Medium"
                ),

                "rice_score": (
                    score.rice_score
                ),

                "ice_score": (
                    score.ice_score
                ),

                # Dependencies are not currently stored
                # by the Prioritization module.
                "dependencies": [],
            }
        )

    return features


# ============================================================
# BUILD ROADMAP FEATURES FROM PRD
# ============================================================

def build_features_from_prd(
    prd: PRDDocument,
) -> list[dict]:
    """
    Convert one generated PRD into roadmap features.

    The selected PRD is the ONLY source used here.

    User Story 1 -> Roadmap Feature 1
    User Story 2 -> Roadmap Feature 2
    User Story 3 -> Roadmap Feature 3

    This prevents unrelated prioritized features from
    entering the selected PRD's roadmap.
    """

    features: list[dict] = []

    user_stories = extract_prd_user_stories(
        prd.user_stories
    )

    # --------------------------------------------------------
    # If the PRD contains user stories
    # --------------------------------------------------------

    if user_stories:

        for index, story in enumerate(
            user_stories,
            start=1,
        ):

            features.append(
                {
                    "feature_id": prd.feature_id,

                    "feature_name": (
                        f"{prd.title or 'Product Feature'} "
                        f"- Task {index}"
                    ),

                    "description": story,

                    # PRD-selected features are treated as
                    # high priority unless explicit priority
                    # information exists elsewhere.
                    "priority": "High",

                    "rice_score": None,

                    "ice_score": None,

                    "dependencies": [],
                }
            )

        return features

    # --------------------------------------------------------
    # If user stories are not available,
    # use the PRD itself as one roadmap feature.
    # --------------------------------------------------------

    features.append(
        {
            "feature_id": prd.feature_id,

            "feature_name": (
                prd.title
                or "Product Feature"
            ),

            "description": (
                prd.problem_statement
                or prd.title
                or "Product feature"
            ),

            "priority": "High",

            "rice_score": None,

            "ice_score": None,

            "dependencies": [],
        }
    )

    return features


# ============================================================
# GENERATE ROADMAP
# ============================================================

@router.post("/generate")
def generate_roadmap(
    data: GenerateRoadmapRequest,
):

    db: Session = SessionLocal()

    try:

        # ====================================================
        # STEP 1
        # INITIALIZE ROADMAP AGENT
        # ====================================================

        roadmap_agent = RoadmapAgent()

        # ====================================================
        # STEP 2
        # DETERMINE ROADMAP SOURCE
        # ====================================================

        prioritized_features: list[dict] = []

        prd = None

        # ====================================================
        # OPTION A
        # SPECIFIC PRD SELECTED
        # ====================================================

        # IMPORTANT:
        #
        # If prd_id exists, the selected PRD gets priority.
        #
        # We DO NOT load all 33 prioritized features.
        #
        # This is the main fix for the Roadmap Planner UI.
        #

        if data.prd_id is not None:

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
                    ),
                )

            # ------------------------------------------------
            # Convert selected PRD into roadmap features.
            # ------------------------------------------------

            prioritized_features = (
                build_features_from_prd(
                    prd
                )
            )

        # ====================================================
        # OPTION B
        # EXPLICIT FEATURES SUPPLIED
        # ====================================================

        elif data.features:

            prioritized_features = [
                feature.model_dump()
                for feature in data.features
            ]

        # ====================================================
        # OPTION C
        # NO PRD AND NO EXPLICIT FEATURES
        # ====================================================

        else:

            # In this case we generate the overall product
            # roadmap using Prioritization Agent results.

            prioritized_features = (
                get_prioritized_features(
                    db
                )
            )

        # ====================================================
        # STEP 3
        # VALIDATE FEATURES
        # ====================================================

        if not prioritized_features:

            raise HTTPException(
                status_code=400,
                detail=(
                    "No features available "
                    "for roadmap generation."
                ),
            )

        # ====================================================
        # STEP 4
        # CONVERT TO ROADMAP AGENT FORMAT
        # ====================================================

        roadmap_features: list[dict] = []

        for index, feature in enumerate(
            prioritized_features,
            start=1,
        ):

            if not isinstance(
                feature,
                dict,
            ):

                raise HTTPException(
                    status_code=400,
                    detail=(
                        f"Feature {index} "
                        "must be an object."
                    ),
                )

            # ------------------------------------------------
            # Feature name
            # ------------------------------------------------

            feature_name = (
                feature.get(
                    "feature_name",
                    "",
                )
                or feature.get(
                    "feature_title",
                    "",
                )
            )

            feature_name = (
                str(feature_name)
                .strip()
            )

            if not feature_name:

                raise HTTPException(
                    status_code=400,
                    detail=(
                        f"Feature {index} "
                        "name cannot be empty."
                    ),
                )

            # ------------------------------------------------
            # Description
            # ------------------------------------------------

            description = (
                feature.get(
                    "description",
                    "",
                )
                or feature.get(
                    "feature_description",
                    "",
                )
                or "No description provided."
            )

            description = (
                str(description)
                .strip()
            )

            if not description:

                raise HTTPException(
                    status_code=400,
                    detail=(
                        f"Feature {index} "
                        "description cannot be empty."
                    ),
                )

            # ------------------------------------------------
            # Priority
            # ------------------------------------------------

            priority = feature.get(
                "priority",
                "Medium",
            )

            priority = str(
                priority
            ).strip()

            # Normalize priority values.
            priority_map = {
                "high": "High",
                "medium": "Medium",
                "low": "Low",
            }

            priority = priority_map.get(
                priority.lower(),
                priority,
            )

            if priority not in {
                "High",
                "Medium",
                "Low",
            }:

                raise HTTPException(
                    status_code=400,
                    detail=(
                        f"Feature {index} "
                        f"has invalid priority: "
                        f"{priority}"
                    ),
                )

            # ------------------------------------------------
            # Dependencies
            # ------------------------------------------------

            dependencies = feature.get(
                "dependencies",
                [],
            )

            if dependencies is None:
                dependencies = []

            if not isinstance(
                dependencies,
                list,
            ):

                raise HTTPException(
                    status_code=400,
                    detail=(
                        f"Feature {index} "
                        "dependencies must be a list."
                    ),
                )

            # Make sure every dependency is a string.
            dependencies = [
                str(dep).strip()
                for dep in dependencies
                if str(dep).strip()
            ]

            # ------------------------------------------------
            # Build final Roadmap Agent input
            # ------------------------------------------------

            roadmap_features.append(
                {
                    "feature_id": feature.get(
                        "feature_id"
                    ),

                    "feature_name": feature_name,

                    "description": description,

                    "priority": priority,

                    "rice_score": feature.get(
                        "rice_score"
                    ),

                    "ice_score": feature.get(
                        "ice_score"
                    ),

                    "dependencies": dependencies,
                }
            )

        # ====================================================
        # STEP 5
        # GENERATE STRUCTURED ROADMAP
        # ====================================================

        try:

            roadmap = (
                roadmap_agent.generate_roadmap(
                    roadmap_features
                )
            )

        except ValueError as exc:

            raise HTTPException(
                status_code=400,
                detail=str(exc),
            )

        except RuntimeError as exc:

            error_message = str(exc)

            if (
                "quota"
                in error_message.lower()
                or "429"
                in error_message
                or "resource_exhausted"
                in error_message.lower()
            ):

                raise HTTPException(
                    status_code=429,
                    detail=(
                        "Gemini API quota exceeded. "
                        "Please try again later."
                    ),
                )

            raise HTTPException(
                status_code=500,
                detail=error_message,
            )

        # ====================================================
        # STEP 6
        # SAVE ROADMAP ITEMS
        # ====================================================

        saved_items = []

        # Map feature names back to original FeatureRequest IDs.
        feature_id_map = {}

        for input_feature in roadmap_features:

            name = (
                input_feature[
                    "feature_name"
                ]
                .strip()
                .lower()
            )

            feature_id_map[name] = (
                input_feature.get(
                    "feature_id"
                )
            )

        # ----------------------------------------------------
        # Save every roadmap feature.
        # ----------------------------------------------------

        for index, roadmap_feature in enumerate(
            roadmap.features,
            start=1,
        ):

            title = make_feature_title(
                roadmap_feature.feature_name
            )

            description = (
                roadmap_feature.description
                or ""
            )

            status = (
                roadmap_feature.status
                or "Planned"
            )

            if status not in VALID_STATUSES:

                status = "Planned"

            release = (
                roadmap_feature.release
                or f"Sprint {index}"
            )

            # ------------------------------------------------
            # Find original FeatureRequest
            # ------------------------------------------------

            normalized_name = (
                roadmap_feature.feature_name
                .strip()
                .lower()
            )

            original_feature_id = (
                feature_id_map.get(
                    normalized_name
                )
            )

            feature = None

            if original_feature_id:

                feature = (
                    db.query(
                        FeatureRequest
                    )
                    .filter(
                        FeatureRequest.id
                        == original_feature_id
                    )
                    .first()
                )

            # ------------------------------------------------
            # If no existing FeatureRequest exists,
            # create one.
            #
            # This is mainly useful for PRD-generated
            # roadmap tasks.
            # ------------------------------------------------

            if feature is None:

                feature = FeatureRequest(
                    title=title,

                    description=description,

                    votes=0,

                    submitted_by=None,

                    request_date=date.today(),
                )

                db.add(feature)

                db.flush()

            # ------------------------------------------------
            # Create RoadmapItem
            # ------------------------------------------------

            item = RoadmapItem(
                feature_id=feature.id,

                # Sprint/release is stored in phase.
                phase=release,

                status=status,
            )

            db.add(item)

            db.flush()

            saved_items.append(
                {
                    "id": item.id,

                    "feature_id": feature.id,

                    "title": feature.title,

                    "description": (
                        feature.description
                    ),

                    "phase": release,

                    # Kept for frontend compatibility.
                    "quarter": "",

                    "status": status,

                    "progress": PROGRESS_MAP.get(
                        status,
                        0,
                    ),

                    "order": index,

                    "milestone": (
                        roadmap_feature.milestone
                    ),

                    "reason": (
                        roadmap_feature.reason
                    ),

                    "priority": (
                        roadmap_feature.priority
                    ),

                    "rice_score": (
                        roadmap_feature.rice_score
                    ),

                    "ice_score": (
                        roadmap_feature.ice_score
                    ),

                    "dependencies": (
                        roadmap_feature.dependencies
                    ),

                    "unresolved_dependencies": (
                        roadmap_feature
                        .unresolved_dependencies
                    ),

                    "blocked_by": (
                        roadmap_feature.blocked_by
                    ),
                }
            )

        # ====================================================
        # STEP 7
        # COMMIT
        # ====================================================

        db.commit()

        # ====================================================
        # STEP 8
        # RETURN RESPONSE
        # ====================================================

        return {
            "success": True,

            "message": (
                f"{len(saved_items)} roadmap features "
                "generated successfully."
            ),

            # If a PRD was selected this will contain
            # the selected PRD ID.
            "prd_id": data.prd_id,

            "roadmap": {
                "roadmap_name": (
                    roadmap.roadmap_name
                ),

                "timeline": (
                    roadmap.timeline
                ),

                "features": [
                    roadmap_feature_to_dict(
                        feature
                    )
                    for feature in roadmap.features
                ],
            },

            "items": saved_items,

            # Frontend compatibility.
            "data": saved_items,
        }

    except HTTPException:

        db.rollback()

        raise

    except Exception as exc:

        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=(
                f"Roadmap generation failed: "
                f"{str(exc)}"
            ),
        )

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
    data: GenerateFromPRDRequest,
):

    return generate_roadmap(
        GenerateRoadmapRequest(
            prd_id=data.prd_id,
            features=None,
            user_id=data.user_id,
        )
    )


# ============================================================
# ADD MANUAL MILESTONE
# ============================================================

class NewMilestoneRequest(BaseModel):

    title: str

    status: str = "Planned"


@router.post("/")
def add_milestone(
    data: NewMilestoneRequest,
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
                ),
            )

        status = data.status

        if status not in VALID_STATUSES:

            status = "Planned"

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

            phase="Sprint 1",

            status=status,
        )

        db.add(item)

        db.commit()

        db.refresh(item)

        return serialize_roadmap_item(
            item,
            feature,
        )

    except HTTPException:

        db.rollback()

        raise

    except Exception as exc:

        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=(
                f"Failed to create milestone: "
                f"{str(exc)}"
            ),
        )

    finally:

        db.close()


# ============================================================
# UPDATE STATUS
# ============================================================

@router.put("/{item_id}/status")
def update_status(
    item_id: int,
    status: str,
):

    db: Session = SessionLocal()

    try:

        if status not in VALID_STATUSES:

            raise HTTPException(
                status_code=400,
                detail=(
                    "Invalid status. "
                    "Use Completed, In Progress, "
                    "Planned, Blocked, or Backlog."
                ),
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
                    "Roadmap item not found."
                ),
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
            feature,
        )

    except HTTPException:

        db.rollback()

        raise

    except Exception as exc:

        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=(
                f"Failed to update status: "
                f"{str(exc)}"
            ),
        )

    finally:

        db.close()


# ============================================================
# DELETE ROADMAP ITEM
# ============================================================

@router.delete("/{item_id}")
def delete_milestone(
    item_id: int,
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
                    "Roadmap item not found."
                ),
            )

        feature_id = item.feature_id

        db.delete(item)

        db.flush()

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

            "message": (
                "Roadmap milestone deleted "
                "successfully."
            ),
        }

    except HTTPException:

        db.rollback()

        raise

    except Exception as exc:

        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=(
                f"Failed to delete roadmap item: "
                f"{str(exc)}"
            ),
        )

    finally:

        db.close()