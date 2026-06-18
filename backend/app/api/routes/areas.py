import uuid
from typing import Any

from fastapi import APIRouter, HTTPException
from sqlmodel import col, func, select

from app.api.deps import CurrentUser, SessionDep
from app.models import Area, AreaCreate, AreaPublic, AreasPublic, AreaUpdate, Message

router = APIRouter(prefix="/areas", tags=["areas"])


@router.get("/", response_model=AreasPublic)
def read_areas(
    session: SessionDep, current_user: CurrentUser, skip: int = 0, limit: int = 100
) -> Any:
    del current_user
    count = session.exec(select(func.count()).select_from(Area)).one()
    areas = session.exec(
        select(Area).order_by(col(Area.name)).offset(skip).limit(limit)
    ).all()
    return AreasPublic(
        data=[AreaPublic.model_validate(area) for area in areas], count=count
    )


@router.get("/{area_id}", response_model=AreaPublic)
def read_area(
    session: SessionDep, current_user: CurrentUser, area_id: uuid.UUID
) -> Any:
    del current_user
    area = session.get(Area, area_id)
    if not area:
        raise HTTPException(status_code=404, detail="Area not found")
    return area


@router.post("/", response_model=AreaPublic)
def create_area(
    *, session: SessionDep, current_user: CurrentUser, area_in: AreaCreate
) -> Any:
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    area = Area.model_validate(area_in)
    session.add(area)
    session.commit()
    session.refresh(area)
    return area


@router.put("/{area_id}", response_model=AreaPublic)
def update_area(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    area_id: uuid.UUID,
    area_in: AreaUpdate,
) -> Any:
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    area = session.get(Area, area_id)
    if not area:
        raise HTTPException(status_code=404, detail="Area not found")
    area.sqlmodel_update(area_in.model_dump(exclude_unset=True))
    session.add(area)
    session.commit()
    session.refresh(area)
    return area


@router.delete("/{area_id}")
def delete_area(
    session: SessionDep, current_user: CurrentUser, area_id: uuid.UUID
) -> Message:
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    area = session.get(Area, area_id)
    if not area:
        raise HTTPException(status_code=404, detail="Area not found")
    session.delete(area)
    session.commit()
    return Message(message="Area deleted successfully")
