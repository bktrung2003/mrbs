import secrets
import uuid
from datetime import date, datetime, timezone

from pydantic import EmailStr
from sqlalchemy import Column, DateTime, LargeBinary
from sqlmodel import Field, Relationship, SQLModel


def get_datetime_utc() -> datetime:
    return datetime.now(timezone.utc)


# Shared properties
class UserBase(SQLModel):
    email: EmailStr = Field(unique=True, index=True, max_length=255)
    is_active: bool = True
    is_superuser: bool = False
    is_booking_approver: bool = False
    full_name: str | None = Field(default=None, max_length=255)


# Properties to receive via API on creation
class UserCreate(UserBase):
    password: str = Field(min_length=8, max_length=128)


class UserRegister(SQLModel):
    email: EmailStr = Field(max_length=255)
    password: str = Field(min_length=8, max_length=128)
    full_name: str | None = Field(default=None, max_length=255)


# Properties to receive via API on update, all are optional
class UserUpdate(UserBase):
    email: EmailStr | None = Field(default=None, max_length=255)  # type: ignore[assignment]
    password: str | None = Field(default=None, min_length=8, max_length=128)


class UserUpdateMe(SQLModel):
    full_name: str | None = Field(default=None, max_length=255)
    email: EmailStr | None = Field(default=None, max_length=255)


class UpdatePassword(SQLModel):
    current_password: str = Field(min_length=8, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)


# Database model, database table inferred from class name
class User(UserBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    hashed_password: str
    created_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )
    items: list["Item"] = Relationship(back_populates="owner", cascade_delete=True)
    bookings: list["Booking"] = Relationship(
        back_populates="created_by",
        sa_relationship_kwargs={"foreign_keys": "[Booking.created_by_id]"},
    )


# Properties to return via API, id is always required
class UserPublic(UserBase):
    id: uuid.UUID
    created_at: datetime | None = None


class UsersPublic(SQLModel):
    data: list[UserPublic]
    count: int


# Shared properties
class ItemBase(SQLModel):
    title: str = Field(min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=255)


# Properties to receive on item creation
class ItemCreate(ItemBase):
    pass


# Properties to receive on item update
class ItemUpdate(ItemBase):
    title: str | None = Field(default=None, min_length=1, max_length=255)  # type: ignore[assignment]


# Database model, database table inferred from class name
class Item(ItemBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )
    owner_id: uuid.UUID = Field(
        foreign_key="user.id", nullable=False, ondelete="CASCADE"
    )
    owner: User | None = Relationship(back_populates="items")


# Properties to return via API, id is always required
class ItemPublic(ItemBase):
    id: uuid.UUID
    owner_id: uuid.UUID
    created_at: datetime | None = None


class ItemsPublic(SQLModel):
    data: list[ItemPublic]
    count: int


# Generic message
class Message(SQLModel):
    message: str


# JSON payload containing access token
class Token(SQLModel):
    access_token: str
    token_type: str = "bearer"


# Contents of JWT token
class TokenPayload(SQLModel):
    sub: str | None = None


class NewPassword(SQLModel):
    token: str
    new_password: str = Field(min_length=8, max_length=128)


# --- MRBS models ---


class BookingType(str):
    INTERNAL = "internal"
    EXTERNAL = "external"


class BookingStatus(str):
    CONFIRMED = "confirmed"
    CANCELLED = "cancelled"


class ConfirmationStatus(str):
    TENTATIVE = "tentative"
    CONFIRMED = "confirmed"


class ApprovalStatus(str):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class RepeatType(str):
    NONE = "none"
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    YEARLY = "yearly"


class AreaBase(SQLModel):
    name: str = Field(min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=500)


class AreaCreate(AreaBase):
    pass


class AreaUpdate(SQLModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=500)


class Area(AreaBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )
    rooms: list["Room"] = Relationship(back_populates="area", cascade_delete=True)


class AreaPublic(AreaBase):
    id: uuid.UUID
    created_at: datetime | None = None


class AreasPublic(SQLModel):
    data: list[AreaPublic]
    count: int


class RoomBase(SQLModel):
    name: str = Field(min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=500)
    capacity: int = Field(default=10, ge=1, le=500)
    notification_emails: str | None = Field(default=None, max_length=1000)
    invalid_booking_types: str | None = Field(default=None, max_length=100)
    sort_order: int = Field(default=0)
    is_active: bool = True


class RoomCreate(RoomBase):
    area_id: uuid.UUID


class RoomUpdate(SQLModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=500)
    capacity: int | None = Field(default=None, ge=1, le=500)
    notification_emails: str | None = Field(default=None, max_length=1000)
    invalid_booking_types: str | None = Field(default=None, max_length=100)
    sort_order: int | None = None
    is_active: bool | None = None
    area_id: uuid.UUID | None = None


class Room(RoomBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    area_id: uuid.UUID = Field(
        foreign_key="area.id", nullable=False, ondelete="CASCADE"
    )
    created_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )
    area: Area | None = Relationship(back_populates="rooms")
    bookings: list["Booking"] = Relationship(back_populates="room", cascade_delete=True)


class RoomPublic(RoomBase):
    id: uuid.UUID
    area_id: uuid.UUID
    created_at: datetime | None = None


class RoomsPublic(SQLModel):
    data: list[RoomPublic]
    count: int


class ScheduleRoomPublic(SQLModel):
    id: uuid.UUID
    name: str
    capacity: int
    area_id: uuid.UUID
    sort_order: int
    is_active: bool = True


class ScheduleRoomsPublic(SQLModel):
    data: list[ScheduleRoomPublic]
    count: int


class ScheduleBookingPublic(SQLModel):
    id: uuid.UUID
    room_id: uuid.UUID
    title: str
    start_time: datetime
    end_time: datetime
    booking_type: str
    confirmation_status: str
    is_all_day: bool = False
    approval_status: str = "approved"
    room_name: str | None = None
    area_name: str | None = None


class ScheduleBookingsPublic(SQLModel):
    data: list[ScheduleBookingPublic]
    count: int


class BookingBase(SQLModel):
    title: str = Field(min_length=1, max_length=255)
    start_time: datetime
    end_time: datetime
    booking_type: str = Field(default=BookingType.INTERNAL, max_length=20)
    full_description: str | None = Field(default=None, max_length=5000)
    confirmation_status: str = Field(
        default=ConfirmationStatus.CONFIRMED, max_length=20
    )
    is_all_day: bool = False
    repeat_type: str = Field(default=RepeatType.NONE, max_length=20)
    allow_registration: bool = False
    event_capacity: int | None = Field(default=None, ge=1)
    registration_opens_value: int | None = Field(default=None, ge=0)
    registration_opens_unit: str | None = Field(default=None, max_length=20)
    registration_closes_value: int | None = Field(default=None, ge=0)
    registration_closes_unit: str | None = Field(default=None, max_length=20)
    check_in_lead_minutes: int = Field(default=30, ge=0, le=1440)
    enable_post_event_survey: bool = False


class BookingCreate(BookingBase):
    room_ids: list[uuid.UUID] = Field(min_length=1)
    created_by_id: uuid.UUID | None = None
    repeat_until: date | None = None


class BookingReject(SQLModel):
    reason: str | None = Field(default=None, max_length=500)


class BookingUpdate(SQLModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    start_time: datetime | None = None
    end_time: datetime | None = None
    booking_type: str | None = Field(default=None, max_length=20)
    full_description: str | None = Field(default=None, max_length=5000)
    room_id: uuid.UUID | None = None
    status: str | None = Field(default=None, max_length=20)
    created_by_id: uuid.UUID | None = None
    confirmation_status: str | None = Field(default=None, max_length=20)
    is_all_day: bool | None = None
    repeat_type: str | None = Field(default=None, max_length=20)
    allow_registration: bool | None = None
    event_capacity: int | None = Field(default=None, ge=1)
    registration_opens_value: int | None = Field(default=None, ge=0)
    registration_opens_unit: str | None = Field(default=None, max_length=20)
    registration_closes_value: int | None = Field(default=None, ge=0)
    registration_closes_unit: str | None = Field(default=None, max_length=20)
    check_in_lead_minutes: int = Field(default=30, ge=0, le=1440)
    enable_post_event_survey: bool | None = None
    approval_status: str | None = Field(default=None, max_length=20)


class Booking(BookingBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    room_id: uuid.UUID = Field(
        foreign_key="room.id", nullable=False, ondelete="CASCADE"
    )
    created_by_id: uuid.UUID = Field(
        foreign_key="user.id", nullable=False, ondelete="CASCADE"
    )
    status: str = Field(default=BookingStatus.CONFIRMED, max_length=20)
    approval_status: str = Field(default=ApprovalStatus.PENDING, max_length=20)
    rejection_reason: str | None = Field(default=None, max_length=500)
    approved_by_id: uuid.UUID | None = Field(
        default=None, foreign_key="user.id", ondelete="SET NULL"
    )
    approved_at: datetime | None = Field(
        default=None, sa_type=DateTime(timezone=True)  # type: ignore
    )
    reminder_sent_at: datetime | None = Field(
        default=None, sa_type=DateTime(timezone=True)  # type: ignore
    )
    registration_public_token: str | None = Field(
        default=None, max_length=64, unique=True, index=True
    )
    registration_public_slug: str | None = Field(
        default=None, max_length=120, unique=True, index=True
    )
    created_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )
    room: Room | None = Relationship(back_populates="bookings")
    registrations: list["BookingRegistration"] = Relationship(
        back_populates="booking", cascade_delete=True
    )
    created_by: User | None = Relationship(
        back_populates="bookings",
        sa_relationship_kwargs={"foreign_keys": "[Booking.created_by_id]"},
    )
    approved_by: User | None = Relationship(
        sa_relationship_kwargs={"foreign_keys": "[Booking.approved_by_id]"},
    )


class BookingPublic(BookingBase):
    id: uuid.UUID
    room_id: uuid.UUID
    created_by_id: uuid.UUID
    status: str
    approval_status: str
    rejection_reason: str | None = None
    approved_at: datetime | None = None
    created_at: datetime | None = None
    created_by_name: str | None = None
    created_by_email: str | None = None
    room_name: str | None = None
    area_name: str | None = None
    registration_count: int | None = None
    spots_remaining: int | None = None
    registration_is_open: bool | None = None
    registration_public_token: str | None = None
    registration_public_slug: str | None = None
    attended_count: int | None = None
    feedback_count: int | None = None
    average_feedback_rating: float | None = None


class BookingsPublic(SQLModel):
    data: list[BookingPublic]
    count: int


# --- Event registration ---


class RegistrationStatus(str):
    CONFIRMED = "confirmed"
    CANCELLED = "cancelled"


class BookingRegistrationCreate(SQLModel):
    attendee_name: str = Field(min_length=1, max_length=255)
    attendee_email: EmailStr = Field(max_length=255)
    attendee_phone: str | None = Field(default=None, max_length=32)
    department: str | None = Field(default=None, max_length=255)


class BookingRegistration(BookingRegistrationCreate, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    booking_id: uuid.UUID = Field(
        foreign_key="booking.id", nullable=False, ondelete="CASCADE", index=True
    )
    user_id: uuid.UUID | None = Field(
        default=None, foreign_key="user.id", ondelete="SET NULL"
    )
    status: str = Field(default=RegistrationStatus.CONFIRMED, max_length=20)
    confirmation_token: str = Field(
        default_factory=lambda: secrets.token_urlsafe(32),
        max_length=64,
        unique=True,
        index=True,
    )
    registered_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )
    cancelled_at: datetime | None = Field(
        default=None, sa_type=DateTime(timezone=True)  # type: ignore
    )
    attended: bool | None = Field(default=None)
    attended_at: datetime | None = Field(
        default=None, sa_type=DateTime(timezone=True)  # type: ignore
    )
    attended_via: str | None = Field(default=None, max_length=20)
    feedback_rating: int | None = Field(default=None)
    feedback_comment: str | None = Field(default=None, max_length=2000)
    feedback_submitted_at: datetime | None = Field(
        default=None, sa_type=DateTime(timezone=True)  # type: ignore
    )
    survey_content_rating: int | None = Field(default=None)
    survey_trainer_rating: int | None = Field(default=None)
    survey_organization_rating: int | None = Field(default=None)
    survey_liked: str | None = Field(default=None, max_length=2000)
    survey_improve: str | None = Field(default=None, max_length=2000)
    booking: Booking | None = Relationship(back_populates="registrations")


class BookingRegistrationPublic(SQLModel):
    id: uuid.UUID
    booking_id: uuid.UUID
    attendee_name: str
    attendee_email: EmailStr
    attendee_phone: str | None = None
    department: str | None = None
    status: str
    confirmation_token: str | None = None
    registered_at: datetime | None = None
    cancelled_at: datetime | None = None
    attended: bool | None = None
    attended_at: datetime | None = None
    attended_via: str | None = None
    feedback_rating: int | None = None
    feedback_comment: str | None = None
    feedback_submitted_at: datetime | None = None
    survey_content_rating: int | None = None
    survey_trainer_rating: int | None = None
    survey_organization_rating: int | None = None
    survey_liked: str | None = None
    survey_improve: str | None = None


class BookingRegistrationAttendanceUpdate(SQLModel):
    attended: bool | None = None


class EventSurveySubmit(SQLModel):
    content_rating: int = Field(ge=1, le=5)
    trainer_rating: int = Field(ge=1, le=5)
    organization_rating: int = Field(ge=1, le=5)
    liked: str | None = Field(default=None, max_length=2000)
    improve: str | None = Field(default=None, max_length=2000)


class EventSurveyByContact(EventSurveySubmit):
    contact: str = Field(min_length=3, max_length=255)


class EventSurveyResult(SQLModel):
    attendee_name: str
    message: str


class BookingRegistrationFeedbackCreate(SQLModel):
    rating: int = Field(ge=1, le=5)
    comment: str | None = Field(default=None, max_length=2000)


class RegistrationListSummary(SQLModel):
    confirmed_count: int
    attended_count: int
    absent_count: int
    unmarked_count: int
    feedback_count: int
    average_feedback_rating: float | None = None
    survey_count: int = 0
    average_content_rating: float | None = None
    average_trainer_rating: float | None = None
    average_organization_rating: float | None = None


class BookingRegistrationsPublic(SQLModel):
    data: list[BookingRegistrationPublic]
    count: int
    summary: RegistrationListSummary | None = None
    registration_public_slug: str | None = None
    registration_public_token: str | None = None
    approval_status: str | None = None
    check_in_lead_minutes: int | None = None
    event_title: str | None = None
    event_start_time: datetime | None = None
    event_end_time: datetime | None = None
    room_name: str | None = None
    area_name: str | None = None
    enable_post_event_survey: bool | None = None


class PublicRegistrationDetail(BookingRegistrationPublic):
    event_title: str
    event_start_time: datetime
    event_end_time: datetime
    can_check_in: bool = False
    can_submit_feedback: bool = False
    enable_post_event_survey: bool = False


class PublicEventPublic(SQLModel):
    title: str
    full_description: str | None = None
    start_time: datetime
    end_time: datetime
    room_name: str | None = None
    area_name: str | None = None
    event_capacity: int | None = None
    registration_count: int
    spots_remaining: int | None = None
    registration_is_open: bool
    registration_opens_at: datetime | None = None
    registration_closes_at: datetime | None = None
    check_in_open: bool = False
    check_in_lead_minutes: int = 30
    public_slug: str | None = None
    enable_post_event_survey: bool = False
    survey_open: bool = False
    company_name: str
    system_name: str
    logo_color_url: str


class PublicRegistrationResult(SQLModel):
    registration: BookingRegistrationPublic
    message: str


class EventCheckInByEmail(SQLModel):
    contact: str = Field(min_length=3, max_length=255)


class EventCheckInResult(SQLModel):
    attendee_name: str
    message: str
    confirmation_token: str | None = None
    already_checked_in: bool = False


# --- App branding (singleton row id=1) ---


class BrandingSettingsBase(SQLModel):
    company_name: str = Field(default="Fusion Hotel Group", max_length=255)
    system_name: str = Field(
        default="Meeting Room Booking System", max_length=255
    )
    logo_color_url: str = Field(
        default="/assets/images/fusion-logo-color.png", max_length=500
    )
    logo_white_url: str = Field(
        default="/assets/images/fusion-logo-white.png", max_length=500
    )
    header_color: str = Field(default="#D97706", max_length=20)


class BrandingSettingsUpdate(SQLModel):
    company_name: str | None = Field(default=None, max_length=255)
    system_name: str | None = Field(default=None, max_length=255)
    logo_color_url: str | None = Field(default=None, max_length=500)
    logo_white_url: str | None = Field(default=None, max_length=500)
    header_color: str | None = Field(default=None, max_length=20)


class BrandingSettings(BrandingSettingsBase, table=True):
    id: int = Field(default=1, primary_key=True)
    logo_color_data: bytes | None = Field(
        default=None, sa_column=Column(LargeBinary, nullable=True)
    )
    logo_white_data: bytes | None = Field(
        default=None, sa_column=Column(LargeBinary, nullable=True)
    )
    logo_version: int = Field(default=0)


class BrandingSettingsPublic(BrandingSettingsBase):
    id: int
