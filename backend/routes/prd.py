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


# =========================================================
# REQUEST MODEL
# =========================================================

class PRDRequest(BaseModel):
    feature_id: int | None = None
    feature_name: str
    description: str
    priority: str
    business_goal: str
    target_users: str


# =========================================================
# GEMINI RESPONSE → TEXT
# =========================================================

def _content_to_text(content) -> str:
    """
    Converts Gemini/LangChain response content into plain text.

    Gemini may return:
    - a normal string
    - a list of strings
    - a list of dictionaries containing text
    """

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
                # Common LangChain/Gemini format
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


# =========================================================
# EXTRACT PRD SECTION
# =========================================================

def _extract(content, heading: str) -> str:

    # Make sure content is always a string
    content = _content_to_text(content)

    if not content:
        return ""

    # Example:
    #
    # 2. Problem Statement
    # Some text...
    #
    # 3. Objectives
    #
    pattern = rf"""
        (?:^|\n)
        (?:\d+\.\s*)?
        {re.escape(heading)}
        \s*:?
        \s*\n
        (.*?)
        (?=
            \n\d+\.\s
            |
            \Z
        )
    """

    match = re.search(
        pattern,
        content,
        re.DOTALL | re.IGNORECASE | re.VERBOSE
    )

    if match:
        return match.group(1).strip()

    return ""


# =========================================================
# GET ALL PRDs
# =========================================================

@router.get("/")
def get_prds():

    db: Session = SessionLocal()

    try:

        prds = (
            db.query(PRDDocument)
            .order_by(PRDDocument.created_at.desc())
            .all()
        )

        return [
            {
                "id": p.id,
                "title": p.title,
                "problem_statement": p.problem_statement,
                "objectives": p.objectives,
                "user_stories": p.user_stories,
                "acceptance_criteria": p.acceptance_criteria,
                "success_metrics": p.success_metrics,
                "created_at": (
                    str(p.created_at)[:10]
                    if p.created_at
                    else ""
                ),
            }
            for p in prds
        ]

    finally:
        db.close()


# =========================================================
# GENERATE PRD
# =========================================================

@router.post("/generate")
def generate_prd(data: PRDRequest):

    prompt = f"""
You are a senior product manager.

Create a detailed Product Requirements Document (PRD).

Feature Name:
{data.feature_name}

Description:
{data.description}

Priority:
{data.priority}

Business Goal:
{data.business_goal}

Target Users:
{data.target_users}

Write the PRD using exactly these numbered sections:

1. Overview
2. Problem Statement
3. Objectives
4. Functional Requirements
5. Non-Functional Requirements
6. User Stories
7. Acceptance Criteria
8. Success Metrics

For User Stories, use this format:

As a [user],
I want [goal],
so that [benefit].

Return ONLY the PRD.
Do not add explanations outside the PRD.
"""

    # -----------------------------------------------------
    # CALL GEMINI
    # -----------------------------------------------------

    try:

        response = llm.invoke(prompt)

        # Gemini/LangChain response
        if hasattr(response, "content"):
            ai_content = response.content
        else:
            ai_content = response

        # IMPORTANT:
        # Convert list/dict response to string
        ai_content = _content_to_text(ai_content)

        if not ai_content.strip():
            raise HTTPException(
                status_code=500,
                detail="Gemini returned an empty response."
            )

    except HTTPException:
        raise

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=f"LLM error: {e}"
        )


    # -----------------------------------------------------
    # EXTRACT SECTIONS
    # -----------------------------------------------------

    problem = (
        _extract(ai_content, "Problem Statement")
        or data.description
    )

    objectives = (
        _extract(ai_content, "Objectives")
        or data.business_goal
    )

    user_stories = (
        _extract(ai_content, "User Stories")
        or f"As a {data.target_users}, I want {data.feature_name}."
    )

    acceptance_criteria = (
        _extract(ai_content, "Acceptance Criteria")
        or "See full PRD for acceptance criteria."
    )

    success_metrics = (
        _extract(ai_content, "Success Metrics")
        or f"Measure adoption and user satisfaction for {data.feature_name}."
    )


    # -----------------------------------------------------
    # SAVE PRD TO DATABASE
    # -----------------------------------------------------

    db: Session = SessionLocal()

    try:

        prd = PRDDocument(
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

        # -------------------------------------------------
        # RETURN RESULT
        # -------------------------------------------------

        return {
            "prd": ai_content,

            "document_id": prd.id,

            "sections": {
                "problem_statement": prd.problem_statement,
                "objectives": prd.objectives,
                "user_stories": prd.user_stories,
                "acceptance_criteria": prd.acceptance_criteria,
                "success_metrics": prd.success_metrics,
            }
        }

    except Exception as e:

        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=f"DB error: {e}"
        )

    finally:
        db.close()


# =========================================================
# GET SINGLE PRD
# =========================================================

@router.get("/{prd_id}")
def get_prd(prd_id: int):

    db: Session = SessionLocal()

    try:

        p = (
            db.query(PRDDocument)
            .filter(PRDDocument.id == prd_id)
            .first()
        )

        if not p:

            raise HTTPException(
                status_code=404,
                detail="PRD not found."
            )

        return {
            "id": p.id,
            "title": p.title,
            "problem_statement": p.problem_statement,
            "objectives": p.objectives,
            "user_stories": p.user_stories,
            "acceptance_criteria": p.acceptance_criteria,
            "success_metrics": p.success_metrics,
            "created_at": (
                str(p.created_at)[:10]
                if p.created_at
                else ""
            ),
        }

    finally:
        db.close()