from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from db import SessionLocal
from models import RoadmapItem, FeatureRequest, PRDDocument, PriorityScore
from agents.roadmap_agent import RoadmapAgent


router = APIRouter(
    prefix="/roadmap",
    tags=["Roadmap"]
)


# ============================================================
# REQUEST SCHEMAS
# ============================================================

class GenerateRoadmapRequest(BaseModel):
    prd_id: int


# ============================================================
# HELPER FUNCTIONS
# ============================================================

def progress_from_status(status: str) -> int:
    """
    Convert roadmap status into a percentage.
    """

    status_map = {
        "Completed": 100,
        "In Progress": 65,
        "Planned": 0,
        "Blocked": 0,
        "Backlog": 0,
    }

    return status_map.get(status, 0)


def clean_text(value) -> str:
    """
    Safely convert database values to strings.
    """

    if value is None:
        return ""

    return str(value).strip()


def get_feature_priority(
    db: Session,
    feature_id: int | None
) -> tuple[str, float | None, float | None]:

    """
    Get priority, RICE and ICE scores from PriorityScore.
    """

    if not feature_id:
        return "Medium", None, None

    priority_score = (
        db.query(PriorityScore)
        .filter(PriorityScore.feature_id == feature_id)
        .order_by(PriorityScore.created_at.desc())
        .first()
    )

    if not priority_score:
        return "Medium", None, None

    rice_score = priority_score.rice_score
    ice_score = priority_score.ice_score

    # --------------------------------------------------------
    # Determine priority from impact level / scores
    # --------------------------------------------------------

    impact_level = clean_text(
        getattr(priority_score, "impact_level", "")
    ).lower()

    if impact_level == "high":
        priority = "High"

    elif impact_level == "low":
        priority = "Low"

    else:
        # If impact level is not available, use RICE score
        if rice_score is not None:
            if rice_score >= 75:
                priority = "High"
            elif rice_score >= 40:
                priority = "Medium"
            else:
                priority = "Low"

        elif ice_score is not None:
            if ice_score >= 15:
                priority = "High"
            elif ice_score >= 8:
                priority = "Medium"
            else:
                priority = "Low"

        else:
            priority = "Medium"

    return priority, rice_score, ice_score


def get_feature_for_prd(
    db: Session,
    prd: PRDDocument
):
    """
    Find the FeatureRequest connected to the PRD.

    First:
        PRDDocument.feature_id

    If that is unavailable:
        Try matching the PRD title with FeatureRequest.title
    """

    feature = None

    # --------------------------------------------------------
    # 1. Use PRD -> FeatureRequest relationship
    # --------------------------------------------------------

    if prd.feature_id:

        feature = (
            db.query(FeatureRequest)
            .filter(
                FeatureRequest.id == prd.feature_id
            )
            .first()
        )

    # --------------------------------------------------------
    # 2. Fallback: match title
    # --------------------------------------------------------

    if not feature and prd.title:

        feature = (
            db.query(FeatureRequest)
            .filter(
                FeatureRequest.title == prd.title
            )
            .order_by(FeatureRequest.id.desc())
            .first()
        )

    return feature


def make_feature_for_roadmap(
    db: Session,
    prd: PRDDocument
):
    """
    Convert a generated PRD into the exact feature structure
    expected by the Roadmap Agent.

    IMPORTANT:
    The feature_name is always the PRD title.

    We DO NOT use the user story as the feature name.
    """

    feature = get_feature_for_prd(db, prd)

    # --------------------------------------------------------
    # Feature name
    # --------------------------------------------------------

    feature_name = clean_text(prd.title)

    if feature and feature.title:
        feature_name = clean_text(feature.title)

    if not feature_name:
        feature_name = "Product Feature"

    # --------------------------------------------------------
    # Description
    # --------------------------------------------------------

    description = ""

    if feature and feature.description:
        description = clean_text(feature.description)

    if not description:
        description = clean_text(prd.problem_statement)

    if not description:
        description = "Feature generated from the selected PRD."

    # --------------------------------------------------------
    # Priority / RICE / ICE
    # --------------------------------------------------------

    feature_id = feature.id if feature else prd.feature_id

    priority, rice_score, ice_score = get_feature_priority(
        db,
        feature_id
    )

    # --------------------------------------------------------
    # Dependencies
    # --------------------------------------------------------

    dependencies = []

    # The current PRD model stores user stories as text.
    # We do NOT treat user stories as dependencies.
    #
    # Dependencies will be determined by the Roadmap Agent
    # when enough dependency information is available.

    return {
        "feature_name": feature_name,
        "description": description,
        "priority": priority,
        "rice_score": rice_score,
        "ice_score": ice_score,
        "dependencies": dependencies,
    }


# ============================================================
# SERIALIZATION
# ============================================================

def serialize_roadmap_feature(
    feature,
    index: int
):

    status = getattr(
        feature,
        "status",
        "Planned"
    ) or "Planned"

    progress = getattr(
        feature,
        "progress",
        None
    )

    if progress is None:
        progress = progress_from_status(status)

    dependencies = getattr(
        feature,
        "dependencies",
        []
    ) or []

    unresolved_dependencies = getattr(
        feature,
        "unresolved_dependencies",
        []
    ) or []

    blocked_by = getattr(
        feature,
        "blocked_by",
        []
    ) or []

    resolution_steps = getattr(
        feature,
        "resolution_steps",
        []
    ) or []

    return {
        "id": index,

        "feature_name": clean_text(
            getattr(feature, "feature_name", "")
        ),

        "title": clean_text(
            getattr(feature, "feature_name", "")
        ),

        "description": clean_text(
            getattr(feature, "description", "")
        ),

        "priority": getattr(
            feature,
            "priority",
            "Medium"
        ),

        "rice_score": getattr(
            feature,
            "rice_score",
            None
        ),

        "ice_score": getattr(
            feature,
            "ice_score",
            None
        ),

        "release": clean_text(
            getattr(feature, "release", "Sprint 1")
        ),

        "sprint": clean_text(
            getattr(feature, "release", "Sprint 1")
        ),

        "milestone": clean_text(
            getattr(feature, "milestone", "Product Milestone")
        ),

        "status": status,

        "progress": progress,

        "dependencies": dependencies,

        "unresolved_dependencies": unresolved_dependencies,

        "blocked_by": blocked_by,

        "blocker": clean_text(
            getattr(feature, "blocker", "")
        ),

        "resolution_steps": resolution_steps,

        "next_action": clean_text(
            getattr(feature, "next_action", "")
        ),

        "reason": clean_text(
            getattr(feature, "reason", "")
        ),
    }


# ============================================================
# GENERATE ROADMAP FROM PRD
# ============================================================

@router.post("/generate")
def generate_roadmap(
    data: GenerateRoadmapRequest
):

    db = SessionLocal()

    try:

        # ====================================================
        # 1. FIND PRD
        # ====================================================

        prd = (
            db.query(PRDDocument)
            .filter(
                PRDDocument.id == data.prd_id
            )
            .first()
        )

        if not prd:

            raise HTTPException(
                status_code=404,
                detail="PRD not found."
            )

        # ====================================================
        # 2. CONVERT PRD INTO ROADMAP FEATURE
        # ====================================================

        roadmap_input = make_feature_for_roadmap(
            db,
            prd
        )

        print()
        print("=" * 70)
        print("ROADMAP INPUT")
        print("=" * 70)

        print(roadmap_input)

        # ====================================================
        # 3. CREATE ROADMAP AGENT
        # ====================================================

        agent = RoadmapAgent()

        # ====================================================
        # 4. GENERATE ROADMAP
        # ====================================================

        roadmap = agent.generate_roadmap(
            [roadmap_input]
        )

        # ====================================================
        # 5. SERIALIZE ROADMAP
        # ====================================================

        roadmap_features = []

        for index, feature in enumerate(
            roadmap.features,
            start=1
        ):

            roadmap_features.append(
                serialize_roadmap_feature(
                    feature,
                    index
                )
            )

        # ====================================================
        # 6. SAFETY CHECK
        # ====================================================
        #
        # The Roadmap Agent should preserve the feature name.
        # If Gemini slightly changes it, we restore the original
        # feature name instead of returning an invalid roadmap.
        #

        original_name = roadmap_input["feature_name"]

        for feature in roadmap_features:

            feature["feature_name"] = original_name
            feature["title"] = original_name

        # ====================================================
        # 7. SAVE ROADMAP ITEM
        # ====================================================

        feature_request = get_feature_for_prd(
            db,
            prd
        )

        if feature_request:

            # Remove previous roadmap items for this feature
            # so repeated generation does not create duplicates.

            db.query(RoadmapItem).filter(
                RoadmapItem.feature_id ==
                feature_request.id
            ).delete(
                synchronize_session=False
            )

            for roadmap_feature in roadmap_features:

                release = roadmap_feature.get(
                    "release",
                    "Sprint 1"
                )

                status = roadmap_feature.get(
                    "status",
                    "Planned"
                )

                roadmap_item = RoadmapItem(
                    feature_id=feature_request.id,
                    phase=release,
                    status=status,
                )

                db.add(roadmap_item)

            db.commit()

        # ====================================================
        # 8. PRINT RESULT
        # ====================================================

        print()
        print("=" * 70)
        print("PRODUCT ROADMAP")
        print("=" * 70)

        print(
            "Roadmap:",
            roadmap.roadmap_name
        )

        print(
            "Timeline:",
            roadmap.timeline
        )

        for index, item in enumerate(
            roadmap_features,
            start=1
        ):

            print()
            print(
                f"{index}. {item['feature_name']}"
            )

            print(
                "   Description:",
                item["description"]
            )

            print(
                "   Priority:",
                item["priority"]
            )

            print(
                "   RICE Score:",
                item["rice_score"]
            )

            print(
                "   ICE Score:",
                item["ice_score"]
            )

            print(
                "   Release:",
                item["release"]
            )

            print(
                "   Milestone:",
                item["milestone"]
            )

            print(
                "   Status:",
                item["status"]
            )

            print(
                "   Dependencies:",
                item["dependencies"]
            )

            print(
                "   Unresolved Dependencies:",
                item["unresolved_dependencies"]
            )

            print(
                "   Blocked By:",
                item["blocked_by"]
            )

            print(
                "   Blocker:",
                item["blocker"]
            )

            print(
                "   Resolution Steps:",
                item["resolution_steps"]
            )

            print(
                "   Next Action:",
                item["next_action"]
            )

            print(
                "   Reason:",
                item["reason"]
            )

        print()
        print("=" * 70)

        # ====================================================
        # 9. RETURN RESPONSE TO FRONTEND
        # ====================================================

        return {
            "success": True,

            "prd_id": prd.id,

            "document_id": prd.id,

            "roadmap_name": roadmap.roadmap_name,

            "timeline": roadmap.timeline,

            "features": roadmap_features,

            "roadmap": roadmap_features,

            "data": {
                "features": roadmap_features
            }
        }

    except HTTPException:
        raise

    except ValueError as exc:

        db.rollback()

        print()
        print(
            "ROADMAP VALIDATION ERROR:",
            str(exc)
        )

        raise HTTPException(
            status_code=500,
            detail=str(exc)
        )

    except Exception as exc:

        db.rollback()

        print()
        print(
            "ROADMAP GENERATION ERROR:",
            str(exc)
        )

        raise HTTPException(
            status_code=500,
            detail=f"Roadmap generation failed: {str(exc)}"
        )

    finally:

        db.close()


# ============================================================
# GET ALL SAVED ROADMAP ITEMS
# ============================================================

@router.get("/")
def get_roadmap():

    db = SessionLocal()

    try:

        rows = (
            db.query(
                RoadmapItem,
                FeatureRequest
            )
            .outerjoin(
                FeatureRequest,
                FeatureRequest.id ==
                RoadmapItem.feature_id
            )
            .order_by(
                RoadmapItem.id
            )
            .all()
        )

        result = []

        for index, (item, feature) in enumerate(
            rows,
            start=1
        ):

            status = (
                item.status
                or "Planned"
            )

            progress = progress_from_status(
                status
            )

            result.append({

                "id": item.id,

                "feature_id": item.feature_id,

                "feature_name": (
                    feature.title
                    if feature
                    else "Unknown Feature"
                ),

                "title": (
                    feature.title
                    if feature
                    else "Unknown Feature"
                ),

                "description": (
                    feature.description
                    if feature
                    else ""
                ),

                "phase": item.phase or "",

                "release": item.phase or "",

                "sprint": item.phase or "",

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

                "priority": "Medium",

                "rice_score": None,

                "ice_score": None,

                "dependencies": [],

                "unresolved_dependencies": [],

                "blocked_by": [],

                "blocker": "",

                "resolution_steps": [],

                "next_action": "",

                "reason": "",
            })

        return result

    except Exception as exc:

        raise HTTPException(
            status_code=500,
            detail=f"Failed to load roadmap: {str(exc)}"
        )

    finally:

        db.close()


# ============================================================
# GET SINGLE PRD
# ============================================================

@router.get("/prd/{prd_id}")
def get_prd_for_roadmap(
    prd_id: int
):

    db = SessionLocal()

    try:

        prd = (
            db.query(PRDDocument)
            .filter(
                PRDDocument.id == prd_id
            )
            .first()
        )

        if not prd:

            raise HTTPException(
                status_code=404,
                detail="PRD not found."
            )

        return {
            "success": True,

            "id": prd.id,

            "prd_id": prd.id,

            "document_id": prd.id,

            "title": prd.title,

            "problem_statement":
                prd.problem_statement,

            "objectives":
                prd.objectives,

            "user_stories":
                prd.user_stories,

            "acceptance_criteria":
                prd.acceptance_criteria,

            "success_metrics":
                prd.success_metrics,
        }

    except HTTPException:
        raise

    except Exception as exc:

        raise HTTPException(
            status_code=500,
            detail=f"Failed to load PRD: {str(exc)}"
        )

    finally:

        db.close()