# backend/ai_schemas/theme_schema.py

from pydantic import BaseModel, Field, model_validator


class Theme(BaseModel):
    theme: str = Field(..., min_length=1)
    feedback_count: int = Field(..., ge=0)
    feedback: list[str] = Field(default_factory=list)

    @model_validator(mode="after")
    def fix_feedback_count(self):
        # Auto-correct count instead of raising error
        self.feedback_count = len(self.feedback)
        return self


class ThemeAnalysis(BaseModel):
    themes: list[Theme] = Field(default_factory=list)