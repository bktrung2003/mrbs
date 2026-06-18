import uuid
from datetime import date
from typing import Any

from fastapi import APIRouter
from sqlmodel import col, func, select

from app.api.deps import SessionDep
from app.core.timezone_util import day_bounds
from app.models import (
    ApprovalStatus,
    Area,
    Booking,
    BookingStatus,
    Room,
    ScheduleBookingPublic,
    ScheduleBookingsPublic,
    ScheduleRoomPublic,
    ScheduleRoomsPublic,
)

router = APIRouter(prefix="/public/schedule", tags=["public"])


def _to_schedule_booking(
    booking: Booking, session: SessionDep
) -> ScheduleBookingPublic:
    room = session.get(Room, booking.room_id)
    area = session.get(Area, room.area_id) if room else None
    return ScheduleBookingPublic(
        id=booking.id,
        room_id=booking.room_id,
        title=booking.title,
        start_time=booking.start_time,
        end_time=booking.end_time,
        booking_type=booking.booking_type,
        confirmation_status=booking.confirmation_status,
        is_all_day=booking.is_all_day,
        approval_status=booking.approval_status,
        room_name=room.name if room else None,
        area_name=area.name if area else None,
    )


@router.get("/rooms", response_model=ScheduleRoomsPublic)
def read_public_rooms(
    session: SessionDep,
    skip: int = 0,
    limit: int = 200,
) -> Any:
    statement = select(Room).where(Room.is_active.is_(True))
    count_statement = (
        select(func.count()).select_from(Room).where(Room.is_active.is_(True))
    )
    count = session.exec(count_statement).one()
    rooms = session.exec(
        statement.order_by(col(Room.sort_order), col(Room.name))
        .offset(skip)
        .limit(limit)
    ).all()
    return ScheduleRoomsPublic(
        data=[
            ScheduleRoomPublic(
                id=room.id,
                name=room.name,
                capacity=room.capacity,
                area_id=room.area_id,
                sort_order=room.sort_order,
                is_active=room.is_active,
            )
            for room in rooms
        ],
        count=count,
    )


@router.get("/bookings", response_model=ScheduleBookingsPublic)
def read_public_bookings(
    session: SessionDep,
    day: date | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
    room_id: uuid.UUID | None = None,
    skip: int = 0,
    limit: int = 500,
) -> Any:
    statement = select(Booking).where(
        Booking.status != BookingStatus.CANCELLED,
        Booking.approval_status == ApprovalStatus.APPROVED,
    )
    count_statement = (
        select(func.count())
        .select_from(Booking)
        .where(
            Booking.status != BookingStatus.CANCELLED,
            Booking.approval_status == ApprovalStatus.APPROVED,
        )
    )

    if day:
        day_start, day_end = day_bounds(day)
        statement = statement.where(
            Booking.start_time <= day_end, Booking.end_time >= day_start
        )
        count_statement = count_statement.where(
            Booking.start_time <= day_end, Booking.end_time >= day_start
        )
    elif start_date and end_date:
        range_start, _ = day_bounds(start_date)
        _, range_end = day_bounds(end_date)
        statement = statement.where(
            Booking.start_time <= range_end, Booking.end_time >= range_start
        )
        count_statement = count_statement.where(
            Booking.start_time <= range_end, Booking.end_time >= range_start
        )

    if room_id:
        statement = statement.where(Booking.room_id == room_id)
        count_statement = count_statement.where(Booking.room_id == room_id)

    count = session.exec(count_statement).one()
    bookings = session.exec(
        statement.order_by(col(Booking.start_time)).offset(skip).limit(limit)
    ).all()
    return ScheduleBookingsPublic(
        data=[_to_schedule_booking(b, session) for b in bookings],
        count=count,
    )
