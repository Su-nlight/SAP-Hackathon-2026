from __future__ import annotations

from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from ...auth.security import create_access_token
from ...auth.service import AuthService
from ..deps import get_auth_service, get_current_identity

router = APIRouter(prefix="/v1/auth", tags=["auth"])


class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    company_id: str
    auth_source: str


@router.post("/login", response_model=LoginResponse)
def login(req: LoginRequest, auth_svc: AuthService = Depends(get_auth_service)):
    user = auth_svc.authenticate(req.username, req.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )
    token = create_access_token(
        data={
            "sub": user.username,
            "company_id": user.company_id,
            "roles": user.roles,
            "auth_source": user.auth_source,
        }
    )
    return LoginResponse(
        access_token=token,
        company_id=user.company_id,
        auth_source=user.auth_source,
    )


@router.get("/me")
def me(identity: dict[str, Any] = Depends(get_current_identity)):
    return {
        "username": identity.get("sub"),
        "company_id": identity.get("company_id"),
        "roles": identity.get("roles", []),
        "auth_source": identity.get("auth_source", "mock"),
    }