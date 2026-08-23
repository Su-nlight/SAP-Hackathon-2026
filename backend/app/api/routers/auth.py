"""Authentication: login against SAP (real) or mock users, issue a JWT."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from ..deps import get_auth_service
from ...auth.security import create_access_token
from ...auth.service import AuthService

router = APIRouter(prefix="/v1/auth", tags=["auth"])


class LoginIn(BaseModel):
    username: str
    password: str


@router.post("/login")
async def login(body: LoginIn, auth: AuthService = Depends(get_auth_service)):
    identity = auth.authenticate(body.username, body.password)
    if identity is None:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token({
        "sub": identity.username,
        "company_id": identity.company_id,
        "roles": identity.roles,
        "auth_source": identity.auth_source,
    })
    return {
        "access_token": token,
        "token_type": "bearer",
        "company_id": identity.company_id,
        "auth_source": identity.auth_source,  # tells the caller whether SAP or mock validated them
    }


@router.get("/me")
async def me(identity=Depends(__import__("app.api.deps", fromlist=["get_current_identity"]).get_current_identity)):
    return {"username": identity.username, "company_id": identity.company_id, "roles": identity.roles, "auth_source": identity.auth_source}