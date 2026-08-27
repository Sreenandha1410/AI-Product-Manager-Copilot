# backend/routes/prd.py

import re

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from db import SessionLocal
from models import PRDDocument
from llm import llm


router = APIRouter(
    prefix="/prd",
    tags=["PRD Generator"]
)


# ============================================================
# REQUEST MODEL
# ============================================================

class PRDRequest(BaseModel):
    feature_id: int | None = None

    feature_name: str
    description: str

    priority: str = "Medium"
    business_goal: str = ""
    target_users: str = ""


# ============================================================
# GEMINI RESPONSE -> TEXT
# ============================================================

def _content_to_text(content) -> str:

    if content is None:
        return ""

    if isinstance(content, str):
        return content

    if isinstance(content, list):

        parts = []

        for item in content:

            if isinstance(item, str):
                parts.append(item)

            elif isinstance(item, dict):

                if "text" in item:
                    parts.append(str(item["text"]))

                elif "content" in item:
                    parts.append(str(item["content"]))

                else:
                    parts.append(str(item))

            else:
                parts.append(str(item))

        return "\n".join(parts)

    return str(content)


# ============================================================
# EXTRACT PRD SECTION
# ============================================================

def _extract(content: str, heading: str) -> str:

    content = _content_to_text(content)

    if not content:
        return ""

    pattern = rf"""
        (?:^|\n)
        \s*
        (?:\d+\.\s*)?
        {re.escape(heading)}
        \s*:?
        \s*\n
        (.*?)
        (?=
            \n\s*(?:\d+\.\s+)
            |
            \Z
        )
    """

    match = re.search(
        pattern,
        content,
        re.DOTALL |
        re.IGNORECASE |
        re.VERBOSE
    )

    if match:
        return match.group(1).strip()

    return ""


# ============================================================
# SERIALIZE PRD
# ============================================================

def _serialize_prd(prd: PRDDocument) -> dict:

    return {
        "id": prd.id,

        # Return all aliases for frontend compatibility
        "prd_id": prd.id,
        "document_id": prd.id,

        "feature_id": prd.feature_id,

        "title": prd.title,

        "problem_statement": (
            prd.problem_statement or ""
        ),

        "objectives": (
            prd.objectives or ""
        ),

        "user_stories": (
            prd.user_stories or ""
        ),

        "acceptance_criteria": (
            prd.acceptance_criteria or ""
        ),

        "success_metrics": (
            prd.success_metrics or ""
        ),

        "created_at": (
            str(prd.created_at)[:10]
            if prd.created_at
            else ""
        ),
    }


# ============================================================
# GET ALL PRDs
# ============================================================

@router.get("/")
def get_prds():

    db: Session = SessionLocal()

    try:

        prds = (
            db.query(PRDDocument)
            .order_by(
                PRDDocument.created_at.desc()
            )
            .all()
        )

        return [
            _serialize_prd(prd)
            for prd in prds
        ]

    finally:
        db.close()


# ============================================================
# GENERATE PRD
# ============================================================

@router.post("/generate")
def generate_prd(data: PRDRequest):

    prompt = f"""
You are a senior product manager.

Create a professional and implementation-oriented
Product Requirements Document (PRD).

PRODUCT REQUEST
{data.feature_name}

DESCRIPTION
{data.description}

PRIORITY
{data.priority}

BUSINESS GOAL
{data.business_goal}

TARGET USERS
{data.target_users}

Use exactly these numbered sections:

1. Overview
2. Problem Statement
3. Objectives
4. Functional Requirements
5. Non-Functional Requirements
6. User Stories
7. Acceptance Criteria
8. Success Metrics

User Stories must use:

As a [user],
I want [goal],
so that [benefit].

Make the requirements practical and specific.

Return ONLY the PRD.
Do not include explanations outside the PRD.
"""

    # ========================================================
    # CALL GEMINI
    # ========================================================

    try:

        response = llm.invoke(prompt)

        if hasattr(response, "content"):
            ai_content = response.content
        else:
            ai_content = response

        ai_content = _content_to_text(ai_content)

        if not ai_content.strip():

            raise HTTPException(
                status_code=500,
                detail="Gemini returned an empty response."
            )

    except HTTPException:
        raise

    except Exception as e:

        error_message = str(e)

        if (
            "429" in error_message
            or "quota" in error_message.lower()
            or "RESOURCE_EXHAUSTED" in error_message
        ):

            raise HTTPException(
                status_code=429,
                detail=(
                    "Gemini API quota exceeded. "
                    "Please try again later."
                )
            )

        raise HTTPException(
            status_code=500,
            detail=f"LLM error: {error_message}"
        )

    # ========================================================
    # EXTRACT SECTIONS
    # ========================================================

    problem = (
        _extract(
            ai_content,
            "Problem Statement"
        )
        or data.description
    )

    objectives = (
        _extract(
            ai_content,
            "Objectives"
        )
        or data.business_goal
        or "Improve the product experience."
    )

    user_stories = (
        _extract(
            ai_content,
            "User Stories"
        )
        or (
            f"As a {data.target_users or 'user'}, "
            f"I want {data.feature_name}, "
            f"so that I can achieve the intended benefit."
        )
    )

    acceptance_criteria = (
        _extract(
            ai_content,
            "Acceptance Criteria"
        )
        or (
            "The feature should satisfy all "
            "defined functional requirements."
        )
    )

    success_metrics = (
        _extract(
            ai_content,
            "Success Metrics"
        )
        or (
            f"Measure adoption, usage and "
            f"user satisfaction for {data.feature_name}."
        )
    )

    # ========================================================
    # SAVE PRD
    # ========================================================

    db: Session = SessionLocal()

    try:

        prd = PRDDocument(

            # Can be NULL.
            # Roadmap generation does NOT depend on
            # FeatureRequest anymore.
            feature_id=data.feature_id,

            title=data.feature_name,

            problem_statement=problem,

            objectives=objectives,

            user_stories=user_stories,

            acceptance_criteria=acceptance_criteria,

            success_metrics=success_metrics,
        )

        db.add(prd)

        db.commit()

        db.refresh(prd)

        return {
            "success": True,

            "message":
                "PRD generated and saved successfully.",

            "prd": ai_content,

            "id": prd.id,

            "prd_id": prd.id,

            "document_id": prd.id,

            "feature_id": prd.feature_id,

            "title": prd.title,

            "sections": {

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
        }

    except Exception as e:

        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=f"DB error: {str(e)}"
        )

    finally:
        db.close()


# ============================================================
# GET SINGLE PRD
# ============================================================

@router.get("/{prd_id}")
def get_prd(prd_id: int):

    db: Session = SessionLocal()

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

        return _serialize_prd(prd)

    finally:
        db.close()