# backend/agents/prd_agent.py

from config.gemini import llm              # ← fixed import
from prompts.prd_prompt import prd_prompt  # ← fixed import
from ai_schemas.prd_schema import PRD         # ← correct

from agents.base_agent import BaseAgent
from models import PRDDocument, FeatureRequest


class PRDAgent(BaseAgent):
    """
    AI agent responsible for generating and saving
    Product Requirement Documents.
    """

    def __init__(self):
        super().__init__("PRD Agent")
        self.structured_llm = llm.with_structured_output(PRD)
        self.prompt          = prd_prompt
        self.chain           = self.prompt | self.structured_llm

    # ─────────────────────────────────────────────
    # GENERATE PRD (returns Pydantic PRD object)
    # ─────────────────────────────────────────────

    def generate_prd(
        self,
        feature_name: str,
        priority:     str,
        feedback:     str,
    ) -> PRD:
        """
        Calls Gemini and returns a structured PRD object.
        Does NOT save to DB — use generate_and_save() for that.
        """
        response = self.chain.invoke({
            "feature_name": feature_name,
            "priority":     priority,
            "feedback":     feedback,
        })
        return response

    # ─────────────────────────────────────────────
    # GENERATE AND SAVE TO POSTGRESQL
    # ─────────────────────────────────────────────

    def generate_and_save(
        self,
        feature_name: str,
        priority:     str,
        feedback:     str,
        feature_id:   int | None = None,
    ) -> dict:
        """
        Generates PRD via Gemini and saves to prd_documents table.
        Called by OrchestratorAgent and the /prd/generate route.

        Returns success/failure dict with saved document ID.
        """
        try:
            self.log_info(f"Generating PRD for: {feature_name}")

            prd = self.generate_prd(feature_name, priority, feedback)

            # ── Save to PostgreSQL ──────────────────────────
            doc = PRDDocument(
                feature_id          = feature_id,
                title               = feature_name,
                problem_statement   = prd.problem_statement,
                objectives          = "\n".join(prd.objectives),
                user_stories        = "\n".join(prd.user_stories),
                acceptance_criteria = "\n".join(prd.acceptance_criteria),
                success_metrics     = "\n".join(prd.success_metrics),
            )
            self.db.add(doc)
            self.db.commit()
            self.db.refresh(doc)

            self.log_info(f"PRD saved: ID {doc.id}")

            return self.success({
                "document_id":        doc.id,
                "title":              doc.title,
                "problem_statement":  doc.problem_statement,
                "objectives":         doc.objectives,
                "user_stories":       doc.user_stories,
                "acceptance_criteria": doc.acceptance_criteria,
                "success_metrics":    doc.success_metrics,
                # Also return raw lists for orchestrator use
                "prd_object": {
                    "objectives":             prd.objectives,
                    "user_stories":           prd.user_stories,
                    "functional_requirements": prd.functional_requirements,
                    "non_functional_requirements": prd.non_functional_requirements,
                    "acceptance_criteria":    prd.acceptance_criteria,
                    "risks":                  prd.risks,
                    "success_metrics":        prd.success_metrics,
                }
            })

        except Exception as e:
            self.db.rollback()
            self.log_error(f"PRD generation failed: {str(e)}")
            return self.failure(str(e))

    # ─────────────────────────────────────────────
    # GET SAVED PRDs FROM DB
    # ─────────────────────────────────────────────

    def get_all_prds(self) -> list:
        docs = (
            self.db.query(PRDDocument)
            .order_by(PRDDocument.created_at.desc())
            .all()
        )
        return [
            {
                "id":                  d.id,
                "title":               d.title,
                "problem_statement":   d.problem_statement,
                "objectives":          d.objectives,
                "user_stories":        d.user_stories,
                "acceptance_criteria": d.acceptance_criteria,
                "success_metrics":     d.success_metrics,
                "created_at":          str(d.created_at)[:10] if d.created_at else "",
            }
            for d in docs
        ]