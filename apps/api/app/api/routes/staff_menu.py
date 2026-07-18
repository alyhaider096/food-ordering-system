from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_staff
from app.db.session import get_session
from app.schemas.menu import PublicMenuOut
from app.services.menu import get_public_menu
from app.services.principal import StaffPrincipal
from app.services.rbac import assert_can

router = APIRouter()


@router.get("", response_model=PublicMenuOut)
async def staff_menu(
    session: AsyncSession = Depends(get_session),
    staff: StaffPrincipal = Depends(get_current_staff),
) -> PublicMenuOut:
    assert_can(staff.role, "menu:edit")
    return await get_public_menu(session)
