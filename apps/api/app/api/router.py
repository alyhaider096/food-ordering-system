from fastapi import APIRouter

from app.api.routes import public, staff_auth, staff_menu, staff_orders

api_router = APIRouter()
api_router.include_router(public.router, prefix="/public", tags=["public"])
api_router.include_router(staff_auth.router, prefix="/staff/auth", tags=["staff-auth"])
api_router.include_router(staff_orders.router, prefix="/staff/orders", tags=["staff-orders"])
api_router.include_router(staff_menu.router, prefix="/staff/menu", tags=["staff-menu"])
