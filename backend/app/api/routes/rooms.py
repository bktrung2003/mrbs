import uuid
from typing import Any

from fastapi import APIRouter, HTTPException
from sqlmodel import col, func, select

from app.api.deps import CurrentUser, SessionDep
from app.models import (
    Area,
    Message,
    Room,
    RoomCreate,
    RoomPublic,
    RoomsPublic,
    RoomUpdate,
)

router = APIRouter(prefix="/rooms", tags=["rooms"])


@router.get("/", response_model=RoomsPublic)
def read_rooms(
    session: SessionDep,
    current_user: CurrentUser,
    area_id: uuid.UUID | None = None,
    skip: int = 0,
    limit: int = 100,
) -> Any:
    del current_user
    statement = select(Room)
    count_statement = select(func.count()).select_from(Room)
    if area_id:
        statement = statement.where(Room.area_id == area_id)
        count_statement = count_statement.where(Room.area_id == area_id)
    count = session.exec(count_statement).one()
    rooms = session.exec(
        statement.order_by(col(Room.sort_order), col(Room.name))
        .offset(skip)
        .limit(limit)
    ).all()
    return RoomsPublic(
        data=[RoomPublic.model_validate(room) for room in rooms], count=count
    )


@router.get("/{room_id}", response_model=RoomPublic)
def read_room(
    session: SessionDep, current_user: CurrentUser, room_id: uuid.UUID
) -> Any:
    del current_user
    room = session.get(Room, room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    return room


@router.post("/", response_model=RoomPublic)
def create_room(
    *, session: SessionDep, current_user: CurrentUser, room_in: RoomCreate
) -> Any:
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    if not session.get(Area, room_in.area_id):
        raise HTTPException(status_code=404, detail="Area not found")
    room = Room.model_validate(room_in)
    session.add(room)
    session.commit()
    session.refresh(room)
    return room


@router.put("/{room_id}", response_model=RoomPublic)
def update_room(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    room_id: uuid.UUID,
    room_in: RoomUpdate,
) -> Any:
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    room = session.get(Room, room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    if room_in.area_id and not session.get(Area, room_in.area_id):
        raise HTTPException(status_code=404, detail="Area not found")
    room.sqlmodel_update(room_in.model_dump(exclude_unset=True))
    session.add(room)
    session.commit()
    session.refresh(room)
    return room


@router.delete("/{room_id}")
def delete_room(
    session: SessionDep, current_user: CurrentUser, room_id: uuid.UUID
) -> Message:
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    room = session.get(Room, room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    session.delete(room)
    session.commit()
    return Message(message="Room deleted successfully")
