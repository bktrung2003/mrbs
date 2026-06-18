import type { ColumnDef } from "@tanstack/react-table"
import { Pencil, Trash2 } from "lucide-react"

import { StatusBadge } from "@/components/mrbs/mrbs-filter-ui"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import type { Room } from "@/lib/mrbs-api"

export type RoomRow = Room & {
  onToggleActive: (room: Room, active: boolean) => void
  onEdit: (room: Room) => void
  onDelete: (room: Room) => void
}

export function createRoomColumns(): ColumnDef<RoomRow>[] {
  return [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => (
        <span className="font-medium text-slate-800">{row.original.name}</span>
      ),
    },
    {
      accessorKey: "is_active",
      header: "Enabled",
      cell: ({ row }) => (
        <Checkbox
          checked={row.original.is_active}
          onCheckedChange={(v) =>
            row.original.onToggleActive(row.original, Boolean(v))
          }
          aria-label={`Toggle ${row.original.name}`}
        />
      ),
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => (
        <span className="text-slate-500">
          {row.original.description || "—"}
        </span>
      ),
    },
    {
      accessorKey: "capacity",
      header: "Capacity",
      cell: ({ row }) => row.original.capacity,
    },
    {
      accessorKey: "notification_emails",
      header: "Notification emails",
      cell: ({ row }) => (
        <span className="max-w-[200px] truncate text-xs text-slate-500">
          {row.original.notification_emails || "—"}
        </span>
      ),
    },
    {
      accessorKey: "invalid_booking_types",
      header: "Invalid types",
      cell: ({ row }) => {
        const types = row.original.invalid_booking_types
        if (!types) return "—"
        return (
          <div className="flex flex-wrap gap-1">
            {types.split(",").map((t) => (
              <StatusBadge key={t} tone="slate">
                {t.trim()}
              </StatusBadge>
            ))}
          </div>
        )
      },
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className="flex justify-end gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-slate-600 hover:text-[#E8872E]"
            onClick={() => row.original.onEdit(row.original)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-red-600 hover:bg-red-50 hover:text-red-700"
            onClick={() => row.original.onDelete(row.original)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ]
}
