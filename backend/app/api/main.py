from fastapi import APIRouter

from app.api.routes import (
    areas,
    bookings,
    branding,
    items,
    login,
    private,
    public_events,
    public_schedule,
    rooms,
    users,
    utils,
)
from app.core.config import settings

api_router = APIRouter()
api_router.include_router(login.router)
api_router.include_router(users.router)
api_router.include_router(utils.router)
api_router.include_router(items.router)
api_router.include_router(areas.router)
api_router.include_router(rooms.router)
api_router.include_router(bookings.router)
api_router.include_router(branding.router)
api_router.include_router(public_events.router)
api_router.include_router(public_schedule.router)


if settings.ENVIRONMENT == "local":
    api_router.include_router(private.router)
