# backend/tools/retrieval_tools.py

from sqlalchemy import or_
from db import SessionLocal

from models import (
    Feedback,
    FeatureRequest,
    Theme,
    PRDDocument,
    RoadmapItem,
    SupportTicket
)


class RetrievalTools:

    def __init__(self):
        self.db = SessionLocal()

    # =====================================================
    # FEEDBACK SEARCH
    # =====================================================

    def search_feedback(self, keyword: str):
        return self.db.query(Feedback).filter(
            Feedback.feedback_text.ilike(f"%{keyword}%")
        ).all()

    # =====================================================
    # FEATURE REQUEST SEARCH
    # =====================================================

    def search_feature_requests(self, keyword: str):
        return self.db.query(FeatureRequest).filter(
            or_(
                FeatureRequest.title.ilike(f"%{keyword}%"),
                FeatureRequest.description.ilike(f"%{keyword}%")
            )
        ).all()

    # =====================================================
    # SUPPORT TICKET SEARCH
    # =====================================================

    def search_support_tickets(self, keyword: str):
        return self.db.query(SupportTicket).filter(
            or_(
                SupportTicket.title.ilike(f"%{keyword}%"),
                SupportTicket.description.ilike(f"%{keyword}%")
            )
        ).all()

    # =====================================================
    # THEME SEARCH
    # =====================================================

    def search_themes(self, keyword: str):
        return self.db.query(Theme).filter(
            Theme.theme_label.ilike(f"%{keyword}%")
        ).all()

    # =====================================================
    # PRD SEARCH
    # =====================================================

    def search_prds(self, keyword: str):
        return self.db.query(PRDDocument).filter(
            or_(
                PRDDocument.title.ilike(f"%{keyword}%"),
                PRDDocument.problem_statement.ilike(f"%{keyword}%")
            )
        ).all()

    # =====================================================
    # ROADMAP SEARCH
    # =====================================================

    def search_roadmap(self, keyword: str):
        return self.db.query(RoadmapItem).filter(
            RoadmapItem.phase.ilike(f"%{keyword}%")
        ).all()

    # =====================================================
    # FILTERS
    # =====================================================

    def get_open_tickets(self):
        return self.db.query(SupportTicket).filter(
            SupportTicket.status == "Open"
        ).all()

    def get_high_priority_features(self):
        return self.db.query(FeatureRequest).filter(
            FeatureRequest.votes >= 100
        ).all()

    def get_feedback_by_source(self, source: str):
        return self.db.query(Feedback).filter(
            Feedback.source == source
        ).all()

    # =====================================================
    # CLOSE CONNECTION
    # =====================================================

    def close(self):
        self.db.close()