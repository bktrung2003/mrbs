import logging
from datetime import datetime, timedelta, timezone

from sqlmodel import Session, col, or_, select

from app.core.config import settings
from app.core.timezone_util import get_tz
from app.models import ApprovalStatus, Booking, BookingStatus, Room, User
from app.utils import EmailData, render_email_template, send_email

logger = logging.getLogger(__name__)


def _format_dt(dt: datetime) -> str:
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(get_tz()).strftime("%d/%m/%Y %H:%M")


def _booking_details(session: Session, booking: Booking) -> dict[str, str]:
    room = session.get(Room, booking.room_id)
    area_name = ""
    room_name = room.name if room else "—"
    if room and room.area_id:
        from app.models import Area

        area = session.get(Area, room.area_id)
        area_name = area.name if area else ""
    creator = session.get(User, booking.created_by_id)
    return {
        "title": booking.title,
        "room_name": room_name,
        "area_name": area_name,
        "start_label": _format_dt(booking.start_time),
        "end_label": _format_dt(booking.end_time),
        "creator_name": creator.full_name if creator and creator.full_name else "",
        "creator_email": creator.email if creator else "",
    }


def _send_if_enabled(email_to: str, email_data: EmailData) -> None:
    if not settings.emails_enabled:
        logger.info("Email skipped (SMTP not configured): %s", email_data.subject)
        return
    if not email_to:
        return
    try:
        send_email(
            email_to=email_to,
            subject=email_data.subject,
            html_content=email_data.html_content,
        )
    except Exception:
        logger.exception("Failed to send email to %s: %s", email_to, email_data.subject)


def _approver_emails(session: Session) -> list[str]:
    users = session.exec(
        select(User).where(
            or_(User.is_superuser == True, User.is_booking_approver == True)  # noqa: E712
        )
    ).all()
    return [u.email for u in users if u.email and u.is_active]


def notify_pending_bookings(session: Session, bookings: list[Booking]) -> None:
    if not bookings:
        return
    pending = [b for b in bookings if b.approval_status == ApprovalStatus.PENDING]
    if not pending:
        return
    sample = pending[0]
    details = _booking_details(session, sample)
    occurrence_count = len(pending)
    project_name = settings.PROJECT_NAME
    subject = f"{project_name} – Booking pending approval: {sample.title}"
    html_content = render_email_template(
        template_name="booking_pending.html",
        context={
            "project_name": project_name,
            "occurrence_count": occurrence_count,
            "admin_link": f"{settings.FRONTEND_HOST}/admin",
            **details,
        },
    )
    email_data = EmailData(html_content=html_content, subject=subject)
    for email in _approver_emails(session):
        _send_if_enabled(email, email_data)


def notify_booking_approved(session: Session, booking: Booking) -> None:
    creator = session.get(User, booking.created_by_id)
    if not creator or not creator.email:
        return
    details = _booking_details(session, booking)
    project_name = settings.PROJECT_NAME
    subject = f"{project_name} – Booking approved: {booking.title}"
    html_content = render_email_template(
        template_name="booking_approved.html",
        context={
            "project_name": project_name,
            "schedule_link": f"{settings.FRONTEND_HOST}/schedule",
            "my_bookings_link": f"{settings.FRONTEND_HOST}/my-bookings",
            **details,
        },
    )
    _send_if_enabled(creator.email, EmailData(html_content=html_content, subject=subject))


def notify_booking_rejected(session: Session, booking: Booking) -> None:
    creator = session.get(User, booking.created_by_id)
    if not creator or not creator.email:
        return
    details = _booking_details(session, booking)
    project_name = settings.PROJECT_NAME
    subject = f"{project_name} – Booking rejected: {booking.title}"
    html_content = render_email_template(
        template_name="booking_rejected.html",
        context={
            "project_name": project_name,
            "rejection_reason": booking.rejection_reason or "No reason provided",
            "my_bookings_link": f"{settings.FRONTEND_HOST}/my-bookings",
            **details,
        },
    )
    _send_if_enabled(creator.email, EmailData(html_content=html_content, subject=subject))


def send_meeting_reminders(session: Session) -> int:
    """Send reminder emails for approved meetings starting soon. Returns count sent."""
    if not settings.emails_enabled:
        return 0
    now = datetime.now(timezone.utc)
    lead = timedelta(minutes=settings.BOOKING_REMINDER_MINUTES_BEFORE)
    window = timedelta(minutes=15)
    window_start = now + lead - window / 2
    window_end = now + lead + window / 2

    bookings = session.exec(
        select(Booking).where(
            Booking.status != BookingStatus.CANCELLED,
            Booking.approval_status == ApprovalStatus.APPROVED,
            col(Booking.reminder_sent_at).is_(None),
            Booking.start_time >= window_start,
            Booking.start_time <= window_end,
        )
    ).all()

    sent = 0
    project_name = settings.PROJECT_NAME
    for booking in bookings:
        creator = session.get(User, booking.created_by_id)
        if not creator or not creator.email:
            continue
        details = _booking_details(session, booking)
        subject = f"{project_name} – Reminder: {booking.title} starts soon"
        html_content = render_email_template(
            template_name="booking_reminder.html",
            context={
                "project_name": project_name,
                "minutes_before": settings.BOOKING_REMINDER_MINUTES_BEFORE,
                "schedule_link": f"{settings.FRONTEND_HOST}/schedule",
                **details,
            },
        )
        try:
            send_email(
                email_to=creator.email,
                subject=subject,
                html_content=html_content,
            )
            booking.reminder_sent_at = now
            session.add(booking)
            sent += 1
        except Exception:
            logger.exception("Failed to send reminder for booking %s", booking.id)
    if sent:
        session.commit()
    return sent
