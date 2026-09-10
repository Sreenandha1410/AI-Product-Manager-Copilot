# backend/ai_schemas/roadmap_schema.py

from pydantic import BaseModel, Field
from typing import List, Optional, Literal


class RoadmapFeature(BaseModel):

    feature_name: str = Field(
        ...,
        min_length=1
    )

    description: str = Field(
        ...,
        min_length=1
    )

    priority: Literal[
        "High",
        "Medium",
        "Low"
    ]

    rice_score: Optional[float] = Field(
        default=None,
        ge=0
    )

    ice_score: Optional[float] = Field(
        default=None,
        ge=0
    )

    dependencies: List[str] = Field(
        default_factory=list
    )

    unresolved_dependencies: List[str] = Field(
        default_factory=list
    )

    blocked_by: List[str] = Field(
        default_factory=list
    )

    release: str = Field(
        ...,
        min_length=1
    )

    milestone: str = Field(
        ...,
        min_length=1
    )

    status: Literal[
        "Planned",
        "In Progress",
        "Completed",
        "Blocked"
    ] = "Planned"

    progress: int = Field(
        default=0,
        ge=0,
        le=100
    )

    reason: str = Field(
        ...,
        min_length=1
    )

    blocker: str = ""

    resolution_steps: List[str] = Field(
        default_factory=list
    )

    next_action: str = ""


class Roadmap(BaseModel):

    roadmap_name: str = Field(
        ...,
        min_length=1
    )

    timeline: str = Field(
        ...,
        min_length=1
    )

    features: List[
        RoadmapFeature
    ] = Field(
        ...,
        min_length=1
    )