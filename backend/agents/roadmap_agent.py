# backend/agents/roadmap_agent.py

from config.gemini import llm
from pydantic import BaseModel, Field
from typing import List


# ============================================================
# ROADMAP SCHEMA
# ============================================================

class RoadmapMilestone(BaseModel):

    title: str = Field(
        description="Short implementation milestone name"
    )

    status: str = Field(
        default="Planned"
    )


class RoadmapGeneration(BaseModel):

    milestones: List[RoadmapMilestone]


# ============================================================
# ROADMAP AGENT
# ============================================================

class RoadmapAgent:

    def __init__(self):

        self.llm = llm.with_structured_output(
            RoadmapGeneration
        )

    def generate(
        self,
        title: str,
        problem_statement: str,
        objectives: str,
        user_stories: str,
        acceptance_criteria: str,
        success_metrics: str
    ):

        prompt = f"""
You are an expert product manager.

Generate a practical implementation roadmap
from the following Product Requirements Document.

PRD TITLE:
{title}

PROBLEM STATEMENT:
{problem_statement}

OBJECTIVES:
{objectives}

USER STORIES:
{user_stories}

ACCEPTANCE CRITERIA:
{acceptance_criteria}

SUCCESS METRICS:
{success_metrics}

IMPORTANT RULES:

1. Generate 3 to 6 roadmap milestones.
2. Do NOT use Q1, Q2, Q3 or Q4.
3. Do NOT use months or dates.
4. Each milestone should represent a meaningful
   implementation area.
5. Use short names.
6. Examples:
   - Authentication
   - Dashboard
   - Backend API
   - Data Export
   - Notifications
   - Testing
   - Deployment
7. The milestones must be based on the PRD.
8. Do not invent unrelated features.
9. Initial status of every milestone must be "Planned".

Return only structured roadmap milestones.
"""

        response = self.llm.invoke(prompt)

        return [
            milestone.model_dump()
            for milestone in response.milestones
        ]