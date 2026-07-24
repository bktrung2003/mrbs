from sqlmodel import Session, create_engine, select

from app import crud
from app.core.config import settings
from app.core.timezone_util import combine_hotel, hotel_today
from app.models import (
    Area,
    Booking,
    BookingStatus,
    BookingType,
    Room,
    User,
    UserCreate,
)

engine = create_engine(str(settings.SQLALCHEMY_DATABASE_URI))

# Demo titles — local only. Never re-seed on live; clean up if found in production.
SAMPLE_BOOKINGS = [
    ("Thanh Ly", "Glass Room (10)", 9, 0, 9, 30),
    ("Linh Vân", "Glass Room (10)", 11, 0, 11, 30),
    (
        "INDUCTION PROGRAM GM of Ixora Ho Tram",
        "Board Room (20)",
        9,
        0,
        16,
        30,
    ),
]

SAMPLE_BOOKING_TITLES = {title for title, *_ in SAMPLE_BOOKINGS}


def init_db(session: Session) -> None:
    user = session.exec(
        select(User).where(User.email == settings.FIRST_SUPERUSER)
    ).first()
    if not user:
        user_in = UserCreate(
            email=settings.FIRST_SUPERUSER,
            password=settings.FIRST_SUPERUSER_PASSWORD,
            is_superuser=True,
        )
        user = crud.create_user(session=session, user_create=user_in)

    area = session.exec(select(Area).where(Area.name == "Fusion Hotel Group")).first()
    if not area:
        area = Area(name="Fusion Hotel Group", description="Main hotel area")
        session.add(area)
        session.commit()
        session.refresh(area)

    for room_name, capacity, sort_order in [
        ("Glass Room (10)", 10, 1),
        ("Board Room (20)", 20, 2),
    ]:
        room = session.exec(select(Room).where(Room.name == room_name)).first()
        if not room:
            session.add(
                Room(
                    name=room_name,
                    capacity=capacity,
                    sort_order=sort_order,
                    area_id=area.id,
                )
            )
    session.commit()

    if settings.ENVIRONMENT == "local":
        _seed_sample_bookings(session, user)
    else:
        _remove_sample_bookings(session)


def _seed_sample_bookings(session: Session, user: User) -> None:
    rooms_by_name = {room.name: room for room in session.exec(select(Room)).all()}
    today = hotel_today()

    for title, room_name, sh, sm, eh, em in SAMPLE_BOOKINGS:
        room = rooms_by_name.get(room_name)
        if not room:
            continue
        existing = session.exec(select(Booking).where(Booking.title == title)).first()
        start_time = combine_hotel(today, sh, sm)
        end_time = combine_hotel(today, eh, em)
        if existing:
            existing.start_time = start_time
            existing.end_time = end_time
            existing.room_id = room.id
            existing.status = BookingStatus.CONFIRMED
            session.add(existing)
        else:
            session.add(
                Booking(
                    title=title,
                    room_id=room.id,
                    created_by_id=user.id,
                    start_time=start_time,
                    end_time=end_time,
                    booking_type=BookingType.INTERNAL,
                )
            )
    session.commit()


def _remove_sample_bookings(session: Session) -> None:
    """Cancel leftover demo bookings so they do not clutter production schedules."""
    seeds = session.exec(
        select(Booking).where(Booking.title.in_(list(SAMPLE_BOOKING_TITLES)))
    ).all()
    changed = False
    for booking in seeds:
        if booking.status != BookingStatus.CANCELLED:
            booking.status = BookingStatus.CANCELLED
            session.add(booking)
            changed = True
    if changed:
        session.commit()
