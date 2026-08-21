# backend/tools/db_tools.py

from sqlalchemy.orm import Session
from db import SessionLocal

from models import (
    User,
    Feedback,
    FeatureRequest,
    SupportTicket,
    Analytics,
    Theme,
    FeatureCluster,
    PriorityScore,
    PRDDocument,
    RoadmapItem,
    ChatHistory
)


class DBTools:

    def __init__(self):
        self.db: Session = SessionLocal()

    # =====================================================
    # USERS
    # =====================================================

    def get_users(self):
        return self.db.query(User).all()

    def get_user(self, user_id):
        return self.db.query(User).filter(
            User.user_id == user_id
        ).first()

    # =====================================================
    # FEEDBACK
    # =====================================================

    def get_feedback(self):
        return self.db.query(Feedback).all()

    def get_feedback_by_user(self, user_id):
        return self.db.query(Feedback).filter(
            Feedback.user_id == user_id
        ).all()

    # =====================================================
    # FEATURE REQUESTS
    # =====================================================

    def get_feature_requests(self):
        return self.db.query(FeatureRequest).all()

    def get_feature_request(self, feature_id):
        return self.db.query(FeatureRequest).filter(
            FeatureRequest.id == feature_id
        ).first()

    # =====================================================
    # SUPPORT TICKETS
    # =====================================================

    def get_support_tickets(self):
        return self.db.query(SupportTicket).all()

    # =====================================================
    # ANALYTICS
    # =====================================================

    def get_analytics(self):
        return self.db.query(Analytics).all()

    # =====================================================
    # THEMES
    # =====================================================

    def get_themes(self):
        return self.db.query(Theme).all()

    def save_theme(self, theme):
        self.db.add(theme)
        self.db.commit()
        self.db.refresh(theme)
        return theme

    # =====================================================
    # FEATURE CLUSTERS
    # =====================================================

    def get_feature_clusters(self):
        return self.db.query(FeatureCluster).all()

    def save_cluster(self, cluster):
        self.db.add(cluster)
        self.db.commit()
        self.db.refresh(cluster)
        return cluster

    # =====================================================
    # PRIORITY SCORES
    # =====================================================

    def get_priority_scores(self):
        return self.db.query(PriorityScore).all()

    def save_priority_score(self, score):
        self.db.add(score)
        self.db.commit()
        self.db.refresh(score)
        return score

    # =====================================================
    # PRD DOCUMENTS
    # =====================================================

    def get_prds(self):
        return self.db.query(PRDDocument).all()

    def save_prd(self, prd):
        self.db.add(prd)
        self.db.commit()
        self.db.refresh(prd)
        return prd

    # =====================================================
    # ROADMAP
    # =====================================================

    def get_roadmap(self):
        return self.db.query(RoadmapItem).all()

    def save_roadmap(self, roadmap):
        self.db.add(roadmap)
        self.db.commit()
        self.db.refresh(roadmap)
        return roadmap

    # =====================================================
    # CHAT HISTORY
    # =====================================================

    def get_chat_history(self):
        return self.db.query(ChatHistory).all()

    def save_chat(self, chat):
        self.db.add(chat)
        self.db.commit()
        self.db.refresh(chat)
        return chat

    # =====================================================
    # UPDATE METHODS
    # =====================================================

    def update_priority(self, priority):
        self.db.merge(priority)
        self.db.commit()

    def update_prd(self, prd):
        self.db.merge(prd)
        self.db.commit()

    def update_roadmap(self, roadmap):
        self.db.merge(roadmap)
        self.db.commit()

    # =====================================================
    # DELETE METHODS
    # =====================================================

    def delete_theme(self, theme_id):
        theme = self.db.query(Theme).filter(
            Theme.id == theme_id
        ).first()

        if theme:
            self.db.delete(theme)
            self.db.commit()

    def delete_chat(self, chat_id):
        chat = self.db.query(ChatHistory).filter(
            ChatHistory.id == chat_id
        ).first()

        if chat:
            self.db.delete(chat)
            self.db.commit()

    # =====================================================
    # CLOSE CONNECTION
    # =====================================================

    def close(self):
        self.db.close()