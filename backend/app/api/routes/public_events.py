import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, HTTPException
from sqlmodel import col, func, select

from app.api.deps import CurrentUser, SessionDep
from app.api.routes.branding import DEFAULT_COLOR_LOGO, resolve_logo_url
from app.core.config import settings
from app.core.permissions import can_approve_bookings
from app.models import (
    ApprovalStatus,
    Booking,
    BookingRegistration,
    BookingRegistrationCreate,
    BookingRegistrationPublic,
    BookingRegistrationsPublic,
    BookingStatus,
    BrandingSettings,
    EventSurveySubmit,
    EventSurveyByContact,
    EventSurveyResult,
    PublicEventPublic,
    PublicRegistrationDetail,
    PublicRegistrationResult,
    EventCheckInByEmail,
    EventCheckInResult,
    RegistrationStatus,
)
from app.services.registration import (
    apply_survey_submission,
    can_submit_feedback,
    check_in_contact_conflict_message,
    find_active_registration_by_phone,
    has_survey_submitted,
    count_confirmed_registrations,
    ensure_public_event_access,
    find_active_registration,
    find_active_registration_by_contact,
    find_registration_by_confirmation_token,
    get_booking_by_public_token,
    check_in_lead_minutes_for,
    is_check_in_open,
    is_registration_open,
    is_survey_open,
    mark_attendance,
    normalize_registration_email,
    registration_closes_at,
    registration_opens_at,
    spots_remaining,
)
from app.services.registration_email import (
    notify_registration_cancelled,
    notify_registration_confirmed,
)

router = APIRouter(prefix="/public", tags=["public"])


def _branding(session: SessionDep) -> BrandingSettings:
    branding = session.get(BrandingSettings, 1)
    if not branding:
        branding = BrandingSettings(id=1)
    return branding


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


def _to_public_registration_detail(
    session: SessionDep, registration: BookingRegistration, booking: Booking
) -> PublicRegistrationDetail:
    base = _to_registration_public(registration)
    check_in_open = (
        registration.status == RegistrationStatus.CONFIRMED
        and registration.attended is not True
        and is_check_in_open(booking)
    )
    return PublicRegistrationDetail(
        **base.model_dump(),
        event_title=booking.title,
        event_start_time=booking.start_time,
        event_end_time=booking.end_time,
        can_check_in=check_in_open,
        can_submit_feedback=can_submit_feedback(registration, booking),
        enable_post_event_survey=booking.enable_post_event_survey,
    )


def _event_public(session: SessionDep, booking: Booking) -> PublicEventPublic:
    from app.models import Area, Room

    room = session.get(Room, booking.room_id)
    area_name = ""
    if room and room.area_id:
        area = session.get(Area, room.area_id)
        area_name = area.name if area else ""
    branding = _branding(session)
    count = count_confirmed_registrations(session, booking.id)
    before_slug = booking.registration_public_slug
    ensure_public_event_access(session, booking)
    if booking.registration_public_slug != before_slug:
        session.add(booking)
        session.commit()
        session.refresh(booking)
    return PublicEventPublic(
        title=booking.title,
        full_description=booking.full_description,
        start_time=booking.start_time,
        end_time=booking.end_time,
        room_name=room.name if room else None,
        area_name=area_name or None,
        event_capacity=booking.event_capacity,
        registration_count=count,
        spots_remaining=spots_remaining(session, booking),
        registration_is_open=is_registration_open(booking),
        registration_opens_at=registration_opens_at(booking),
        registration_closes_at=registration_closes_at(booking),
        check_in_open=is_check_in_open(booking),
        check_in_lead_minutes=booking.check_in_lead_minutes,
        public_slug=booking.registration_public_slug,
        enable_post_event_survey=booking.enable_post_event_survey,
        survey_open=is_survey_open(booking),
        company_name=branding.company_name,
        system_name=branding.system_name,
        logo_color_url=resolve_logo_url(
            branding.logo_color_url, DEFAULT_COLOR_LOGO, branding
        ),
    )


def _validate_booking_for_registration(booking: Booking | None) -> Booking:
    if not booking:
        raise HTTPException(status_code=404, detail="Event not found")
    if not booking.allow_registration:
        raise HTTPException(status_code=404, detail="Event not found")
    if booking.status == BookingStatus.CANCELLED:
        raise HTTPException(status_code=410, detail="This event has been cancelled")
    if booking.approval_status != ApprovalStatus.APPROVED:
        raise HTTPException(status_code=404, detail="Event not found")
    return booking


@router.get("/events/{token}", response_model=PublicEventPublic)
def read_public_event(session: SessionDep, token: str) -> Any:
    booking = get_booking_by_public_token(session, token)
    booking = _validate_booking_for_registration(booking)
    return _event_public(session, booking)


@router.post("/events/{token}/register", response_model=PublicRegistrationResult)
def register_for_public_event(
    session: SessionDep, token: str, body: BookingRegistrationCreate
) -> Any:
    booking = get_booking_by_public_token(session, token)
    booking = _validate_booking_for_registration(booking)
    if not is_registration_open(booking):
        raise HTTPException(status_code=400, detail="Registration is closed for this event")
    remaining = spots_remaining(session, booking)
    if remaining is not None and remaining <= 0:
        raise HTTPException(status_code=409, detail="This event is full")
    email = normalize_registration_email(body.attendee_email)
    existing = find_active_registration(session, booking.id, email)
    if existing:
        raise HTTPException(
            status_code=409,
            detail={
                "code": "already_registered",
                "message": "This email is already registered for this event. Only one registration per email is allowed.",
                "confirmation_token": existing.confirmation_token,
            },
        )
    if body.attendee_phone and body.attendee_phone.strip():
        existing_phone = find_active_registration_by_phone(
            session, booking.id, body.attendee_phone
        )
        if existing_phone:
            raise HTTPException(
                status_code=409,
                detail={
                    "code": "already_registered",
                    "message": "This phone number is already registered for this event.",
                    "confirmation_token": existing_phone.confirmation_token,
                },
            )
    registration = BookingRegistration.model_validate(
        body,
        update={
            "booking_id": booking.id,
            "attendee_email": email,
            "attendee_phone": body.attendee_phone.strip()
            if body.attendee_phone and body.attendee_phone.strip()
            else None,
            "status": RegistrationStatus.CONFIRMED,
        },
    )
    session.add(registration)
    session.commit()
    session.refresh(registration)
    notify_registration_confirmed(session, registration, booking)
    return PublicRegistrationResult(
        registration=_to_registration_public(registration),
        message="Registration confirmed. A confirmation email has been sent if email is configured.",
    )


@router.post("/events/{token}/check-in", response_model=EventCheckInResult)
def check_in_event_by_email(
    session: SessionDep, token: str, body: EventCheckInByEmail
) -> Any:
    booking = get_booking_by_public_token(session, token)
    booking = _validate_booking_for_registration(booking)
    if not is_check_in_open(booking):
        lead = check_in_lead_minutes_for(booking)
        raise HTTPException(
            status_code=400,
            detail=(
                f"Check-in opens {lead} minutes before the event starts "
                "and closes when the event ends."
            ),
        )
    registration = find_active_registration_by_contact(
        session, booking.id, body.contact
    )
    if not registration:
        raise HTTPException(
            status_code=404,
            detail="No registration found. Use the email or phone number you registered with.",
        )
    if registration.attended is True:
        return EventCheckInResult(
            attendee_name=registration.attendee_name,
            message="You are already checked in.",
            confirmation_token=registration.confirmation_token,
            already_checked_in=True,
        )
    conflict = check_in_contact_conflict_message(session, registration)
    if conflict:
        raise HTTPException(status_code=409, detail=conflict)
    mark_attendance(registration, True, via="self")
    session.add(registration)
    session.commit()
    session.refresh(registration)
    return EventCheckInResult(
        attendee_name=registration.attendee_name,
        message="Checked in successfully. Thank you for attending!",
        confirmation_token=registration.confirmation_token,
        already_checked_in=False,
    )


@router.post("/events/{token}/survey", response_model=EventSurveyResult)
def submit_public_event_survey(
    session: SessionDep, token: str, body: EventSurveyByContact
) -> Any:
    booking = get_booking_by_public_token(session, token)
    booking = _validate_booking_for_registration(booking)
    if not booking.enable_post_event_survey:
        raise HTTPException(status_code=404, detail="Survey not available for this event")
    if not is_survey_open(booking):
        raise HTTPException(
            status_code=400,
            detail="Survey opens when the event ends.",
        )
    registration = find_active_registration_by_contact(
        session, booking.id, body.contact.strip()
    )
    if not registration:
        raise HTTPException(
            status_code=404,
            detail="No registration found for this email or phone number.",
        )
    if not can_submit_feedback(registration, booking):
        if has_survey_submitted(registration):
            raise HTTPException(
                status_code=400,
                detail="You have already submitted a survey for this event.",
            )
        if registration.attended is not True:
            raise HTTPException(
                status_code=400,
                detail="You must check in before submitting the survey.",
            )
        raise HTTPException(
            status_code=400,
            detail="Survey is not available for this registration.",
        )
    apply_survey_submission(
        registration,
        EventSurveySubmit(
            content_rating=body.content_rating,
            trainer_rating=body.trainer_rating,
            organization_rating=body.organization_rating,
            liked=body.liked,
            improve=body.improve,
        ),
    )
    session.add(registration)
    session.commit()
    session.refresh(registration)
    return EventSurveyResult(
        attendee_name=registration.attendee_name,
        message="Thank you for your feedback!",
    )


@router.get(
    "/registrations/{confirmation_token}",
    response_model=PublicRegistrationDetail,
)
def read_public_registration(
    session: SessionDep, confirmation_token: str
) -> Any:
    registration = find_registration_by_confirmation_token(session, confirmation_token)
    if not registration:
        raise HTTPException(status_code=404, detail="Registration not found")
    booking = session.get(Booking, registration.booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Event not found")
    return _to_public_registration_detail(session, registration, booking)


@router.post(
    "/registrations/{confirmation_token}/check-in",
    response_model=PublicRegistrationDetail,
)
def check_in_public_registration(
    session: SessionDep, confirmation_token: str
) -> Any:
    registration = find_registration_by_confirmation_token(session, confirmation_token)
    if not registration:
        raise HTTPException(status_code=404, detail="Registration not found")
    if registration.status != RegistrationStatus.CONFIRMED:
        raise HTTPException(status_code=400, detail="Registration is not active")
    booking = session.get(Booking, registration.booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Event not found")
    if booking.status == BookingStatus.CANCELLED:
        raise HTTPException(status_code=410, detail="This event has been cancelled")
    if not is_check_in_open(booking):
        lead = check_in_lead_minutes_for(booking)
        raise HTTPException(
            status_code=400,
            detail=(
                f"Check-in opens {lead} minutes before the event starts "
                "and closes when the event ends."
            ),
        )
    if registration.attended is True:
        return _to_public_registration_detail(session, registration, booking)
    conflict = check_in_contact_conflict_message(session, registration)
    if conflict:
        raise HTTPException(status_code=409, detail=conflict)
    mark_attendance(registration, True, via="self")
    session.add(registration)
    session.commit()
    session.refresh(registration)
    return _to_public_registration_detail(session, registration, booking)


@router.post(
    "/registrations/{confirmation_token}/feedback",
    response_model=PublicRegistrationDetail,
)
def submit_public_registration_feedback(
    session: SessionDep,
    confirmation_token: str,
    body: EventSurveySubmit,
) -> Any:
    registration = find_registration_by_confirmation_token(session, confirmation_token)
    if not registration:
        raise HTTPException(status_code=404, detail="Registration not found")
    if registration.status != RegistrationStatus.CONFIRMED:
        raise HTTPException(status_code=400, detail="Registration is not active")
    booking = session.get(Booking, registration.booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Event not found")
    if not can_submit_feedback(registration, booking):
        if registration.attended is not True:
            raise HTTPException(
                status_code=400,
                detail="You must check in before submitting the survey.",
            )
        raise HTTPException(
            status_code=400,
            detail="Survey is only available after the event for checked-in attendees",
        )
    apply_survey_submission(registration, body)
    session.add(registration)
    session.commit()
    session.refresh(registration)
    return _to_public_registration_detail(session, registration, booking)


@router.post("/registrations/{confirmation_token}/cancel")
def cancel_public_registration(
    session: SessionDep, confirmation_token: str
) -> dict[str, str]:
    registration = find_registration_by_confirmation_token(session, confirmation_token)
    if not registration:
        raise HTTPException(status_code=404, detail="Registration not found")
    if registration.status == RegistrationStatus.CANCELLED:
        return {"message": "Registration already cancelled"}
    booking = session.get(Booking, registration.booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Event not found")
    registration.status = RegistrationStatus.CANCELLED
    registration.cancelled_at = datetime.now(timezone.utc)
    session.add(registration)
    session.commit()
    notify_registration_cancelled(session, registration, booking)
    return {"message": "Registration cancelled"}
