from pathlib import Path
from typing import Any
from uuid import uuid4

from fastapi import APIRouter, File, HTTPException, Query, UploadFile
from sqlmodel import select

from app.api.deps import CurrentUser, SessionDep
from app.models import BrandingSettings, BrandingSettingsPublic, BrandingSettingsUpdate

router = APIRouter(prefix="/branding", tags=["branding"])

BRANDING_UPLOAD_DIR = (
    Path(__file__).resolve().parents[4]
    / "frontend"
    / "public"
    / "assets"
    / "branding"
)

ALLOWED_TYPES = {"image/png", "image/jpeg", "image/webp", "image/svg+xml"}


def _get_or_create(session: SessionDep) -> BrandingSettings:
    settings = session.get(BrandingSettings, 1)
    if not settings:
        settings = BrandingSettings(id=1)
        session.add(settings)
        session.commit()
        session.refresh(settings)
    return settings


@router.get("/", response_model=BrandingSettingsPublic)
def read_branding(session: SessionDep) -> Any:
    return _get_or_create(session)


@router.patch("/", response_model=BrandingSettingsPublic)
def update_branding(
    session: SessionDep,
    current_user: CurrentUser,
    body: BrandingSettingsUpdate,
) -> Any:
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    settings = _get_or_create(session)
    settings.sqlmodel_update(body.model_dump(exclude_unset=True))
    session.add(settings)
    session.commit()
    session.refresh(settings)
    return settings


@router.post("/upload-logo", response_model=BrandingSettingsPublic)
async def upload_logo(
    session: SessionDep,
    current_user: CurrentUser,
    variant: str = Query(...),
    file: UploadFile = File(...),
) -> Any:
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    if variant not in ("color", "white"):
        raise HTTPException(status_code=400, detail="variant must be color or white")

    content_type = file.content_type or ""
    if content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail="Unsupported image type")

    ext = {
        "image/png": ".png",
        "image/jpeg": ".jpg",
        "image/webp": ".webp",
        "image/svg+xml": ".svg",
    }[content_type]

    BRANDING_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    filename = f"logo-{variant}-{uuid4().hex}{ext}"
    dest = BRANDING_UPLOAD_DIR / filename
    data = await file.read()
    dest.write_bytes(data)

    public_url = f"/assets/branding/{filename}"
    settings = _get_or_create(session)
    if variant == "color":
        settings.logo_color_url = public_url
    else:
        settings.logo_white_url = public_url
    session.add(settings)
    session.commit()
    session.refresh(settings)
    return settings
