from typing import List, Literal, Optional

from pydantic import BaseModel, Field


class RoadmapFeature(BaseModel):
    """
    Represents a single feature in the product roadmap.
    """

    feature_name: str = Field(
        ...,
        min_length=1,
        description="Name of the product feature."
    )

    description: str = Field(
        ...,
        min_length=1,
        description="Short and practical description of the feature."
    )

    priority: Literal["High", "Medium", "Low"] = Field(
        ...,
        description=(
            "Priority assigned by the Prioritization Agent. "
            "Must be High, Medium, or Low."
        )
    )

    rice_score: Optional[float] = Field(
        default=None,
        ge=0,
        description=(
            "RICE score received from the Prioritization Agent. "
            "The value must not be negative."
        )
    )

    ice_score: Optional[float] = Field(
        default=None,
        ge=0,
        description=(
            "ICE score received from the Prioritization Agent. "
            "The value must not be negative."
        )
    )

    dependencies: List[str] = Field(
        default_factory=list,
        description=(
            "Features or tasks that must be completed "
            "before this feature can be implemented."
        )
    )

    unresolved_dependencies: List[str] = Field(
        default_factory=list,
        description=(
            "Dependencies that are not present in the "
            "provided feature list."
        )
    )

    blocked_by: List[str] = Field(
        default_factory=list,
        description=(
            "Unresolved dependencies that currently block "
            "this feature."
        )
    )

    release: str = Field(
        ...,
        min_length=1,
        description=(
            "Sprint or release in which the feature is planned. "
            "Use sprint-based values such as Sprint 1, Sprint 2, "
            "or Future Sprint. Do not use Q1, Q2, Q3, or Q4."
        )
    )

    milestone: str = Field(
        ...,
        min_length=1,
        description=(
            "Meaningful milestone associated with the feature."
        )
    )

    status: Literal[
        "Planned",
        "In Progress",
        "Completed",
        "Blocked"
    ] = Field(
        default="Planned",
        description=(
            "Current implementation status of the feature."
        )
    )

    reason: str = Field(
        ...,
        min_length=1,
        description=(
            "Practical reason explaining why the feature "
            "is placed in the selected sprint or release."
        )
    )


class Roadmap(BaseModel):
    """
    Represents the complete product roadmap.
    """

    roadmap_name: str = Field(
        ...,
        min_length=1,
        description="Name of the product roadmap."
    )

    timeline: str = Field(
        ...,
        min_length=1,
        description=(
            "Overall sprint-based roadmap timeline. "
            "Use sprint-based planning such as Sprint 1, "
            "Sprint 2, Sprint 3, or Future Sprint. "
            "Do not invent calendar years or use Q1, Q2, "
            "Q3, or Q4 unless explicitly provided."
        )
    )

    features: List[RoadmapFeature] = Field(
        ...,
        min_length=1,
        description=(
            "List of prioritized product features included "
            "in the roadmap."
        )
    )