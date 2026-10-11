"""Auth endpoints — login / token."""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from core.database import get_db, FacultyUser
from core.auth import verify_password, create_token, hash_password, get_current_user
from pydantic import BaseModel

router = APIRouter(prefix="/api/auth", tags=["auth"])


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    username: str
    full_name: str
    is_admin: bool


class ChangePasswordIn(BaseModel):
    old_password: str
    new_password: str


@router.post("/token", response_model=TokenOut)
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(FacultyUser).filter(FacultyUser.username == form.username).first()
    if not user or not verify_password(form.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    token = create_token({"sub": user.username})
    return TokenOut(
        access_token=token,
        username=user.username,
        full_name=user.full_name,
        is_admin=user.is_admin,
    )


@router.get("/me")
def me(user: FacultyUser = Depends(get_current_user)):
    return {"username": user.username, "full_name": user.full_name, "is_admin": user.is_admin}


@router.post("/change-password")
def change_password(
    body: ChangePasswordIn,
    db: Session = Depends(get_db),
    user: FacultyUser = Depends(get_current_user),
):
    if not verify_password(body.old_password, user.hashed_password):
        raise HTTPException(400, "Old password incorrect")
    user.hashed_password = hash_password(body.new_password)
    db.commit()
    return {"message": "Password updated"}
