from fastapi import HTTPException, status

from app.db.models import StaffRoleCode

Capability = str

ROLE_CAPABILITIES: dict[StaffRoleCode, set[Capability]] = {
    StaffRoleCode.OWNER: {
        "orders:view",
        "orders:update",
        "orders:cancel",
        "menu:edit",
        "reports:view",
        "staff:manage",
        "settings:edit",
        "audit:view",
        "riders:assign",
        "payments:record",
    },
    StaffRoleCode.SYSTEM_ADMIN: {
        "orders:view",
        "orders:update",
        "orders:cancel",
        "menu:edit",
        "reports:view",
        "staff:manage",
        "settings:edit",
        "audit:view",
        "riders:assign",
        "payments:record",
    },
    StaffRoleCode.MANAGER: {
        "orders:view",
        "orders:update",
        "orders:cancel",
        "menu:edit",
        "reports:view",
        "settings:edit",
        "riders:assign",
        "payments:record",
    },
    StaffRoleCode.CASHIER: {"orders:view", "orders:update", "riders:assign", "payments:record"},
    StaffRoleCode.KITCHEN: {"orders:view", "orders:update"},
    StaffRoleCode.RIDER: {"orders:view", "orders:update"},
    StaffRoleCode.MENU_EDITOR: {"menu:edit"},
    StaffRoleCode.SUPPORT: {"orders:view"},
}


ROLE_DEFAULT_DASHBOARD: dict[StaffRoleCode, str] = {
    StaffRoleCode.OWNER: "/staff/dashboard",
    StaffRoleCode.SYSTEM_ADMIN: "/staff/dashboard",
    StaffRoleCode.MANAGER: "/staff/dashboard",
    StaffRoleCode.CASHIER: "/staff/orders",
    StaffRoleCode.KITCHEN: "/staff/kitchen",
    StaffRoleCode.RIDER: "/staff/rider",
    StaffRoleCode.MENU_EDITOR: "/staff/menu",
    StaffRoleCode.SUPPORT: "/staff/orders",
}


def can(role: StaffRoleCode, capability: Capability) -> bool:
    return capability in ROLE_CAPABILITIES.get(role, set())


def capabilities_for(role: StaffRoleCode) -> list[str]:
    return sorted(ROLE_CAPABILITIES.get(role, set()))


def assert_can(role: StaffRoleCode, capability: Capability) -> None:
    if not can(role, capability):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission for this action.",
        )
