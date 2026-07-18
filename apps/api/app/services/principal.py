from dataclasses import dataclass
from uuid import UUID

from app.db.models import StaffRoleCode


@dataclass(frozen=True)
class StaffPrincipal:
    id: UUID
    business_id: UUID
    email: str
    name: str
    role: StaffRoleCode
