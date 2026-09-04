# backend/agents/clustering_agent.py

import json
from typing import List, Dict
from datetime import date

from sentence_transformers import SentenceTransformer
from sklearn.cluster import AgglomerativeClustering

from agents.base_agent import BaseAgent
from config.openrouter import llm as openrouter_llm
from models import Theme, FeatureCluster, FeatureRequest


class ClusteringAgent(BaseAgent):

    def __init__(self):
        # Use OpenRouter for the AI-generated cluster information
        super().__init__(
            "Clustering Agent",
            llm_client=openrouter_llm
        )

        # Converts theme text into numerical vectors
        self.embedding_model = SentenceTransformer(
            "all-MiniLM-L6-v2"
        )

        # Similarity threshold
        self.similarity_threshold = 0.65

    # =========================================================
    # 1. GET UNCLUSTERED THEMES
    # =========================================================

    def get_themes(self) -> List[Theme]:

        themes = (
            self.db.query(Theme)
            .filter(Theme.cluster_id.is_(None))
            .all()
        )

        return themes

    # =========================================================
    # 2. CREATE EMBEDDINGS
    # =========================================================

    def create_embeddings(
        self,
        theme_texts: List[str]
    ):

        embeddings = self.embedding_model.encode(
            theme_texts,
            convert_to_numpy=True,
            normalize_embeddings=True,
        )

        return embeddings

    # =========================================================
    # 3. CLUSTER THEMES USING EMBEDDINGS
    # =========================================================

    def cluster_themes(
        self,
        themes: List[Theme]
    ) -> List[List[Theme]]:

        if not themes:
            return []

        # Only one theme
        if len(themes) == 1:
            return [themes]

        theme_texts = [
            str(theme.theme_label)
            for theme in themes
        ]

        # Generate embeddings
        embeddings = self.create_embeddings(
            theme_texts
        )

        # Similarity = 0.65
        # Distance = 1 - similarity
        distance_threshold = (
            1 - self.similarity_threshold
        )

        model = AgglomerativeClustering(
            n_clusters=None,
            distance_threshold=distance_threshold,
            metric="cosine",
            linkage="average",
        )

        labels = model.fit_predict(embeddings)

        # Group themes by cluster
        cluster_map: Dict[int, List[Theme]] = {}

        for theme, label in zip(
            themes,
            labels
        ):

            if label not in cluster_map:
                cluster_map[label] = []

            cluster_map[label].append(theme)

        return list(cluster_map.values())

    # =========================================================
    # 4. GENERATE INFORMATION FOR ALL CLUSTERS
    #    USING ONE OPENROUTER CALL
    # =========================================================

    def generate_all_cluster_information(
        self,
        theme_groups: List[List[Theme]]
    ) -> List[Dict]:

        # Prepare clusters for OpenRouter
        clusters_for_llm = []

        for index, group in enumerate(
            theme_groups,
            start=1
        ):

            theme_names = [
                str(theme.theme_label)
                for theme in group
            ]

            clusters_for_llm.append({
                "cluster_number": index,
                "themes": theme_names
            })

        prompt = f"""
You are a senior product manager.

Below are semantic clusters created from customer
feedback themes.

Analyze ALL clusters and generate useful product
information for each cluster.

Clusters:

{json.dumps(clusters_for_llm, indent=2)}

Return ONLY a valid JSON object.

Required format:

{{
    "clusters": [
        {{
            "cluster_number": 1,
            "cluster_name": "short meaningful name",
            "description": "common customer problem",
            "feature_title": "actionable feature request title",
            "feature_description": "feature that solves the problem"
        }}
    ]
}}

Rules:

1. Return exactly ONE object for every cluster.
2. Keep the original cluster_number.
3. Do not merge clusters.
4. Do not invent unrelated requirements.
5. cluster_name should contain 3-5 meaningful words.
6. The description must summarize the common customer problem
   represented by the themes.
7. The feature request must directly solve the common problem.
8. feature_title should be concise and actionable.
9. feature_description should clearly explain what the
   proposed feature should do.
10. Do not invent customer feedback.
11. Base the feature request only on the provided themes.
12. Do not create duplicate feature requests across clusters.
13. Return JSON only.
14. Do not use Markdown.
15. Do not include ```json or ``` code fences.
16. Do not include explanations before or after the JSON.

The output must contain exactly these fields for every cluster:

cluster_number
cluster_name
description
feature_title
feature_description
"""

        self.log_info(
            f"Sending {len(theme_groups)} clusters "
            f"to OpenRouter in ONE request..."
        )

        try:

            # =================================================
            # ONE OPENROUTER API CALL
            # =================================================

            response = self.ask_llm(prompt)

            # -------------------------------------------------
            # Handle list response
            # -------------------------------------------------

            if isinstance(response, list):

                text_parts = []

                for item in response:

                    if isinstance(item, str):
                        text_parts.append(item)

                    elif isinstance(item, dict):

                        if "text" in item:
                            text_parts.append(
                                str(item["text"])
                            )

                    else:
                        text_parts.append(
                            str(item)
                        )

                response = "\n".join(
                    text_parts
                )

            # -------------------------------------------------
            # Handle dictionary response
            # -------------------------------------------------

            if isinstance(response, dict):

                data = response

            else:

                response = str(response)

                cleaned = response.strip()

                # Remove Markdown code fences
                if cleaned.startswith("```json"):

                    cleaned = cleaned[
                        len("```json"):
                    ]

                elif cleaned.startswith("```"):

                    cleaned = cleaned[
                        len("```"):
                    ]

                if cleaned.endswith("```"):

                    cleaned = cleaned[:-3]

                cleaned = cleaned.strip()

                # Parse JSON
                data = json.loads(cleaned)

            # -------------------------------------------------
            # Validate response
            # -------------------------------------------------

            if "clusters" not in data:

                raise ValueError(
                    "OpenRouter response does not contain "
                    "'clusters'."
                )

            results = data["clusters"]

            if not isinstance(results, list):

                raise ValueError(
                    "'clusters' must be a list."
                )

            # -------------------------------------------------
            # Validate each cluster
            # -------------------------------------------------

            required_fields = [
                "cluster_number",
                "cluster_name",
                "description",
                "feature_title",
                "feature_description",
            ]

            validated_results = []

            for item in results:

                if not isinstance(item, dict):

                    raise ValueError(
                        "Each cluster must be a JSON object."
                    )

                for field in required_fields:

                    if field not in item:

                        raise ValueError(
                            f"Missing field '{field}' "
                            f"in OpenRouter response."
                        )

                validated_results.append(item)

            # Check that OpenRouter returned the same
            # number of clusters that were created
            if len(validated_results) != len(theme_groups):

                raise ValueError(
                    f"Expected {len(theme_groups)} cluster "
                    f"results but received "
                    f"{len(validated_results)}."
                )

            self.log_info(
                f"OpenRouter successfully generated "
                f"information for "
                f"{len(validated_results)} clusters."
            )

            return validated_results

        except json.JSONDecodeError as e:

            self.log_error(
                f"OpenRouter returned invalid JSON: {e}"
            )

            raise RuntimeError(
                "OpenRouter returned invalid JSON."
            ) from e

        except Exception as e:

            self.log_error(
                f"OpenRouter cluster generation failed: {e}"
            )

            raise

    # =========================================================
    # 5. SAVE ONE CLUSTER
    # =========================================================

    def save_cluster(
        self,
        themes: List[Theme],
        cluster_info: Dict
    ) -> Dict:

        # IDs of themes inside this cluster
        related_ids = ", ".join(
            str(theme.id)
            for theme in themes
        )

        # Total frequency becomes votes
        total_votes = sum(
            theme.frequency or 0
            for theme in themes
        )

        # -----------------------------------------------------
        # Save FeatureCluster
        # -----------------------------------------------------

        cluster = FeatureCluster(

            cluster_name=cluster_info[
                "cluster_name"
            ],

            description=cluster_info[
                "description"
            ],

            related_theme_ids=related_ids,

            feature_count=len(themes),
        )

        self.db.add(cluster)

        # Get database ID
        self.db.flush()

        # -----------------------------------------------------
        # Update Theme.cluster_id
        # -----------------------------------------------------

        for theme in themes:

            # cluster_id column is String
            theme.cluster_id = str(
                cluster.id
            )

        self.db.flush()

        # -----------------------------------------------------
        # Save FeatureRequest
        # -----------------------------------------------------

        feature_request = FeatureRequest(

            title=cluster_info[
                "feature_title"
            ],

            description=cluster_info[
                "feature_description"
            ],

            votes=total_votes,

            submitted_by=None,

            request_date=date.today(),
        )

        self.db.add(feature_request)

        # Commit
        self.db.commit()

        # Refresh
        self.db.refresh(cluster)
        self.db.refresh(feature_request)

        return {

            "cluster_id":
                cluster.id,

            "cluster_name":
                cluster.cluster_name,

            "description":
                cluster.description,

            "feature_count":
                cluster.feature_count,

            "feature_request_id":
                feature_request.id,

            "feature_title":
                feature_request.title,

            "total_votes":
                total_votes,
        }

    # =========================================================
    # 6. MAIN RUN
    # =========================================================

    def run(self) -> Dict:

        try:

            self.log_info(
                "Starting clustering process..."
            )

            # -------------------------------------------------
            # Get unclustered themes
            # -------------------------------------------------

            themes = self.get_themes()

            if not themes:

                self.log_info(
                    "No unclustered themes found."
                )

                return self.success({

                    "message":
                        "No unclustered themes found.",

                    "clusters_created": 0,

                    "clusters": [],
                })

            self.log_info(
                f"Found {len(themes)} "
                f"unclustered themes."
            )

            # -------------------------------------------------
            # Semantic clustering
            # -------------------------------------------------

            theme_groups = self.cluster_themes(
                themes
            )

            self.log_info(
                f"Formed {len(theme_groups)} "
                f"clusters."
            )

            # -------------------------------------------------
            # ONE OPENROUTER CALL
            # -------------------------------------------------

            cluster_information = (
                self.generate_all_cluster_information(
                    theme_groups
                )
            )

            # -------------------------------------------------
            # Save clusters
            # -------------------------------------------------

            results = []

            for index, theme_group in enumerate(
                theme_groups,
                start=1
            ):

                self.log_info(
                    f"Saving cluster {index} "
                    f"with {len(theme_group)} themes..."
                )

                # Find OpenRouter information
                cluster_info = next(
                    (
                        item
                        for item in cluster_information
                        if int(
                            item["cluster_number"]
                        ) == index
                    ),
                    None
                )

                if cluster_info is None:

                    raise ValueError(
                        f"No OpenRouter information "
                        f"found for cluster {index}."
                    )

                saved = self.save_cluster(
                    theme_group,
                    cluster_info
                )

                results.append(saved)

                self.log_info(
                    f"Saved cluster: "
                    f"{saved['cluster_name']}"
                )

            # -------------------------------------------------
            # Complete
            # -------------------------------------------------

            self.log_info(
                f"Clustering complete. "
                f"{len(results)} clusters created."
            )

            return self.success({

                "clusters_created":
                    len(results),

                "clusters":
                    results,
            })

        except Exception as e:

            self.db.rollback()

            self.log_error(
                f"Clustering failed: {str(e)}"
            )

            return self.failure(
                str(e)
            )

        finally:

            self.close()

    # =========================================================
    # 7. CLOSE
    # =========================================================

    def close(self):

        super().close()