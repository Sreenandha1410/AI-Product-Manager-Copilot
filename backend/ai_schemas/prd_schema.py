from pydantic import BaseModel, Field


# =====================================================
# USER STORY SCHEMA
# =====================================================

class UserStory(BaseModel):
    story: str = Field(
        description="A user story written in the format: As a [user], I want [goal], so that [benefit]."
    )

    acceptance_criteria: list[str] = Field(
        description="Acceptance criteria specific to this user story."
    )


# =====================================================
# PRD SCHEMA
# =====================================================

class PRD(BaseModel):

    title: str = Field(
        description="Professional title of the Product Requirements Document."
    )

    problem_statement: str = Field(
        description="Clear description of the problem being solved."
    )

    objectives: list[str] = Field(
        description="Measurable objectives of the product or feature."
    )

    user_stories: list[UserStory] = Field(
        description="User stories with acceptance criteria for each story."
    )

    functional_requirements: list[str] = Field(
        description="Functional requirements describing what the system must do."
    )

    non_functional_requirements: list[str] = Field(
        description="Non-functional requirements such as performance, security, scalability, usability, and reliability."
    )

    acceptance_criteria: list[str] = Field(
        description="Overall acceptance criteria for the complete feature."
    )

    risks: list[str] = Field(
        description="Potential technical, business, security, or operational risks."
    )

    success_metrics: list[str] = Field(
        description="Measurable metrics used to determine whether the feature is successful."
    )