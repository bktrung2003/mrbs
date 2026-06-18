import os
import re
from pathlib import Path
from typing import Any
from uuid import uuid4

from fastapi import APIRouter, File, HTTPException, Query, UploadFile
from fastapi.responses import FileResponse

from app.api.deps import CurrentUser, SessionDep
from app.models import BrandingSettings, BrandingSettingsPublic, BrandingSettingsUpdate

router = APIRouter(prefix="/branding", tags=["branding"])

ALLOWED_TYPES = {"image/png", "image/jpeg", "image/webp", "image/svg+xml"}
FILENAME_RE = re.compile(r"^logo-(color|white)-[a-f0-9]+\.(png|jpg|jpeg|webp|svg)$")

DEFAULT_COLOR_LOGO = "/assets/images/fusion-logo-color.png"
DEFAULT_WHITE_LOGO = "/assets/images/fusion-logo-white.png"

MEDIA_TYPES = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".svg": "image/svg+xml",
}


def get_branding_upload_dir() -> Path:
    configured = os.environ.get("BRANDING_UPLOAD_DIR")
    if configured:
        return Path(configured)
    return (
        Path(__file__).resolve().parents[4]
        / "frontend"
        / "public"
        / "assets"
        / "branding"
    )


BRANDING_UPLOAD_DIR = get_branding_upload_dir()


def branding_file_url(filename: str) -> str:
    return f"/api/v1/branding/files/{filename}"


def _filename_from_logo_url(url: str) -> str | None:
    clean = url.split("?", 1)[0]
    if "/api/v1/branding/files/" in clean:
        filename = clean.rsplit("/", 1)[-1]
    elif "/assets/branding/" in clean:
        filename = clean.rsplit("/", 1)[-1]
    else:
        return None
    return filename if FILENAME_RE.match(filename) else None


def resolve_logo_url(url: str, default: str) -> str:
    filename = _filename_from_logo_url(url)
    if not filename:
        return url or default
    path = BRANDING_UPLOAD_DIR / filename
    if not path.is_file():
        return default
    return branding_file_url(filename)


def to_public_branding(settings: BrandingSettings) -> BrandingSettingsPublic:
    return BrandingSettingsPublic(
        id=settings.id,
        company_name=settings.company_name,
        system_name=settings.system_name,
        logo_color_url=resolve_logo_url(
            settings.logo_color_url, DEFAULT_COLOR_LOGO
        ),
        logo_white_url=resolve_logo_url(
            settings.logo_white_url, DEFAULT_WHITE_LOGO
        ),
        header_color=settings.header_color,
    )


def _get_or_create(session: SessionDep) -> BrandingSettings:
    settings = session.get(BrandingSettings, 1)
    if not settings:
        settings = BrandingSettings(id=1)
        session.add(settings)
        session.commit()
        session.refresh(settings)
    return settings


@router.get("/files/{filename}")
def read_branding_file(filename: str) -> FileResponse:
    if not FILENAME_RE.match(filename):
        raise HTTPException(status_code=400, detail="Invalid filename")
    path = BRANDING_UPLOAD_DIR / filename
    if not path.is_file():
        raise HTTPException(status_code=404, detail="Logo file not found")
    ext = path.suffix.lower()
    return FileResponse(
        path,
        media_type=MEDIA_TYPES.get(ext, "application/octet-stream"),
        headers={"Cache-Control": "public, max-age=86400"},
    )


@router.get("/", response_model=BrandingSettingsPublic)
def read_branding(session: SessionDep) -> Any:
    return to_public_branding(_get_or_create(session))


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
    return to_public_branding(settings)


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
    if not data:
        raise HTTPException(status_code=400, detail="Empty file")
    dest.write_bytes(data)
    if not dest.is_file():
        raise HTTPException(status_code=500, detail="Could not save logo file")

    public_url = branding_file_url(filename)
    settings = _get_or_create(session)
    if variant == "color":
        settings.logo_color_url = public_url
    else:
        settings.logo_white_url = public_url
    session.add(settings)
    session.commit()
    session.refresh(settings)
    return to_public_branding(settings)
