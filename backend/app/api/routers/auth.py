from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from ...auth.security import create_access_token
from ...auth.service import AuthService, User
from ..deps import get_auth_service, get_current_user

router = APIRouter(prefix="/v1/auth", tags=["auth"])


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


@router.post("/login", response_model=TokenResponse)
async def login(
    body: LoginRequest,
    auth: AuthService = Depends(get_auth_service),
):
    u = auth.authenticate(body.username, body.password)
    if not u:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = create_access_token(
        {
            "sub": u.username,
            "company_id": u.company_id,
            "roles": u.roles,
        }
    )
    return TokenResponse(access_token=token)


@router.get("/me", response_model=User)
async def me(u: User = Depends(get_current_user)):
    return u