# backend/agents/prd_agent.py

import json

from config.openrouter import llm as openrouter_llm
from prompts.prd_prompt import prd_prompt
from ai_schemas.prd_schema import PRD

from agents.base_agent import BaseAgent
from models import PRDDocument


class PRDAgent(BaseAgent):
    """
    AI agent responsible for generating structured
    Product Requirements Documents and saving them
    to PostgreSQL.

    Uses OpenRouter for PRD generation.
    """

    def __init__(self):
        super().__init__(
            "PRD Agent",
            llm_client=openrouter_llm
        )

        # Prompt
        self.prompt = prd_prompt

    # =====================================================
    # GENERATE PRD
    # =====================================================

    def generate_prd(
        self,
        feature_name: str,
        priority: str,
        feedback: str,
    ) -> PRD:
        """
        Generate a structured PRD using OpenRouter.

        Returns:
            PRD Pydantic object
        """

        if not feature_name or not feature_name.strip():
            raise ValueError("Feature name cannot be empty.")

        if not priority or not priority.strip():
            priority = "Medium"

        if not feedback:
            feedback = ""

        # -------------------------------------------------
        # Create prompt messages
        # -------------------------------------------------

        messages = self.prompt.format_messages(
            feature_name=feature_name,
            priority=priority,
            feedback=feedback,
        )

        # -------------------------------------------------
        # Call OpenRouter
        # -------------------------------------------------

        try:
            response = self.llm.invoke(messages)
        except Exception as e:
            error_message = str(e)

            if "429" in error_message or "Too Many Requests" in error_message:
                raise RuntimeError(
                    "OpenRouter rate limit reached. Please wait a few minutes and try again."
        )

            raise RuntimeError(f"PRD generation failed: {error_message}")

        # -------------------------------------------------
        # Extract response content
        # -------------------------------------------------

        content = response.content

        if isinstance(content, list):

            text_parts = []

            for item in content:

                if isinstance(item, str):
                    text_parts.append(item)

                elif isinstance(item, dict):

                    if "text" in item:
                        text_parts.append(
                            str(item["text"])
                        )

            content = "\n".join(text_parts)

        content = str(content).strip()

        # -------------------------------------------------
        # Remove Markdown code fences
        # -------------------------------------------------

        if content.startswith("```json"):

            content = content[
                len("```json"):
            ]

        elif content.startswith("```"):

            content = content[
                len("```"):
            ]

        if content.endswith("```"):

            content = content[:-3]

        content = content.strip()

        # -------------------------------------------------
        # Parse JSON
        # -------------------------------------------------

        try:

            data = json.loads(content)

        except json.JSONDecodeError as exc:

            self.log_error(
                f"OpenRouter returned invalid JSON: {exc}"
            )

            self.log_error(
                f"Raw response: {content}"
            )

            raise RuntimeError(
                "OpenRouter returned invalid JSON."
            ) from exc

        # -------------------------------------------------
        # Validate PRD using Pydantic
        # -------------------------------------------------

        try:

            prd = PRD.model_validate(data)

        except Exception as exc:

            self.log_error(
                f"PRD validation failed: {exc}"
            )

            raise RuntimeError(
                f"Invalid PRD structure returned by OpenRouter: {exc}"
            ) from exc

        # -------------------------------------------------
        # Additional validation
        # -------------------------------------------------

        if not prd.title.strip():
            raise ValueError(
                "Generated PRD title is empty."
            )

        if not prd.problem_statement.strip():
            raise ValueError(
                "Generated PRD problem statement is empty."
            )

        # Every user story must have acceptance criteria
        for index, story in enumerate(
            prd.user_stories,
            start=1
        ):

            if not story.story.strip():

                raise ValueError(
                    f"User Story {index} is empty."
                )

            if not story.acceptance_criteria:

                raise ValueError(
                    f"User Story {index} has no "
                    f"acceptance criteria."
                )

        return prd

    # =====================================================
    # GENERATE AND SAVE
    # =====================================================

    def generate_and_save(
        self,
        feature_name: str,
        priority: str,
        feedback: str,
        feature_id: int | None = None,
    ) -> dict:
        """
        Generate a PRD using OpenRouter and save it
        to PostgreSQL.
        """

        try:

            self.log_info(
                f"Generating PRD for: {feature_name}"
            )

            # -------------------------------------------------
            # GENERATE PRD
            # -------------------------------------------------

            prd = self.generate_prd(
                feature_name=feature_name,
                priority=priority,
                feedback=feedback,
            )

            # -------------------------------------------------
            # FORMAT USER STORIES
            # -------------------------------------------------

            formatted_user_stories = []

            for index, user_story in enumerate(
                prd.user_stories,
                start=1
            ):

                story_text = (
                    f"User Story {index}:\n"
                    f"{user_story.story}\n\n"
                    f"Acceptance Criteria:\n"
                )

                for criterion_index, criterion in enumerate(
                    user_story.acceptance_criteria,
                    start=1
                ):

                    story_text += (
                        f"{criterion_index}. "
                        f"{criterion}\n"
                    )

                formatted_user_stories.append(
                    story_text.strip()
                )

            user_stories_text = "\n\n".join(
                formatted_user_stories
            )

            # -------------------------------------------------
            # FORMAT OBJECTIVES
            # -------------------------------------------------

            objectives_text = "\n".join(
                f"{index}. {objective}"
                for index, objective in enumerate(
                    prd.objectives,
                    start=1
                )
            )

            # -------------------------------------------------
            # FORMAT FUNCTIONAL REQUIREMENTS
            # -------------------------------------------------

            functional_requirements_text = "\n".join(
                f"{index}. {requirement}"
                for index, requirement in enumerate(
                    prd.functional_requirements,
                    start=1
                )
            )

            # -------------------------------------------------
            # FORMAT NON-FUNCTIONAL REQUIREMENTS
            # -------------------------------------------------

            non_functional_requirements_text = "\n".join(
                f"{index}. {requirement}"
                for index, requirement in enumerate(
                    prd.non_functional_requirements,
                    start=1
                )
            )

            # -------------------------------------------------
            # FORMAT ACCEPTANCE CRITERIA
            # -------------------------------------------------

            acceptance_criteria_text = "\n".join(
                f"{index}. {criterion}"
                for index, criterion in enumerate(
                    prd.acceptance_criteria,
                    start=1
                )
            )

            # -------------------------------------------------
            # FORMAT RISKS
            # -------------------------------------------------

            risks_text = "\n".join(
                f"{index}. {risk}"
                for index, risk in enumerate(
                    prd.risks,
                    start=1
                )
            )

            # -------------------------------------------------
            # FORMAT SUCCESS METRICS
            # -------------------------------------------------

            success_metrics_text = "\n".join(
                f"{index}. {metric}"
                for index, metric in enumerate(
                    prd.success_metrics,
                    start=1
                )
            )

            # -------------------------------------------------
            # SAVE TO DATABASE
            # -------------------------------------------------

            doc = PRDDocument(
                feature_id=feature_id,

                title=prd.title or feature_name,

                problem_statement=prd.problem_statement,

                objectives=objectives_text,

                user_stories=user_stories_text,

                functional_requirements=
                    functional_requirements_text,

                non_functional_requirements=
                    non_functional_requirements_text,

                acceptance_criteria=
                    acceptance_criteria_text,

                risks=risks_text,

                success_metrics=success_metrics_text,
            )

            self.db.add(doc)

            self.db.commit()

            self.db.refresh(doc)

            self.log_info(
                f"PRD saved successfully: ID {doc.id}"
            )

            # -------------------------------------------------
            # RETURN RESPONSE
            # -------------------------------------------------

            return self.success(
                {
                    "document_id": doc.id,

                    "title": doc.title,

                    "problem_statement":
                        doc.problem_statement,

                    "objectives":
                        doc.objectives,

                    "user_stories":
                        doc.user_stories,

                    "functional_requirements":
                        doc.functional_requirements,

                    "non_functional_requirements":
                        doc.non_functional_requirements,

                    "acceptance_criteria":
                        doc.acceptance_criteria,

                    "risks":
                        doc.risks,

                    "success_metrics":
                        doc.success_metrics,

                    # -----------------------------------------
                    # STRUCTURED PRD
                    # -----------------------------------------

                    "prd_object": {

                        "title":
                            prd.title,

                        "problem_statement":
                            prd.problem_statement,

                        "objectives":
                            prd.objectives,

                        "user_stories": [
                            {
                                "story":
                                    story.story,

                                "acceptance_criteria":
                                    story.acceptance_criteria,
                            }
                            for story in prd.user_stories
                        ],

                        "functional_requirements":
                            prd.functional_requirements,

                        "non_functional_requirements":
                            prd.non_functional_requirements,

                        "acceptance_criteria":
                            prd.acceptance_criteria,

                        "risks":
                            prd.risks,

                        "success_metrics":
                            prd.success_metrics,
                    },
                }
            )

        except Exception as e:

            self.db.rollback()

            self.log_error(
                f"PRD generation failed: {str(e)}"
            )

            return self.failure(
                str(e)
            )

    # =====================================================
    # GET ALL PRDs
    # =====================================================

    def get_all_prds(self) -> list:

        docs = (
            self.db.query(PRDDocument)
            .order_by(
                PRDDocument.created_at.desc()
            )
            .all()
        )

        return [
            {
                "id":
                    d.id,

                "title":
                    d.title,

                "problem_statement":
                    d.problem_statement,

                "objectives":
                    d.objectives,

                "user_stories":
                    d.user_stories,

                "functional_requirements":
                    d.functional_requirements,

                "non_functional_requirements":
                    d.non_functional_requirements,

                "acceptance_criteria":
                    d.acceptance_criteria,

                "risks":
                    d.risks,

                "success_metrics":
                    d.success_metrics,

                "created_at":
                    (
                        str(d.created_at)[:10]
                        if d.created_at
                        else ""
                    ),
            }

            for d in docs
        ]