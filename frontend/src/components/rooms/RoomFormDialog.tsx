import { useEffect } from "react"
import { useForm } from "react-hook-form"

import { fusionBtnPrimary } from "@/components/mrbs/fusion-brand"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { Area, Room } from "@/lib/mrbs-api"

export type RoomFormValues = {
  name: string
  description: string
  capacity: number
  notification_emails: string
  invalid_external: boolean
  invalid_internal: boolean
  is_active: boolean
  area_id: string
}

type RoomFormDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  areas: Area[]
  room?: Room | null
  defaultAreaId?: string
  onSubmit: (values: RoomFormValues) => Promise<void>
}

function roomToForm(room: Room): RoomFormValues {
  const types = (room.invalid_booking_types ?? "")
    .split(",")
    .map((t) => t.trim().toLowerCase())
  return {
    name: room.name,
    description: room.description ?? "",
    capacity: room.capacity,
    notification_emails: room.notification_emails ?? "",
    invalid_external: types.includes("external"),
    invalid_internal: types.includes("internal"),
    is_active: room.is_active,
    area_id: room.area_id,
  }
}

export function roomFormToPayload(values: RoomFormValues) {
  const invalid: string[] = []
  if (values.invalid_external) invalid.push("external")
  if (values.invalid_internal) invalid.push("internal")
  return {
    name: values.name,
    description: values.description || undefined,
    capacity: values.capacity,
    notification_emails: values.notification_emails || undefined,
    invalid_booking_types: invalid.length ? invalid.join(",") : undefined,
    is_active: values.is_active,
    area_id: values.area_id,
  }
}

export function RoomFormDialog({
  open,
  onOpenChange,
  areas,
  room,
  defaultAreaId,
  onSubmit,
}: RoomFormDialogProps) {
  const { register, handleSubmit, setValue, watch, reset } =
    useForm<RoomFormValues>({
      defaultValues: {
        name: "",
        description: "",
        capacity: 10,
        notification_emails: "",
        invalid_external: false,
        invalid_internal: false,
        is_active: true,
        area_id: defaultAreaId ?? "",
      },
    })

  useEffect(() => {
    if (!open) return
    if (room) {
      reset(roomToForm(room))
    } else {
      reset({
        name: "",
        description: "",
        capacity: 10,
        notification_emails: "",
        invalid_external: false,
        invalid_internal: false,
        is_active: true,
        area_id: defaultAreaId ?? areas[0]?.id ?? "",
      })
    }
  }, [open, room, defaultAreaId, areas, reset])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-[#E8872E]">
            {room ? "Edit Room" : "Add Room"}
          </DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={handleSubmit(async (values) => {
            await onSubmit(values)
            onOpenChange(false)
          })}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="room-name">Name</Label>
              <Input id="room-name" {...register("name", { required: true })} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="room-desc">Description</Label>
              <Input id="room-desc" {...register("description")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="room-cap">Capacity</Label>
              <Input
                id="room-cap"
                type="number"
                min={1}
                {...register("capacity", { valueAsNumber: true, required: true })}
              />
            </div>
            <div className="space-y-2">
              <Label>Area</Label>
              <Select
                value={watch("area_id")}
                onValueChange={(v) => setValue("area_id", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {areas.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="room-emails">Notification emails</Label>
              <Input
                id="room-emails"
                placeholder="email1@hotel.com, email2@hotel.com"
                {...register("notification_emails")}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Invalid booking types</Label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={watch("invalid_internal")}
                    onCheckedChange={(v) => setValue("invalid_internal", Boolean(v))}
                  />
                  Internal
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={watch("invalid_external")}
                    onCheckedChange={(v) => setValue("invalid_external", Boolean(v))}
                  />
                  External
                </label>
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <Checkbox
                checked={watch("is_active")}
                onCheckedChange={(v) => setValue("is_active", Boolean(v))}
              />
              Enabled
            </label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className={fusionBtnPrimary}>
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
