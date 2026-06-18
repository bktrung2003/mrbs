from sqlmodel import Session, create_engine, select

from app import crud
from app.core.config import settings
from app.core.timezone_util import combine_hotel, hotel_today
from app.models import (
    Area,
    Booking,
    BookingType,
    Room,
    User,
    UserCreate,
)

engine = create_engine(str(settings.SQLALCHEMY_DATABASE_URI))

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

    rooms_by_name = {room.name: room for room in session.exec(select(Room)).all()}
    today = hotel_today()

    for title, room_name, sh, sm, eh, em in SAMPLE_BOOKINGS:
        room = rooms_by_name[room_name]
        existing = session.exec(select(Booking).where(Booking.title == title)).first()
        start_time = combine_hotel(today, sh, sm)
        end_time = combine_hotel(today, eh, em)
        if existing:
            existing.start_time = start_time
            existing.end_time = end_time
            existing.room_id = room.id
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
