from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
import uuid

from db import SessionLocal
from models import User

router = APIRouter(
    prefix="",
    tags=["Authentication"]
)


# -----------------------------
# Request Models
# -----------------------------

class SignupRequest(BaseModel):
    name: str
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


class ForgotPasswordRequest(BaseModel):
    email: str


class ResetPasswordRequest(BaseModel):
    password: str


# -----------------------------
# Signup
# -----------------------------

@router.post("/signup")
def signup(data: SignupRequest):

    db: Session = SessionLocal()

    try:
        # Check if email already exists
        existing = db.query(User).filter(User.email == data.email).first()

        if existing:
            raise HTTPException(
                status_code=400,
                detail="Email already exists."
            )

        initials = "".join(word[0] for word in data.name.split()).upper()

        user = User(
            user_id=str(uuid.uuid4()),
            name=data.name,
            email=data.email,
            password=data.password,   # Temporary (Plain Text)
            role="Product Manager"
        )

        db.add(user)
        db.commit()
        db.refresh(user)

        return {
            "user_id": user.user_id,
            "name": user.name,
            "email": user.email,
            "role": user.role,
            "initials": initials
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

    finally:
        db.close()


# -----------------------------
# Login
# -----------------------------

@router.post("/login")
def login(data: LoginRequest):

    db: Session = SessionLocal()

    try:
        user = db.query(User).filter(
            User.email == data.email
        ).first()

        if user is None:
            raise HTTPException(
                status_code=404,
                detail="User not found."
            )

        # Temporary password check
        if user.password != data.password:
            raise HTTPException(
                status_code=401,
                detail="Invalid password."
            )

        initials = "".join(word[0] for word in user.name.split()).upper()

        return {
            "user_id": user.user_id,
            "name": user.name,
            "email": user.email,
            "role": user.role,
            "initials": initials
        }

    finally:
        db.close()


# -----------------------------
# Forgot Password
# -----------------------------

@router.post("/forgot-password")
def forgot_password(data: ForgotPasswordRequest):

    db: Session = SessionLocal()

    try:
        user = db.query(User).filter(
            User.email == data.email
        ).first()

        if user is None:
            raise HTTPException(
                status_code=404,
                detail="Email not found."
            )

        return {
            "message": f"Password reset link sent to {data.email}"
        }

    finally:
        db.close()


# -----------------------------
# Reset Password
# -----------------------------

@router.post("/reset-password")
def reset_password(data: ResetPasswordRequest):

    return {
        "message": "Password reset successful."
    }