from fastapi import APIRouter, Depends, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_staff
from app.core.config import settings
from app.db.session import get_session
from app.schemas.auth import StaffLoginIn, StaffLoginOut, StaffMeOut
from app.services.auth import authenticate_staff, issue_staff_access_token, staff_to_me
from app.services.principal import StaffPrincipal
from app.services.rbac import ROLE_DEFAULT_DASHBOARD, capabilities_for

router = APIRouter()


@router.post("/login", response_model=StaffLoginOut)
async def login(
    payload: StaffLoginIn,
    response: Response,
    session: AsyncSession = Depends(get_session),
) -> StaffLoginOut:
    staff = await authenticate_staff(session, payload.email, payload.password)
    access_token = issue_staff_access_token(staff)
    response.set_cookie(
        "fh_staff_access",
        access_token,
        httponly=True,
        max_age=settings.access_token_minutes * 60,
        path="/",
        samesite="lax",
        secure=settings.public_app_url.startswith("https"),
    )
    return StaffLoginOut(staff=staff_to_me(staff))


@router.post("/logout")
async def logout(response: Response) -> dict[str, str]:
    response.delete_cookie("fh_staff_access", path="/")
    return {"status": "signed_out"}


@router.get("/me", response_model=StaffMeOut)
async def me(staff: StaffPrincipal = Depends(get_current_staff)) -> StaffMeOut:
    return StaffMeOut(
        capabilities=capabilities_for(staff.role),
        default_dashboard=ROLE_DEFAULT_DASHBOARD[staff.role],
        email=staff.email,
        id=str(staff.id),
        name=staff.name,
        role=staff.role.value,
    )
