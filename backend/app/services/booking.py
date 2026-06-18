import uuid
from datetime import datetime

from sqlmodel import Session, select

from app.models import Booking, BookingStatus


def has_booking_conflict(
    session: Session,
    *,
    room_id: uuid.UUID,
    start_time: datetime,
    end_time: datetime,
    exclude_booking_id: uuid.UUID | None = None,
) -> bool:
    statement = select(Booking).where(
        Booking.room_id == room_id,
        Booking.status != BookingStatus.CANCELLED,
        Booking.approval_status != "rejected",
        Booking.start_time < end_time,
        Booking.end_time > start_time,
    )
    if exclude_booking_id:
        statement = statement.where(Booking.id != exclude_booking_id)
    return session.exec(statement).first() is not None
