import calendar
from datetime import date, datetime, timedelta

from app.models import RepeatType

MAX_REPEAT_OCCURRENCES = 366


def _add_months(d: date, months: int) -> date:
    month_index = d.month - 1 + months
    year = d.year + month_index // 12
    month = month_index % 12 + 1
    day = min(d.day, calendar.monthrange(year, month)[1])
    return date(year, month, day)


def _next_occurrence_start(current: datetime, repeat_type: str) -> datetime:
    if repeat_type == RepeatType.DAILY:
        return current + timedelta(days=1)
    if repeat_type == RepeatType.WEEKLY:
        return current + timedelta(weeks=1)
    if repeat_type == RepeatType.MONTHLY:
        next_date = _add_months(current.date(), 1)
        return current.replace(
            year=next_date.year, month=next_date.month, day=next_date.day
        )
    if repeat_type == RepeatType.YEARLY:
        try:
            return current.replace(year=current.year + 1)
        except ValueError:
            return current.replace(year=current.year + 1, day=28)
    return current


def expand_repeat_occurrences(
    start_time: datetime,
    end_time: datetime,
    repeat_type: str,
    repeat_until: date | None,
) -> list[tuple[datetime, datetime]]:
    duration = end_time - start_time
    if repeat_type == RepeatType.NONE or not repeat_until:
        return [(start_time, end_time)]

    if repeat_until < start_time.date():
        return []

    occurrences: list[tuple[datetime, datetime]] = []
    current_start = start_time

    while (
        current_start.date() <= repeat_until
        and len(occurrences) < MAX_REPEAT_OCCURRENCES
    ):
        occurrences.append((current_start, current_start + duration))
        next_start = _next_occurrence_start(current_start, repeat_type)
        if next_start <= current_start:
            break
        current_start = next_start

    return occurrences


def count_repeat_occurrences(
    start_time: datetime,
    end_time: datetime,
    repeat_type: str,
    repeat_until: date | None,
) -> int:
    return len(
        expand_repeat_occurrences(start_time, end_time, repeat_type, repeat_until)
    )
