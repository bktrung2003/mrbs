import logging

from sqlmodel import Session

from app.core.config import settings
from app.models import Booking, BookingRegistration
from app.services.booking_email import _booking_details, _format_dt, _send_if_enabled
from app.utils import EmailData, render_email_template

logger = logging.getLogger(__name__)


def notify_registration_confirmed(
    session: Session, registration: BookingRegistration, booking: Booking
) -> None:
    details = _booking_details(session, booking)
    project_name = settings.PROJECT_NAME
    subject = f"{project_name} – Registration confirmed: {booking.title}"
    cancel_link = (
        f"{settings.FRONTEND_HOST}/events/registration/"
        f"{registration.confirmation_token}"
    )
    html_content = render_email_template(
        template_name="registration_confirmed.html",
        context={
            "project_name": project_name,
            "attendee_name": registration.attendee_name,
            "cancel_link": cancel_link,
            **details,
        },
    )
    _send_if_enabled(
        registration.attendee_email,
        EmailData(html_content=html_content, subject=subject),
    )


def notify_registration_cancelled(
    session: Session, registration: BookingRegistration, booking: Booking
) -> None:
    details = _booking_details(session, booking)
    project_name = settings.PROJECT_NAME
    subject = f"{project_name} – Registration cancelled: {booking.title}"
    html_content = render_email_template(
        template_name="registration_cancelled.html",
        context={
            "project_name": project_name,
            "attendee_name": registration.attendee_name,
            **details,
        },
    )
    _send_if_enabled(
        registration.attendee_email,
        EmailData(html_content=html_content, subject=subject),
    )
