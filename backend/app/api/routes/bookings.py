import uuid
from datetime import date, datetime, timezone
from typing import Any, Literal

from fastapi import APIRouter, HTTPException
from sqlalchemy import or_
from sqlmodel import col, func, select

from app.api.deps import CurrentUser, SessionDep
from app.core.permissions import can_approve_bookings
from app.core.timezone_util import combine_hotel, day_bounds, get_tz, hotel_now
from app.services.booking_email import (
    notify_booking_approved,
    notify_booking_rejected,
    notify_pending_bookings,
    send_meeting_reminders,
)
from app.models import (
    ApprovalStatus,
    Area,
    Booking,
    BookingCreate,
    BookingPublic,
    BookingRegistration,
    BookingRegistrationAttendanceUpdate,
    BookingRegistrationCreate,
    BookingRegistrationPublic,
    BookingRegistrationsPublic,
    RegistrationListSummary,
    BookingReject,
    BookingsPublic,
    BookingStatus,
    BookingType,
    BookingUpdate,
    ConfirmationStatus,
    Message,
    RegistrationStatus,
    RepeatType,
    Room,
    User,
)
from app.services.booking import has_booking_conflict
from app.services.registration import (
    ensure_public_event_access,
    find_active_registration,
    is_registration_open,
    mark_attendance,
    normalize_registration_email,
    registration_list_summary,
    registration_stats,
    spots_remaining,
)
from app.services.registration_email import (
    notify_registration_cancelled,
    notify_registration_confirmed,
)
from app.services.repeat import expand_repeat_occurrences

router = APIRouter(prefix="/bookings", tags=["bookings"])


def _to_public(
    booking: Booking,
    session: SessionDep,
    current_user: User | None = None,
) -> BookingPublic:
    user = session.get(User, booking.created_by_id)
    name = user.full_name if user else None
    email = user.email if user else None
    room = session.get(Room, booking.room_id)
    area = session.get(Area, room.area_id) if room else None
    stats = registration_stats(session, booking)
    public_slug = None
    public_token = None
    if (
        booking.allow_registration
        and current_user
        and (
            current_user.is_superuser
            or current_user.id == booking.created_by_id
            or can_approve_bookings(current_user)
        )
    ):
        public_slug, public_token = ensure_public_event_access(session, booking)
        session.add(booking)
        session.commit()
        session.refresh(booking)
    return BookingPublic(
        id=booking.id,
        room_id=booking.room_id,
        created_by_id=booking.created_by_id,
        title=booking.title,
        start_time=booking.start_time,
        end_time=booking.end_time,
        booking_type=booking.booking_type,
        full_description=booking.full_description,
        confirmation_status=booking.confirmation_status,
        is_all_day=booking.is_all_day,
        repeat_type=booking.repeat_type,
        allow_registration=booking.allow_registration,
        event_capacity=booking.event_capacity,
        registration_opens_value=booking.registration_opens_value,
        registration_opens_unit=booking.registration_opens_unit,
        registration_closes_value=booking.registration_closes_value,
        registration_closes_unit=booking.registration_closes_unit,
        check_in_lead_minutes=booking.check_in_lead_minutes,
        enable_post_event_survey=booking.enable_post_event_survey,
        status=booking.status,
        approval_status=booking.approval_status,
        rejection_reason=booking.rejection_reason,
        approved_at=booking.approved_at,
        created_at=booking.created_at,
        created_by_name=name,
        created_by_email=email,
        room_name=room.name if room else None,
        area_name=area.name if area else None,
        registration_count=int(stats["registration_count"]),
        spots_remaining=stats["spots_remaining"],
        registration_is_open=bool(stats["registration_is_open"]),
        registration_public_token=public_token,
        registration_public_slug=public_slug,
        attended_count=int(stats["attended_count"]) if stats.get("attended_count") is not None else None,
        feedback_count=int(stats["feedback_count"]) if stats.get("feedback_count") is not None else None,
        average_feedback_rating=stats.get("average_feedback_rating"),  # type: ignore[arg-type]
    )


def _validate_times(start_time: datetime, end_time: datetime) -> None:
    if start_time >= end_time:
        raise HTTPException(status_code=400, detail="End time must be after start time")


@router.get("/mine", response_model=BookingsPublic)
def my_bookings(
    session: SessionDep,
    current_user: CurrentUser,
    tab: Literal["upcoming", "pending", "past", "all"] = "upcoming",
    skip: int = 0,
    limit: int = 200,
    events_only: bool = False,
) -> Any:
    now = hotel_now()
    statement = select(Booking).where(
        Booking.status != BookingStatus.CANCELLED,
        Booking.created_by_id == current_user.id,
    )
    count_statement = (
        select(func.count())
        .select_from(Booking)
        .where(
            Booking.status != BookingStatus.CANCELLED,
            Booking.created_by_id == current_user.id,
        )
    )
    if events_only:
        statement = statement.where(Booking.allow_registration.is_(True))
        count_statement = count_statement.where(Booking.allow_registration.is_(True))

    if tab == "upcoming":
        statement = statement.where(Booking.end_time >= now)
        count_statement = count_statement.where(Booking.end_time >= now)
        order = (col(Booking.start_time),)
    elif tab == "pending":
        statement = statement.where(Booking.approval_status == ApprovalStatus.PENDING)
        count_statement = count_statement.where(
            Booking.approval_status == ApprovalStatus.PENDING
        )
        order = (col(Booking.start_time),)
    elif tab == "past":
        statement = statement.where(Booking.end_time < now)
        count_statement = count_statement.where(Booking.end_time < now)
        order = (col(Booking.start_time).desc(),)
    else:
        order = (col(Booking.start_time).desc(),)

    count = session.exec(count_statement).one()
    bookings = session.exec(
        statement.order_by(*order).offset(skip).limit(limit)
    ).all()
    return BookingsPublic(
        data=[_to_public(b, session, current_user) for b in bookings], count=count
    )


@router.post("/send-reminders")
def run_booking_reminders(
    session: SessionDep, current_user: CurrentUser
) -> dict[str, int]:
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    sent = send_meeting_reminders(session)
    return {"sent": sent}


@router.get("/pending-count")
def pending_count(session: SessionDep, current_user: CurrentUser) -> dict[str, int]:
    if not can_approve_bookings(current_user):
        return {"count": 0}
    count = session.exec(
        select(func.count())
        .select_from(Booking)
        .where(
            Booking.status != BookingStatus.CANCELLED,
            Booking.approval_status == ApprovalStatus.PENDING,
        )
    ).one()
    return {"count": count}


@router.get("/report", response_model=BookingsPublic)
def report_bookings(
    session: SessionDep,
    current_user: CurrentUser,
    start_date: date | None = None,
    end_date: date | None = None,
    area_id: uuid.UUID | None = None,
    room_id: uuid.UUID | None = None,
    booking_type: str | None = None,
    title: str | None = None,
    full_description: str | None = None,
    created_by: str | None = None,
    confirmation_status: str | None = None,
    approval_status: str | None = None,
    sort_by: str = "start_time",
    skip: int = 0,
    limit: int = 500,
) -> Any:
    del current_user

    statement = select(Booking).where(Booking.status != BookingStatus.CANCELLED)
    count_statement = (
        select(func.count())
        .select_from(Booking)
        .where(Booking.status != BookingStatus.CANCELLED)
    )

    if start_date:
        start_dt = combine_hotel(start_date, 0, 0)
        statement = statement.where(Booking.end_time >= start_dt)
        count_statement = count_statement.where(Booking.end_time >= start_dt)
    if end_date:
        end_dt = combine_hotel(end_date, 23, 59)
        statement = statement.where(Booking.start_time <= end_dt)
        count_statement = count_statement.where(Booking.start_time <= end_dt)
    if room_id:
        statement = statement.where(Booking.room_id == room_id)
        count_statement = count_statement.where(Booking.room_id == room_id)
    elif area_id:
        room_ids = session.exec(
            select(Room.id).where(Room.area_id == area_id)
        ).all()
        statement = statement.where(col(Booking.room_id).in_(room_ids))
        count_statement = count_statement.where(col(Booking.room_id).in_(room_ids))
    if booking_type:
        statement = statement.where(Booking.booking_type == booking_type)
        count_statement = count_statement.where(Booking.booking_type == booking_type)
    if title:
        statement = statement.where(col(Booking.title).ilike(f"%{title}%"))
        count_statement = count_statement.where(col(Booking.title).ilike(f"%{title}%"))
    if full_description:
        statement = statement.where(
            col(Booking.full_description).ilike(f"%{full_description}%")
        )
        count_statement = count_statement.where(
            col(Booking.full_description).ilike(f"%{full_description}%")
        )
    if confirmation_status:
        statement = statement.where(Booking.confirmation_status == confirmation_status)
        count_statement = count_statement.where(
            Booking.confirmation_status == confirmation_status
        )
    if approval_status:
        statement = statement.where(Booking.approval_status == approval_status)
        count_statement = count_statement.where(Booking.approval_status == approval_status)
    if created_by:
        users = session.exec(
            select(User).where(
                or_(
                    col(User.email).ilike(f"%{created_by}%"),
                    col(User.full_name).ilike(f"%{created_by}%"),
                )
            )
        ).all()
        user_ids = [u.id for u in users]
        if not user_ids:
            return BookingsPublic(data=[], count=0)
        statement = statement.where(col(Booking.created_by_id).in_(user_ids))
        count_statement = count_statement.where(col(Booking.created_by_id).in_(user_ids))

    if sort_by == "room":
        order = (Room.name, col(Booking.start_time))
        statement = statement.join(Room, Booking.room_id == Room.id)
    else:
        order = (col(Booking.start_time).desc(),)

    count = session.exec(count_statement).one()
    bookings = session.exec(
        statement.order_by(*order).offset(skip).limit(limit)
    ).all()
    return BookingsPublic(
        data=[_to_public(b, session, current_user) for b in bookings], count=count
    )


@router.get("/", response_model=BookingsPublic)
def read_bookings(
    session: SessionDep,
    current_user: CurrentUser,
    day: date | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
    room_id: uuid.UUID | None = None,
    for_schedule: bool = False,
    skip: int = 0,
    limit: int = 500,
) -> Any:
    statement = select(Booking).where(Booking.status != BookingStatus.CANCELLED)
    count_statement = (
        select(func.count())
        .select_from(Booking)
        .where(Booking.status != BookingStatus.CANCELLED)
    )

    if for_schedule:
        statement = statement.where(
            Booking.approval_status == ApprovalStatus.APPROVED
        )
        count_statement = count_statement.where(
            Booking.approval_status == ApprovalStatus.APPROVED
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
    return BookingsPublic(
        data=[_to_public(b, session, current_user) for b in bookings], count=count
    )


@router.get("/{booking_id}", response_model=BookingPublic)
def read_booking(
    session: SessionDep, current_user: CurrentUser, booking_id: uuid.UUID
) -> Any:
    booking = session.get(Booking, booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    return _to_public(booking, session, current_user)


@router.post("/", response_model=BookingsPublic)
def create_booking(
    *, session: SessionDep, current_user: CurrentUser, booking_in: BookingCreate
) -> Any:
    if booking_in.booking_type not in (BookingType.INTERNAL, BookingType.EXTERNAL):
        raise HTTPException(status_code=400, detail="Invalid booking type")
    if booking_in.confirmation_status not in (
        ConfirmationStatus.TENTATIVE,
        ConfirmationStatus.CONFIRMED,
    ):
        raise HTTPException(status_code=400, detail="Invalid confirmation status")
    if booking_in.repeat_type not in (
        RepeatType.NONE,
        RepeatType.DAILY,
        RepeatType.WEEKLY,
        RepeatType.MONTHLY,
        RepeatType.YEARLY,
    ):
        raise HTTPException(status_code=400, detail="Invalid repeat type")
    _validate_times(booking_in.start_time, booking_in.end_time)

    if booking_in.repeat_type != RepeatType.NONE:
        if not booking_in.repeat_until:
            raise HTTPException(
                status_code=400,
                detail="Repeat until date is required for repeating bookings",
            )
        if booking_in.repeat_until < booking_in.start_time.date():
            raise HTTPException(
                status_code=400,
                detail="Repeat until must be on or after the start date",
            )

    occurrences = expand_repeat_occurrences(
        booking_in.start_time,
        booking_in.end_time,
        booking_in.repeat_type,
        booking_in.repeat_until,
    )
    if not occurrences:
        raise HTTPException(status_code=400, detail="No repeat occurrences in range")

    owner_id = current_user.id
    if (
        booking_in.created_by_id
        and booking_in.created_by_id != current_user.id
    ):
        if not current_user.is_superuser:
            raise HTTPException(status_code=403, detail="Not enough permissions")
        if not session.get(User, booking_in.created_by_id):
            raise HTTPException(status_code=404, detail="User not found")
        owner_id = booking_in.created_by_id

    approval = (
        ApprovalStatus.APPROVED
        if current_user.is_superuser
        else ApprovalStatus.PENDING
    )
    now = datetime.now(get_tz()) if approval == ApprovalStatus.APPROVED else None
    approver = current_user.id if approval == ApprovalStatus.APPROVED else None

    created: list[Booking] = []
    booking_data = booking_in.model_dump(exclude={"room_ids", "created_by_id"})

    for room_id in booking_in.room_ids:
        if not session.get(Room, room_id):
            raise HTTPException(status_code=404, detail="Room not found")
        for occ_start, occ_end in occurrences:
            if has_booking_conflict(
                session,
                room_id=room_id,
                start_time=occ_start,
                end_time=occ_end,
            ):
                room = session.get(Room, room_id)
                room_name = room.name if room else str(room_id)
                raise HTTPException(
                    status_code=409,
                    detail=(
                        f"Room '{room_name}' is already booked on "
                        f"{occ_start.date().isoformat()} for this time"
                    ),
                )
            booking = Booking.model_validate(
                booking_data,
                update={
                    "room_id": room_id,
                    "created_by_id": owner_id,
                    "start_time": occ_start,
                    "end_time": occ_end,
                    "approval_status": approval,
                    "approved_by_id": approver,
                    "approved_at": now,
                },
            )
            ensure_public_event_access(session, booking)
            session.add(booking)
            created.append(booking)

    session.commit()
    for booking in created:
        session.refresh(booking)
    if approval == ApprovalStatus.PENDING:
        notify_pending_bookings(session, created)
    return BookingsPublic(
        data=[_to_public(b, session, current_user) for b in created], count=len(created)
    )


@router.post("/{booking_id}/approve", response_model=BookingPublic)
def approve_booking(
    session: SessionDep, current_user: CurrentUser, booking_id: uuid.UUID
) -> Any:
    if not can_approve_bookings(current_user):
        raise HTTPException(status_code=403, detail="Not enough permissions")
    booking = session.get(Booking, booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking.approval_status == ApprovalStatus.APPROVED:
        return _to_public(booking, session, current_user)
    if has_booking_conflict(
        session,
        room_id=booking.room_id,
        start_time=booking.start_time,
        end_time=booking.end_time,
        exclude_booking_id=booking.id,
    ):
        raise HTTPException(
            status_code=409, detail="Room is already booked for this time"
        )
    booking.approval_status = ApprovalStatus.APPROVED
    booking.approved_by_id = current_user.id
    booking.approved_at = datetime.now(timezone.utc)
    booking.rejection_reason = None
    session.add(booking)
    session.commit()
    session.refresh(booking)
    notify_booking_approved(session, booking)
    return _to_public(booking, session, current_user)


@router.post("/{booking_id}/reject", response_model=BookingPublic)
def reject_booking(
    session: SessionDep,
    current_user: CurrentUser,
    booking_id: uuid.UUID,
    body: BookingReject,
) -> Any:
    if not can_approve_bookings(current_user):
        raise HTTPException(status_code=403, detail="Not enough permissions")
    booking = session.get(Booking, booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    booking.approval_status = ApprovalStatus.REJECTED
    booking.rejection_reason = body.reason
    booking.approved_by_id = current_user.id
    booking.approved_at = datetime.now(timezone.utc)
    session.add(booking)
    session.commit()
    session.refresh(booking)
    notify_booking_rejected(session, booking)
    return _to_public(booking, session, current_user)


@router.put("/{booking_id}", response_model=BookingPublic)
def update_booking(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    booking_id: uuid.UUID,
    booking_in: BookingUpdate,
) -> Any:
    booking = session.get(Booking, booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    update_data = booking_in.model_dump(exclude_unset=True)
    is_owner = booking.created_by_id == current_user.id
    is_superuser = current_user.is_superuser
    is_approver = can_approve_bookings(current_user)

    if not is_superuser and not is_owner:
        if is_approver and set(update_data.keys()) == {"confirmation_status"}:
            pass
        else:
            raise HTTPException(status_code=403, detail="Not enough permissions")
    if "created_by_id" in update_data:
        if not current_user.is_superuser:
            raise HTTPException(status_code=403, detail="Not enough permissions")
        if not session.get(User, update_data["created_by_id"]):
            raise HTTPException(status_code=404, detail="User not found")
    if "booking_type" in update_data and update_data["booking_type"] not in (
        BookingType.INTERNAL,
        BookingType.EXTERNAL,
    ):
        raise HTTPException(status_code=400, detail="Invalid booking type")
    if "room_id" in update_data and not session.get(Room, update_data["room_id"]):
        raise HTTPException(status_code=404, detail="Room not found")
    booking.sqlmodel_update(update_data)
    ensure_public_event_access(session, booking)
    was_pending_reset = False
    if not is_superuser and is_owner:
        booking.approval_status = ApprovalStatus.PENDING
        booking.approved_by_id = None
        booking.approved_at = None
        booking.rejection_reason = None
        booking.reminder_sent_at = None
        was_pending_reset = True
    _validate_times(booking.start_time, booking.end_time)
    if has_booking_conflict(
        session,
        room_id=booking.room_id,
        start_time=booking.start_time,
        end_time=booking.end_time,
        exclude_booking_id=booking.id,
    ):
        raise HTTPException(
            status_code=409, detail="Room is already booked for this time"
        )
    session.add(booking)
    session.commit()
    session.refresh(booking)
    if was_pending_reset:
        notify_pending_bookings(session, [booking])
    return _to_public(booking, session, current_user)


@router.delete("/{booking_id}")
def delete_booking(
    session: SessionDep, current_user: CurrentUser, booking_id: uuid.UUID
) -> Message:
    booking = session.get(Booking, booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if not current_user.is_superuser and booking.created_by_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    booking.status = BookingStatus.CANCELLED
    session.add(booking)
    session.commit()
    return Message(message="Booking cancelled successfully")


def _can_manage_registrations(user: User, booking: Booking) -> bool:
    return (
        user.is_superuser
        or user.id == booking.created_by_id
        or can_approve_bookings(user)
    )


def _to_registration_public(reg: BookingRegistration) -> BookingRegistrationPublic:
    return BookingRegistrationPublic(
        id=reg.id,
        booking_id=reg.booking_id,
        attendee_name=reg.attendee_name,
        attendee_email=reg.attendee_email,
        attendee_phone=reg.attendee_phone,
        department=reg.department,
        status=reg.status,
        confirmation_token=reg.confirmation_token,
        registered_at=reg.registered_at,
        cancelled_at=reg.cancelled_at,
        attended=reg.attended,
        attended_at=reg.attended_at,
        attended_via=reg.attended_via,
        feedback_rating=reg.feedback_rating,
        feedback_comment=reg.feedback_comment,
        feedback_submitted_at=reg.feedback_submitted_at,
        survey_content_rating=reg.survey_content_rating,
        survey_trainer_rating=reg.survey_trainer_rating,
        survey_organization_rating=reg.survey_organization_rating,
        survey_liked=reg.survey_liked,
        survey_improve=reg.survey_improve,
    )


@router.get("/{booking_id}/registrations", response_model=BookingRegistrationsPublic)
def list_booking_registrations(
    session: SessionDep, current_user: CurrentUser, booking_id: uuid.UUID
) -> Any:
    booking = session.get(Booking, booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if not _can_manage_registrations(current_user, booking):
        raise HTTPException(status_code=403, detail="Not enough permissions")
    room = session.get(Room, booking.room_id)
    area = session.get(Area, room.area_id) if room else None
    registrations = session.exec(
        select(BookingRegistration)
        .where(BookingRegistration.booking_id == booking_id)
        .order_by(col(BookingRegistration.registered_at).desc())
    ).all()
    summary_data = registration_list_summary(list(registrations))
    public_slug = None
    public_token = None
    if booking.allow_registration:
        public_slug, public_token = ensure_public_event_access(session, booking)
        session.add(booking)
        session.commit()
        session.refresh(booking)
    return BookingRegistrationsPublic(
        data=[_to_registration_public(r) for r in registrations],
        count=len(registrations),
        summary=RegistrationListSummary(**summary_data),
        registration_public_slug=public_slug,
        registration_public_token=public_token,
        approval_status=booking.approval_status,
        check_in_lead_minutes=booking.check_in_lead_minutes,
        event_title=booking.title,
        event_start_time=booking.start_time,
        event_end_time=booking.end_time,
        room_name=room.name if room else None,
        area_name=area.name if area else None,
        enable_post_event_survey=booking.enable_post_event_survey,
    )


@router.patch(
    "/{booking_id}/registrations/{registration_id}/attendance",
    response_model=BookingRegistrationPublic,
)
def update_registration_attendance(
    session: SessionDep,
    current_user: CurrentUser,
    booking_id: uuid.UUID,
    registration_id: uuid.UUID,
    body: BookingRegistrationAttendanceUpdate,
) -> Any:
    booking = session.get(Booking, booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if not _can_manage_registrations(current_user, booking):
        raise HTTPException(status_code=403, detail="Not enough permissions")
    registration = session.get(BookingRegistration, registration_id)
    if not registration or registration.booking_id != booking_id:
        raise HTTPException(status_code=404, detail="Registration not found")
    if registration.status != RegistrationStatus.CONFIRMED:
        raise HTTPException(status_code=400, detail="Registration is not active")
    mark_attendance(registration, body.attended, via="organizer")
    session.add(registration)
    session.commit()
    session.refresh(registration)
    return _to_registration_public(registration)


@router.post("/{booking_id}/registrations/mark-all-attended")
def mark_all_registrations_attended(
    session: SessionDep,
    current_user: CurrentUser,
    booking_id: uuid.UUID,
) -> dict[str, int]:
    booking = session.get(Booking, booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if not _can_manage_registrations(current_user, booking):
        raise HTTPException(status_code=403, detail="Not enough permissions")
    registrations = session.exec(
        select(BookingRegistration).where(
            BookingRegistration.booking_id == booking_id,
            BookingRegistration.status == RegistrationStatus.CONFIRMED,
        )
    ).all()
    updated = 0
    for registration in registrations:
        if registration.attended is not True:
            mark_attendance(registration, True, via="organizer")
            session.add(registration)
            updated += 1
    session.commit()
    return {"updated": updated}


@router.post("/{booking_id}/registrations/mark-unmarked-absent")
def mark_unmarked_registrations_absent(
    session: SessionDep,
    current_user: CurrentUser,
    booking_id: uuid.UUID,
) -> dict[str, int]:
    booking = session.get(Booking, booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if not _can_manage_registrations(current_user, booking):
        raise HTTPException(status_code=403, detail="Not enough permissions")
    registrations = session.exec(
        select(BookingRegistration).where(
            BookingRegistration.booking_id == booking_id,
            BookingRegistration.status == RegistrationStatus.CONFIRMED,
        )
    ).all()
    updated = 0
    for registration in registrations:
        if registration.attended is None:
            mark_attendance(registration, False, via="organizer")
            session.add(registration)
            updated += 1
    session.commit()
    return {"updated": updated}


@router.delete("/{booking_id}/registrations/{registration_id}")
def remove_booking_registration(
    session: SessionDep,
    current_user: CurrentUser,
    booking_id: uuid.UUID,
    registration_id: uuid.UUID,
) -> Message:
    booking = session.get(Booking, booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if not _can_manage_registrations(current_user, booking):
        raise HTTPException(status_code=403, detail="Not enough permissions")
    registration = session.get(BookingRegistration, registration_id)
    if not registration or registration.booking_id != booking_id:
        raise HTTPException(status_code=404, detail="Registration not found")
    if registration.status != RegistrationStatus.CANCELLED:
        registration.status = RegistrationStatus.CANCELLED
        registration.cancelled_at = datetime.now(timezone.utc)
        session.add(registration)
        session.commit()
        notify_registration_cancelled(session, registration, booking)
    return Message(message="Registration removed")


@router.post("/{booking_id}/register", response_model=BookingRegistrationPublic)
def register_current_user(
    session: SessionDep,
    current_user: CurrentUser,
    booking_id: uuid.UUID,
    body: BookingRegistrationCreate | None = None,
) -> Any:
    booking = session.get(Booking, booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if not booking.allow_registration:
        raise HTTPException(status_code=400, detail="Registration is not enabled")
    if not is_registration_open(booking):
        raise HTTPException(status_code=400, detail="Registration is closed")
    remaining = spots_remaining(session, booking)
    if remaining is not None and remaining <= 0:
        raise HTTPException(status_code=409, detail="This event is full")
    email = normalize_registration_email(
        body.attendee_email if body else current_user.email
    )
    name = (
        body.attendee_name
        if body and body.attendee_name
        else current_user.full_name or email.split("@")[0]
    )
    existing = find_active_registration(session, booking.id, email)
    if existing:
        raise HTTPException(
            status_code=409,
            detail={
                "code": "already_registered",
                "message": "You are already registered for this event with this email.",
                "confirmation_token": existing.confirmation_token,
            },
        )
    registration = BookingRegistration(
        booking_id=booking.id,
        user_id=current_user.id,
        attendee_name=name,
        attendee_email=email,
        department=body.department if body else None,
        status=RegistrationStatus.CONFIRMED,
    )
    session.add(registration)
    session.commit()
    session.refresh(registration)
    notify_registration_confirmed(session, registration, booking)
    return _to_registration_public(registration)


@router.delete("/{booking_id}/register")
def cancel_current_user_registration(
    session: SessionDep, current_user: CurrentUser, booking_id: uuid.UUID
) -> Message:
    booking = session.get(Booking, booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    registration = session.exec(
        select(BookingRegistration).where(
            BookingRegistration.booking_id == booking_id,
            BookingRegistration.user_id == current_user.id,
            BookingRegistration.status == RegistrationStatus.CONFIRMED,
        )
    ).first()
    if not registration:
        registration = find_active_registration(session, booking_id, current_user.email)
    if not registration:
        raise HTTPException(status_code=404, detail="Registration not found")
    registration.status = RegistrationStatus.CANCELLED
    registration.cancelled_at = datetime.now(timezone.utc)
    session.add(registration)
    session.commit()
    notify_registration_cancelled(session, registration, booking)
    return Message(message="Registration cancelled")
