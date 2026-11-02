# backend/agents/roadmap_agent.py

from config.openrouter import llm
from prompts.roadmap_prompt import roadmap_prompt
from ai_schemas.roadmap_schema import Roadmap
from agents.base_agent import BaseAgent


class RoadmapAgent(BaseAgent):
    """
    Converts prioritized product features / PRDs
    into an executable sprint-based roadmap.
    """

    def __init__(self):
        super().__init__("Roadmap Agent")

        self.structured_llm = llm.with_structured_output(Roadmap)

        self.prompt = roadmap_prompt
        self.chain = self.prompt | self.structured_llm

    # ============================================================
    # PREPARE PRIORITIZATION RESULTS
    # ============================================================

    def prepare_prioritization_results(self, prioritization_result):

        if not prioritization_result:
            raise ValueError(
                "Prioritization result cannot be empty."
            )

        if not prioritization_result.get("success"):
            raise ValueError(
                "Prioritization Agent did not complete successfully."
            )

        data = prioritization_result.get("data")

        if not data:
            raise ValueError(
                "Prioritization result does not contain data."
            )

        features = data.get("features")

        if not features:
            raise ValueError(
                "Prioritization result does not contain features."
            )

        roadmap_features = []

        for index, feature in enumerate(features, start=1):

            if not isinstance(feature, dict):
                raise ValueError(
                    f"Feature {index} must be a dictionary."
                )

            feature_name = (
                feature.get("feature_title")
                or feature.get("title")
                or feature.get("feature_name")
                or ""
            )

            description = (
                feature.get("feature_description")
                or feature.get("description")
                or "No description provided."
            )

            priority = (
                feature.get("priority")
                or "Medium"
            )

            if isinstance(priority, str):
                priority = priority.strip().capitalize()

            if priority not in {
                "High",
                "Medium",
                "Low",
            }:
                priority = "Medium"

            dependencies = feature.get(
                "dependencies",
                []
            )

            if dependencies is None:
                dependencies = []

            if not isinstance(dependencies, list):
                dependencies = []

            roadmap_features.append(
                {
                    "feature_name": feature_name.strip(),
                    "description": description.strip(),
                    "priority": priority,
                    "rice_score": feature.get("rice_score"),
                    "ice_score": feature.get("ice_score"),
                    "dependencies": dependencies,
                }
            )

        return roadmap_features

    # ============================================================
    # VALIDATE INPUT
    # ============================================================

    def validate_features(self, features):

        if not features:
            raise ValueError(
                "Features cannot be empty."
            )

        required_fields = {
            "feature_name",
            "description",
            "priority",
            "rice_score",
            "ice_score",
            "dependencies",
        }

        for index, feature in enumerate(
            features,
            start=1
        ):

            if not isinstance(feature, dict):
                raise ValueError(
                    f"Feature {index} must be a dictionary."
                )

            missing = (
                required_fields - feature.keys()
            )

            if missing:
                raise ValueError(
                    f"Feature {index} is missing fields: "
                    f"{sorted(missing)}"
                )

            name = feature["feature_name"]

            if not isinstance(name, str):
                raise ValueError(
                    f"Feature {index} name must be a string."
                )

            if not name.strip():
                raise ValueError(
                    f"Feature {index} name cannot be empty."
                )

            description = feature["description"]

            if not isinstance(description, str):
                raise ValueError(
                    f"Feature {index} description must be a string."
                )

            if not description.strip():
                feature["description"] = (
                    "No description provided."
                )

            priority = feature["priority"]

            if isinstance(priority, str):
                priority = (
                    priority.strip()
                    .capitalize()
                )

            if priority not in {
                "High",
                "Medium",
                "Low",
            }:
                priority = "Medium"

            feature["priority"] = priority

            dependencies = feature["dependencies"]

            if dependencies is None:
                dependencies = []

            if not isinstance(
                dependencies,
                list
            ):
                dependencies = []

            feature["dependencies"] = dependencies

    # ============================================================
    # DEPENDENCY LOGIC
    # ============================================================

    def apply_dependency_logic(
        self,
        roadmap,
        input_features
    ):

        input_names = {
            feature["feature_name"]
            .strip()
            .lower()
            for feature in input_features
        }

        dependency_map = {
            feature["feature_name"]
            .strip()
            .lower(): feature.get(
                "dependencies",
                []
            )
            for feature in input_features
        }

        for roadmap_feature in roadmap.features:

            name = (
                roadmap_feature.feature_name
                .strip()
                .lower()
            )

            dependencies = dependency_map.get(
                name,
                []
            )

            roadmap_feature.dependencies = (
                dependencies
            )

            unresolved = []

            for dependency in dependencies:

                if not isinstance(
                    dependency,
                    str
                ):
                    continue

                dependency_name = (
                    dependency.strip().lower()
                )

                if dependency_name not in input_names:
                    unresolved.append(
                        dependency
                    )

            roadmap_feature.unresolved_dependencies = (
                unresolved
            )

            roadmap_feature.blocked_by = (
                unresolved.copy()
            )

            # ----------------------------------------------------
            # BLOCKED FEATURE
            # ----------------------------------------------------

            if unresolved:

                roadmap_feature.status = "Blocked"

                roadmap_feature.release = (
                    "Future Sprint"
                )

                if hasattr(
                    roadmap_feature,
                    "progress"
                ):
                    roadmap_feature.progress = 0

                if hasattr(
                    roadmap_feature,
                    "blocker"
                ):
                    roadmap_feature.blocker = (
                        "This feature depends on "
                        + ", ".join(unresolved)
                        + ", which is not currently available."
                    )

                if hasattr(
                    roadmap_feature,
                    "resolution_steps"
                ):
                    roadmap_feature.resolution_steps = [
                        f"Identify the required dependency: {dependency}."
                        for dependency in unresolved
                    ]

                if hasattr(
                    roadmap_feature,
                    "next_action"
                ):
                    roadmap_feature.next_action = (
                        "Resolve the dependency before "
                        "starting implementation."
                    )

    # ============================================================
    # GENERATE ROADMAP
    # ============================================================

    def generate_roadmap(
        self,
        features
    ):

        self.validate_features(features)

        try:

            self.log_info(
                f"Generating roadmap for "
                f"{len(features)} features."
            )

            response = self.chain.invoke(
                {
                    "features": features
                }
            )

            if not response:
                raise ValueError(
                    "Roadmap Agent returned an empty response."
                )

            if not response.features:
                raise ValueError(
                    "Generated roadmap contains no features."
                )

            # ----------------------------------------------------
            # IMPORTANT:
            # Do NOT require Gemini to return the exact same
            # feature-name spelling.
            #
            # Gemini may slightly rewrite a feature name.
            # ----------------------------------------------------

            self.apply_dependency_logic(
                response,
                features
            )

            self.log_info(
                "Roadmap generated successfully."
            )

            return response

        except ValueError:
            raise

        except Exception as exc:

            self.log_error(
                f"Roadmap generation failed: {str(exc)}"
            )

            raise RuntimeError(
                "Unable to generate product roadmap."
            ) from exc
