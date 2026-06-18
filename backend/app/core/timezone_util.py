from datetime import date, datetime, time
from zoneinfo import ZoneInfo

from app.core.config import settings


def get_tz() -> ZoneInfo:
    return ZoneInfo(settings.TIMEZONE)


def hotel_now() -> datetime:
    return datetime.now(get_tz())


def hotel_today() -> date:
    return hotel_now().date()


def day_bounds(d: date) -> tuple[datetime, datetime]:
    tz = get_tz()
    start = datetime.combine(d, time.min, tzinfo=tz)
    end = datetime.combine(d, time.max, tzinfo=tz)
    return start, end


def combine_hotel(d: date, hour: int, minute: int) -> datetime:
    return datetime.combine(d, time(hour, minute), tzinfo=get_tz())
