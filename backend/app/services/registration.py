"""Event registration helpers."""

import re
import secrets
import unicodedata
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import func
from sqlmodel import Session, col, select

from app.core.timezone_util import get_tz, hotel_now
from app.models import (
    ApprovalStatus,
    Booking,
    BookingRegistration,
    BookingStatus,
    EventSurveySubmit,
    RegistrationStatus,
)

TIME_UNITS: dict[str, timedelta] = {
    "seconds": timedelta(seconds=1),
    "minutes": timedelta(minutes=1),
    "hours": timedelta(hours=1),
    "days": timedelta(days=1),
    "weeks": timedelta(weeks=1),
}


def _as_utc(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def _offset_before(start: datetime, value: int | None, unit: str | None) -> datetime | None:
    if value is None or unit is None:
        return None
    delta = TIME_UNITS.get(unit)
    if not delta:
        return None
    return _as_utc(start) - delta * value


def registration_opens_at(booking: Booking) -> datetime | None:
    return _offset_before(
        booking.start_time,
        booking.registration_opens_value,
        booking.registration_opens_unit,
    )


def registration_closes_at(booking: Booking) -> datetime | None:
    return _offset_before(
        booking.start_time,
        booking.registration_closes_value,
        booking.registration_closes_unit,
    )


def is_registration_open(booking: Booking, now: datetime | None = None) -> bool:
    if not booking.allow_registration:
        return False
    if booking.status == BookingStatus.CANCELLED:
        return False
    if booking.approval_status != ApprovalStatus.APPROVED:
        return False
    if not booking.event_capacity or booking.event_capacity < 1:
        return False
    current = _as_utc(now or hotel_now())
    opens = registration_opens_at(booking)
    closes = registration_closes_at(booking)
    if opens and current < opens:
        return False
    if closes and current > closes:
        return False
    if current >= _as_utc(booking.start_time):
        return False
    return True


def count_confirmed_registrations(session: Session, booking_id: uuid.UUID) -> int:
    return session.exec(
        select(func.count())
        .select_from(BookingRegistration)
        .where(
            BookingRegistration.booking_id == booking_id,
            BookingRegistration.status == RegistrationStatus.CONFIRMED,
        )
    ).one()


def spots_remaining(session: Session, booking: Booking) -> int | None:
    if not booking.event_capacity:
        return None
    used = count_confirmed_registrations(session, booking.id)
    return max(0, booking.event_capacity - used)


def slugify_event_title(title: str, max_len: int = 48) -> str:
    normalized = unicodedata.normalize("NFKD", title.strip())
    ascii_text = "".join(c for c in normalized if not unicodedata.combining(c))
    slug = re.sub(r"[^a-z0-9]+", "-", ascii_text.lower())
    slug = re.sub(r"-+", "-", slug).strip("-")
    if len(slug) > max_len:
        slug = slug[:max_len].rstrip("-")
    return slug or "event"


def event_date_slug(booking: Booking) -> str:
    start = _as_utc(booking.start_time).astimezone(get_tz())
    return start.strftime("%Y-%m-%d")


def build_event_public_slug(booking: Booking) -> str:
    return f"{slugify_event_title(booking.title)}-{event_date_slug(booking)}"


def unique_event_public_slug(session: Session, booking: Booking) -> str:
    base = build_event_public_slug(booking)
    slug = base
    suffix = 2
    while True:
        existing = session.exec(
            select(Booking).where(
                Booking.registration_public_slug == slug,
                Booking.id != booking.id,
            )
        ).first()
        if not existing:
            return slug
        slug = f"{base}-{suffix}"
        suffix += 1


def ensure_public_event_access(
    session: Session, booking: Booking
) -> tuple[str | None, str | None]:
    if not booking.allow_registration:
        booking.registration_public_token = None
        booking.registration_public_slug = None
        return None, None
    if not booking.registration_public_token:
        booking.registration_public_token = secrets.token_urlsafe(24)
    desired = build_event_public_slug(booking)
    if booking.registration_public_slug != desired:
        conflict = session.exec(
            select(Booking).where(
                Booking.registration_public_slug == desired,
                Booking.id != booking.id,
            )
        ).first()
        booking.registration_public_slug = (
            desired if not conflict else unique_event_public_slug(session, booking)
        )
    return booking.registration_public_slug, booking.registration_public_token


def ensure_public_token(session: Session, booking: Booking) -> str | None:
    _, token = ensure_public_event_access(session, booking)
    return token


def get_booking_by_public_identifier(session: Session, identifier: str) -> Booking | None:
    booking = session.exec(
        select(Booking).where(Booking.registration_public_slug == identifier)
    ).first()
    if booking:
        return booking
    return session.exec(
        select(Booking).where(Booking.registration_public_token == identifier)
    ).first()


def get_booking_by_public_token(session: Session, token: str) -> Booking | None:
    return get_booking_by_public_identifier(session, token)


def normalize_registration_email(email: str) -> str:
    return email.strip().lower()


def normalize_phone(phone: str) -> str:
    return re.sub(r"\D", "", phone.strip())


def find_active_registration(
    session: Session, booking_id: uuid.UUID, email: str
) -> BookingRegistration | None:
    normalized = normalize_registration_email(email)
    return session.exec(
        select(BookingRegistration).where(
            BookingRegistration.booking_id == booking_id,
            col(BookingRegistration.attendee_email).ilike(normalized),
            BookingRegistration.status == RegistrationStatus.CONFIRMED,
        )
    ).first()


def find_active_registration_by_phone(
    session: Session, booking_id: uuid.UUID, phone: str
) -> BookingRegistration | None:
    digits = normalize_phone(phone)
    if not digits:
        return None
    registrations = session.exec(
        select(BookingRegistration).where(
            BookingRegistration.booking_id == booking_id,
            BookingRegistration.status == RegistrationStatus.CONFIRMED,
            BookingRegistration.attendee_phone.is_not(None),
        )
    ).all()
    for reg in registrations:
        if reg.attendee_phone and normalize_phone(reg.attendee_phone) == digits:
            return reg
    return None


def find_active_registration_by_contact(
    session: Session, booking_id: uuid.UUID, contact: str
) -> BookingRegistration | None:
    raw = contact.strip()
    if not raw:
        return None
    if "@" in raw:
        return find_active_registration(session, booking_id, raw)
    return find_active_registration_by_phone(session, booking_id, raw)


def find_checked_in_contact_conflict(
    session: Session,
    booking_id: uuid.UUID,
    *,
    email: str,
    phone: str | None,
    exclude_registration_id: uuid.UUID,
) -> BookingRegistration | None:
    """Another attendee already checked in with the same email or phone."""
    checked_in = session.exec(
        select(BookingRegistration).where(
            BookingRegistration.booking_id == booking_id,
            BookingRegistration.status == RegistrationStatus.CONFIRMED,
            BookingRegistration.attended.is_(True),
            BookingRegistration.id != exclude_registration_id,
        )
    ).all()
    norm_email = normalize_registration_email(email)
    norm_phone = normalize_phone(phone) if phone and phone.strip() else ""
    for reg in checked_in:
        if normalize_registration_email(reg.attendee_email) == norm_email:
            return reg
        if norm_phone and reg.attendee_phone:
            if normalize_phone(reg.attendee_phone) == norm_phone:
                return reg
    return None


def check_in_contact_conflict_message(
    session: Session, registration: BookingRegistration
) -> str | None:
    if registration.attended is True:
        return None
    conflict = find_checked_in_contact_conflict(
        session,
        registration.booking_id,
        email=registration.attendee_email,
        phone=registration.attendee_phone,
        exclude_registration_id=registration.id,
    )
    if conflict:
        return (
            "This email or phone number has already been used for check-in "
            "by another attendee."
        )
    return None


def find_registration_by_confirmation_token(
    session: Session, token: str
) -> BookingRegistration | None:
    return session.exec(
        select(BookingRegistration).where(
            BookingRegistration.confirmation_token == token
        )
    ).first()


def registration_stats(session: Session, booking: Booking) -> dict[str, int | bool | float | None]:
    count = count_confirmed_registrations(session, booking.id)
    remaining = spots_remaining(session, booking)
    base: dict[str, int | bool | float | None] = {
        "registration_count": count,
        "spots_remaining": remaining,
        "registration_is_open": is_registration_open(booking),
    }
    if not booking.allow_registration:
        return base
    regs = session.exec(
        select(BookingRegistration).where(
            BookingRegistration.booking_id == booking.id,
            BookingRegistration.status == RegistrationStatus.CONFIRMED,
        )
    ).all()
    attended = sum(1 for r in regs if r.attended is True)
    feedback_regs = [r for r in regs if r.feedback_rating is not None]
    avg: float | None = None
    if feedback_regs:
        avg = round(
            sum(r.feedback_rating for r in feedback_regs if r.feedback_rating) / len(feedback_regs),
            1,
        )
    base["attended_count"] = attended
    base["feedback_count"] = len(feedback_regs)
    base["average_feedback_rating"] = avg
    return base


def _average_rating(values: list[int]) -> float | None:
    if not values:
        return None
    return round(sum(values) / len(values), 1)


def has_survey_submitted(registration: BookingRegistration) -> bool:
    if registration.survey_content_rating is not None:
        return True
    return registration.feedback_rating is not None


def apply_survey_submission(
    registration: BookingRegistration, body: EventSurveySubmit
) -> None:
    registration.survey_content_rating = body.content_rating
    registration.survey_trainer_rating = body.trainer_rating
    registration.survey_organization_rating = body.organization_rating
    registration.survey_liked = (body.liked or "").strip() or None
    registration.survey_improve = (body.improve or "").strip() or None
    registration.feedback_submitted_at = datetime.now(timezone.utc)
    registration.feedback_rating = round(
        (body.content_rating + body.trainer_rating + body.organization_rating) / 3
    )
    parts = [p for p in (registration.survey_liked, registration.survey_improve) if p]
    registration.feedback_comment = "\n\n".join(parts) if parts else None


def registration_list_summary(
    registrations: list[BookingRegistration],
) -> dict[str, int | float | None]:
    confirmed = [r for r in registrations if r.status == RegistrationStatus.CONFIRMED]
    attended = sum(1 for r in confirmed if r.attended is True)
    absent = sum(1 for r in confirmed if r.attended is False)
    unmarked = sum(1 for r in confirmed if r.attended is None)
    survey_regs = [r for r in confirmed if r.survey_content_rating is not None]
    feedback_regs = [r for r in confirmed if has_survey_submitted(r)]
    avg: float | None = None
    if feedback_regs:
        avg = round(
            sum(r.feedback_rating for r in feedback_regs if r.feedback_rating) / len(feedback_regs),
            1,
        )
    return {
        "confirmed_count": len(confirmed),
        "attended_count": attended,
        "absent_count": absent,
        "unmarked_count": unmarked,
        "feedback_count": len(feedback_regs),
        "average_feedback_rating": avg,
        "survey_count": len(survey_regs),
        "average_content_rating": _average_rating(
            [r.survey_content_rating for r in survey_regs if r.survey_content_rating]
        ),
        "average_trainer_rating": _average_rating(
            [r.survey_trainer_rating for r in survey_regs if r.survey_trainer_rating]
        ),
        "average_organization_rating": _average_rating(
            [
                r.survey_organization_rating
                for r in survey_regs
                if r.survey_organization_rating
            ]
        ),
    }


CHECK_IN_LEAD_DEFAULT_MINUTES = 30


def check_in_lead_minutes_for(booking: Booking) -> int:
    value = getattr(booking, "check_in_lead_minutes", None)
    if value is None:
        return CHECK_IN_LEAD_DEFAULT_MINUTES
    return max(0, int(value))


def is_check_in_open(booking: Booking, now: datetime | None = None) -> bool:
    if booking.status == BookingStatus.CANCELLED:
        return False
    if booking.approval_status != ApprovalStatus.APPROVED:
        return False
    current = _as_utc(now or hotel_now())
    start = _as_utc(booking.start_time)
    end = _as_utc(booking.end_time)
    lead = timedelta(minutes=check_in_lead_minutes_for(booking))
    return start - lead <= current <= end


def can_submit_feedback(
    registration: BookingRegistration, booking: Booking, now: datetime | None = None
) -> bool:
    if not booking.enable_post_event_survey:
        return False
    if registration.status != RegistrationStatus.CONFIRMED:
        return False
    if registration.attended is not True:
        return False
    if has_survey_submitted(registration):
        return False
    current = _as_utc(now or hotel_now())
    return current >= _as_utc(booking.end_time)


def is_survey_open(booking: Booking, now: datetime | None = None) -> bool:
    if not booking.enable_post_event_survey:
        return False
    if booking.status == BookingStatus.CANCELLED:
        return False
    if booking.approval_status != ApprovalStatus.APPROVED:
        return False
    current = _as_utc(now or hotel_now())
    return current >= _as_utc(booking.end_time)


def mark_attendance(
    registration: BookingRegistration,
    attended: bool | None,
    *,
    via: str | None = None,
) -> None:
    registration.attended = attended
    if attended is True:
        registration.attended_at = datetime.now(timezone.utc)
        registration.attended_via = via
    elif attended is False:
        registration.attended_at = None
        registration.attended_via = None
    else:
        registration.attended_at = None
        registration.attended_via = None
