from pydantic import BaseModel


class PRD(BaseModel):

    title: str

    problem_statement: str

    objectives: list[str]

    user_stories: list[str]

    functional_requirements: list[str]

    non_functional_requirements: list[str]

    acceptance_criteria: list[str]

    risks: list[str]

    success_metrics: list[str]