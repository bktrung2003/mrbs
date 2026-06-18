import { useRef, useState } from "react"

import {
  bookingTitleWithCreator,
  formatTimeLabel,
  minutesFromMidnight,
  moveBookingToSlot,
  parseDateInputValue,
  previewStyleFromMinutes,
  resizeBookingEndTime,
  SLOT_HEIGHT_PX,
  toDateInputValue,
} from "@/components/mrbs/schedule-utils"
import { scheduleTheme as theme } from "@/components/mrbs/schedule-theme"
import type { Booking } from "@/lib/mrbs-api"

const DRAG_THRESHOLD_PX = 4

export type BookingReschedulePayload = {
  start_time: string
  end_time: string
  room_id?: string
}

type DropTargetKind = "room" | "day"

type DraggableScheduleBookingBlockProps = {
  booking: Booking
  style: { top: string; height: string }
  anchorDay: Date
  canEdit?: boolean
  dropTargetKind?: DropTargetKind
  showRoom?: boolean
  onClick: () => void
  onReschedule?: (
    booking: Booking,
    payload: BookingReschedulePayload,
  ) => void | Promise<void>
  onDropTargetChange?: (targetId: string | null) => void
}

type DragState = {
  mode: "move" | "resize"
  pointerId: number
  startClientY: number
  startClientX: number
  slotDelta: number
  previewStart: number
  previewEnd: number
  targetRoomId: string
  targetDayKey: string
  moved: boolean
}

function findDropTarget(
  clientX: number,
  clientY: number,
  kind: DropTargetKind,
): string | null {
  const elements = document.elementsFromPoint(clientX, clientY)
  for (const el of elements) {
    if (!(el instanceof Element)) continue
    if (kind === "room") {
      const node = el.closest("[data-schedule-room-id]")
      if (node) return node.getAttribute("data-schedule-room-id")
    } else {
      const node = el.closest("[data-schedule-day]")
      if (node) return node.getAttribute("data-schedule-day")
    }
  }
  return null
}

export function DraggableScheduleBookingBlock({
  booking,
  style,
  anchorDay,
  canEdit = false,
  dropTargetKind = "room",
  showRoom = false,
  onClick,
  onReschedule,
  onDropTargetChange,
}: DraggableScheduleBookingBlockProps) {
  const [drag, setDrag] = useState<DragState | null>(null)
  const bookingRef = useRef(booking)
  const onClickRef = useRef(onClick)
  const onRescheduleRef = useRef(onReschedule)
  const onDropTargetChangeRef = useRef(onDropTargetChange)
  bookingRef.current = booking
  onClickRef.current = onClick
  onRescheduleRef.current = onReschedule
  onDropTargetChangeRef.current = onDropTargetChange

  const isExternal = booking.booking_type === "external"
  const palette = isExternal ? theme.booking.external : theme.booking.internal

  const displayStyle =
    drag != null
      ? previewStyleFromMinutes(drag.previewStart, drag.previewEnd)
      : style
  const blockHeight = Number.parseFloat(displayStyle.height)

  const previewTimes =
    drag == null
      ? { start_time: booking.start_time, end_time: booking.end_time }
      : drag.mode === "resize"
        ? resizeBookingEndTime(
            booking.start_time,
            booking.end_time,
            parseDateInputValue(drag.targetDayKey),
            drag.slotDelta,
          )
        : moveBookingToSlot(
            booking.start_time,
            booking.end_time,
            parseDateInputValue(drag.targetDayKey),
            drag.slotDelta,
          )

  const timeLabel = `${formatTimeLabel(previewTimes.start_time)} – ${formatTimeLabel(previewTimes.end_time)}`
  const displayTitle = bookingTitleWithCreator(
    booking.title,
    booking.created_by_name,
  )

  const beginDrag = (e: React.PointerEvent, mode: "move" | "resize") => {
    if (!canEdit || !onReschedule) return
    e.preventDefault()
    e.stopPropagation()
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)

    const b = bookingRef.current
    const bStart = minutesFromMidnight(b.start_time)
    const bEnd = minutesFromMidnight(b.end_time)

    let state: DragState = {
      mode,
      pointerId: e.pointerId,
      startClientY: e.clientY,
      startClientX: e.clientX,
      slotDelta: 0,
      previewStart: bStart,
      previewEnd: bEnd,
      targetRoomId: b.room_id,
      targetDayKey: toDateInputValue(anchorDay),
      moved: false,
    }

    const updatePreview = (slotDelta: number, targetDayKey: string) => {
      const targetDay = parseDateInputValue(targetDayKey)
      if (mode === "move") {
        const shifted = moveBookingToSlot(b.start_time, b.end_time, targetDay, slotDelta)
        return {
          previewStart: minutesFromMidnight(shifted.start_time),
          previewEnd: minutesFromMidnight(shifted.end_time),
        }
      }
      const resized = resizeBookingEndTime(b.start_time, b.end_time, targetDay, slotDelta)
      return {
        previewStart: minutesFromMidnight(resized.start_time),
        previewEnd: minutesFromMidnight(resized.end_time),
      }
    }

    const onMove = (ev: PointerEvent) => {
      if (ev.pointerId !== state.pointerId) return

      const deltaY = ev.clientY - state.startClientY
      const moved =
        state.moved ||
        Math.abs(deltaY) >= DRAG_THRESHOLD_PX ||
        Math.abs(ev.clientX - state.startClientX) >= DRAG_THRESHOLD_PX

      const slotDelta = Math.round(deltaY / SLOT_HEIGHT_PX)
      const dropId = findDropTarget(ev.clientX, ev.clientY, dropTargetKind)
      const targetRoomId =
        dropTargetKind === "room" ? (dropId ?? state.targetRoomId) : state.targetRoomId
      const targetDayKey =
        dropTargetKind === "day" ? (dropId ?? state.targetDayKey) : state.targetDayKey

      onDropTargetChangeRef.current?.(dropId)

      const preview = updatePreview(slotDelta, targetDayKey)
      state = {
        ...state,
        slotDelta,
        targetRoomId,
        targetDayKey,
        moved,
        ...preview,
      }
      setDrag({ ...state })
    }

    const finish = async (ev: PointerEvent) => {
      if (ev.pointerId !== state.pointerId) return
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerup", finish)
      window.removeEventListener("pointercancel", finish)
      onDropTargetChangeRef.current?.(null)
      setDrag(null)

      if (!state.moved) {
        onClickRef.current()
        return
      }

      const reschedule = onRescheduleRef.current
      if (!reschedule) return

      const targetDay = parseDateInputValue(state.targetDayKey)
      const payload =
        state.mode === "resize"
          ? resizeBookingEndTime(
              b.start_time,
              b.end_time,
              targetDay,
              state.slotDelta,
            )
          : moveBookingToSlot(b.start_time, b.end_time, targetDay, state.slotDelta)

      const body: BookingReschedulePayload = { ...payload }
      if (dropTargetKind === "room" && state.targetRoomId !== b.room_id) {
        body.room_id = state.targetRoomId
      }

      const unchanged =
        body.start_time === b.start_time &&
        body.end_time === b.end_time &&
        (body.room_id == null || body.room_id === b.room_id)

      if (!unchanged) {
        await reschedule(b, body)
      }
    }

    setDrag({ ...state })
    window.addEventListener("pointermove", onMove)
    window.addEventListener("pointerup", finish)
    window.addEventListener("pointercancel", finish)
  }

  return (
    <div
      className={`absolute left-0 right-0 z-10 touch-none ${
        drag ? "z-20 opacity-90 ring-2 ring-[#F59E42]/70" : ""
      }`}
      style={{
        top: displayStyle.top,
        height: displayStyle.height,
        minHeight: 24,
        pointerEvents: drag ? "none" : "auto",
      }}
    >
      <div
        role="button"
        tabIndex={0}
        className={`relative flex h-full flex-col overflow-hidden text-left ${palette.bg} ${palette.text} ${
          booking.confirmation_status === "tentative" ? theme.booking.tentative : ""
        } ${canEdit && onReschedule ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"}`}
        title={`${displayTitle} (${timeLabel})`}
        onPointerDown={(e) => beginDrag(e, "move")}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            onClick()
          }
        }}
      >
        <div className="flex min-h-0 flex-1 items-center justify-start overflow-hidden px-1.5">
          <div className="min-w-0 w-full text-left">
            <div className="truncate text-[11px] leading-tight font-semibold">
              {displayTitle}
            </div>
            {showRoom && booking.room_name && blockHeight >= 48 ? (
              <div className={`truncate text-[10px] leading-tight ${palette.sub}`}>
                {booking.room_name}
              </div>
            ) : null}
            <div className={`truncate text-[10px] leading-tight ${palette.sub}`}>
              {timeLabel}
            </div>
          </div>
        </div>
        {canEdit && onReschedule ? (
          <div
            className="absolute right-0 bottom-0 left-0 flex h-2.5 cursor-ns-resize items-end justify-center"
            onPointerDown={(e) => beginDrag(e, "resize")}
            aria-label="Resize booking"
          >
            <span className="mb-0.5 h-0.5 w-8 rounded-full bg-black/15" />
          </div>
        ) : null}
      </div>
    </div>
  )
}
