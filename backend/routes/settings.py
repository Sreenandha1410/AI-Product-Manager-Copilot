# backend/routes/settings.py

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from db import SessionLocal
from models import User

router = APIRouter(prefix="/settings", tags=["Settings"])


class UpdateProfileRequest(BaseModel):
    user_id: str    # UUID string — NOT int
    name:    str
    email:   str


def _serialize(user: User) -> dict:
    return {
        "user_id":  user.user_id,
        "name":     user.name,
        "email":    user.email,
        "role":     user.role,
        "initials": "".join(w[0] for w in user.name.split()).upper()[:2]
                    if user.name else "U",
    }


# ── GET profile ───────────────────────────────────────────────
@router.get("/{user_id}")
def get_profile(user_id: str):
    db: Session = SessionLocal()
    try:
        user = db.query(User).filter(User.user_id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found.")
        return _serialize(user)
    finally:
        db.close()


# ── PUT update profile ────────────────────────────────────────
@router.put("/")
def update_profile(data: UpdateProfileRequest):
    db: Session = SessionLocal()
    try:
        user = db.query(User).filter(User.user_id == data.user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found.")
        user.name  = data.name
        user.email = data.email
        db.commit()
        db.refresh(user)
        return _serialize(user)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()


# ── DELETE account ────────────────────────────────────────────
@router.delete("/{user_id}")
def delete_account(user_id: str):
    db: Session = SessionLocal()
    try:
        user = db.query(User).filter(User.user_id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found.")
        db.delete(user)
        db.commit()
        return {"message": "Account deleted successfully."}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()
