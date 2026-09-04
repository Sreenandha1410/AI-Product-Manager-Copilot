# backend/routes/chat.py

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from db import SessionLocal
from models import ChatHistory
from agents.chat_agent import ChatAgent


# ============================================================
# ROUTER
# ============================================================

router = APIRouter(
    prefix="/chat",
    tags=["AI Chat"]
)


# Create one ChatAgent instance
chat_agent = ChatAgent()


# ============================================================
# REQUEST MODEL
# ============================================================

class ChatRequest(BaseModel):
    message: str
    workspace_id: str = "default"


# ============================================================
# POST /chat/
# ============================================================

@router.post("/")
def chat(data: ChatRequest):

    # Validate message
    message = data.message.strip()

    if not message:
        raise HTTPException(
            status_code=400,
            detail="Message cannot be empty."
        )

    db: Session = SessionLocal()

    try:

        # ----------------------------------------------------
        # 1. SAVE USER MESSAGE
        # ----------------------------------------------------

        user_message = ChatHistory(
            workspace_id=data.workspace_id,
            role="user",
            message=message,
        )

        db.add(user_message)
        db.commit()
        db.refresh(user_message)


        # ----------------------------------------------------
        # 2. GET RECENT CONVERSATION HISTORY
        # ----------------------------------------------------

        recent_history = (
            db.query(ChatHistory)
            .filter(
                ChatHistory.workspace_id == data.workspace_id
            )
            .order_by(
                ChatHistory.timestamp.desc()
            )
            .limit(10)
            .all()
        )

        # Reverse so the oldest message comes first
        # This gives the LLM a natural conversation order.
        history = list(reversed(recent_history))


        # ----------------------------------------------------
        # 3. GENERATE AI RESPONSE
        # ----------------------------------------------------

        ai_message = chat_agent.generate_response(
            db=db,
            message=message,
            history=history,
        )


        # Make sure response is a string
        if ai_message is None:
            ai_message = (
                "I couldn't generate a response right now. "
                "Please try again."
            )

        ai_message = str(ai_message).strip()


        # ----------------------------------------------------
        # 4. SAVE AI RESPONSE
        # ----------------------------------------------------

        assistant_message = ChatHistory(
            workspace_id=data.workspace_id,
            role="assistant",
            message=ai_message,
        )

        db.add(assistant_message)
        db.commit()
        db.refresh(assistant_message)


        # ----------------------------------------------------
        # 5. RETURN RESPONSE
        # ----------------------------------------------------

        return {
            "response": ai_message,
            "role": "assistant",
            "workspace_id": data.workspace_id,
        }


    except HTTPException:
        db.rollback()
        raise


    except Exception as exc:

        db.rollback()

        print("Chat error:", repr(exc))

        raise HTTPException(
            status_code=500,
            detail="Sorry, I couldn't process your request right now."
        )


    finally:

        db.close()


# ============================================================
# GET /chat/history
# ============================================================

@router.get("/history")
def get_chat_history(
    workspace_id: str = "default",
    limit: int = 50,
):

    # Prevent unreasonable values
    limit = max(1, min(limit, 100))

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


    except Exception as exc:

        print("Get chat history error:", repr(exc))

        raise HTTPException(
            status_code=500,
            detail="Failed to load chat history."
        )


    finally:

        db.close()


# ============================================================
# DELETE /chat/history
# ============================================================

@router.delete("/history")
def clear_chat_history(
    workspace_id: str = "default",
):

    db: Session = SessionLocal()

    try:

        deleted_count = (
            db.query(ChatHistory)
            .filter(
                ChatHistory.workspace_id == workspace_id
            )
            .delete(
                synchronize_session=False
            )
        )

        db.commit()


        return {
            "message": "Chat history cleared.",
            "deleted_count": deleted_count,
        }


    except Exception as exc:

        db.rollback()

        print(
            "Clear chat history error:",
            repr(exc)
        )

        raise HTTPException(
            status_code=500,
            detail="Failed to clear chat history."
        )


    finally:

        db.close()