# backend/routes/chat.py

from fastapi import APIRouter
from pydantic import BaseModel
from sqlalchemy.orm import Session

from db import SessionLocal
from models import (
    ChatHistory,
    Feedback,
    Theme,
    FeatureRequest,
    PRDDocument,
)
from agents.chat_agent import ChatAgent


router = APIRouter(
    prefix="/chat",
    tags=["AI Chat"]
)


chat_agent = ChatAgent()


# --------------------------------------------------
# Request Model
# --------------------------------------------------

class ChatRequest(BaseModel):
    message: str
    workspace_id: str = "default"


# --------------------------------------------------
# POST /chat/
# --------------------------------------------------

@router.post("/")
def chat(data: ChatRequest):

    db: Session = SessionLocal()

    try:

        # ------------------------------------------
        # Save user message
        # ------------------------------------------

        user_message = ChatHistory(
            workspace_id=data.workspace_id,
            role="user",
            message=data.message,
        )

        db.add(user_message)
        db.commit()

        # ------------------------------------------
        # Get recent conversation history
        # ------------------------------------------

        history = (
            db.query(ChatHistory)
            .filter(
                ChatHistory.workspace_id == data.workspace_id
            )
            .order_by(
                ChatHistory.timestamp.asc()
            )
            .limit(10)
            .all()
        )

        # ------------------------------------------
        # Generate AI response
        # ------------------------------------------

        ai_message = chat_agent.generate_response(
            db=db,
            message=data.message,
            history=history,
        )

        # ------------------------------------------
        # Save AI response
        # ------------------------------------------

        assistant_message = ChatHistory(
            workspace_id=data.workspace_id,
            role="assistant",
            message=ai_message,
        )

        db.add(assistant_message)
        db.commit()

        # ------------------------------------------
        # Return response
        # ------------------------------------------

        return {
            "response": ai_message
        }

    except Exception as exc:

        db.rollback()

        print("Chat error:", exc)

        return {
            "response": (
                "Sorry, I couldn't process your request "
                "right now. Please try again."
            )
        }

    finally:
        db.close()


# --------------------------------------------------
# GET /chat/history
# --------------------------------------------------

@router.get("/history")
def get_chat_history(
    workspace_id: str = "default",
    limit: int = 50,
):

    db: Session = SessionLocal()

    try:

        history = (
            db.query(ChatHistory)
            .filter(
                ChatHistory.workspace_id == workspace_id
            )
            .order_by(
                ChatHistory.timestamp.asc()
            )
            .limit(limit)
            .all()
        )

        return [
            {
                "id": item.id,
                "role": item.role,
                "message": item.message,
                "timestamp": (
                    str(item.timestamp)
                    if item.timestamp
                    else ""
                ),
            }
            for item in history
        ]

    finally:
        db.close()


# --------------------------------------------------
# DELETE /chat/history
# --------------------------------------------------

@router.delete("/history")
def clear_chat_history(
    workspace_id: str = "default",
):

    db: Session = SessionLocal()

    try:

        db.query(ChatHistory).filter(
            ChatHistory.workspace_id == workspace_id
        ).delete(
            synchronize_session=False
        )

        db.commit()

        return {
            "message": "Chat history cleared."
        }

    except Exception as exc:

        db.rollback()

        print("Clear history error:", exc)

        return {
            "message": "Failed to clear chat history."
        }

    finally:
        db.close()