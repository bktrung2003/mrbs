from app.models import User


def can_approve_bookings(user: User) -> bool:
    """IT superuser or HR admin who can approve employee booking requests."""
    return bool(user.is_superuser or user.is_booking_approver)
