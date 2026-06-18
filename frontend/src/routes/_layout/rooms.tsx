import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute, redirect } from "@tanstack/react-router"
import { DoorOpen, Pencil, Plus, Search, Trash2 } from "lucide-react"
import { useMemo, useState } from "react"

import { DataTable } from "@/components/Common/DataTable"
import { MrbsHeader } from "@/components/mrbs/MrbsHeader"
import { fusionBtnPrimary } from "@/components/mrbs/fusion-brand"
import { FilterField, SectionTitle } from "@/components/mrbs/mrbs-filter-ui"
import { createRoomColumns } from "@/components/rooms/room-columns"
import {
  RoomFormDialog,
  roomFormToPayload,
  type RoomFormValues,
} from "@/components/rooms/RoomFormDialog"
import { scheduleTheme as theme } from "@/components/mrbs/schedule-theme"
import { Button } from "@/components/ui/button"
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
import useAuth from "@/hooks/useAuth"
import useCustomToast from "@/hooks/useCustomToast"
import type { Room } from "@/lib/mrbs-api"
import {
  createArea,
  createRoom,
  deleteArea,
  deleteRoom,
  fetchAreas,
  fetchRooms,
  updateArea,
  updateRoom,
} from "@/lib/mrbs-api"

export const Route = createFileRoute("/_layout/rooms")({
  component: RoomsPage,
  beforeLoad: async () => {
    const token = localStorage.getItem("access_token")
    if (!token) throw redirect({ to: "/login" })
    const user = await import("@/client").then((m) => m.UsersService.readUserMe())
    if (!user.is_superuser) throw redirect({ to: "/schedule" })
  },
  head: () => ({
    meta: [{ title: "Rooms - Fusion Hotel Group" }],
  }),
})

function RoomsPage() {
  const { user } = useAuth()
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const queryClient = useQueryClient()

  const [selectedAreaId, setSelectedAreaId] = useState<string>("")
  const [search, setSearch] = useState("")
  const [roomDialogOpen, setRoomDialogOpen] = useState(false)
  const [editingRoom, setEditingRoom] = useState<Room | null>(null)
  const [areaDialogOpen, setAreaDialogOpen] = useState(false)
  const [editingAreaName, setEditingAreaName] = useState("")
  const [newAreaName, setNewAreaName] = useState("")

  const { data: areasData } = useQuery({
    queryKey: ["areas"],
    queryFn: fetchAreas,
  })

  const areas = areasData?.data ?? []
  const activeAreaId = selectedAreaId || areas[0]?.id || ""

  const { data: roomsData, isLoading } = useQuery({
    queryKey: ["rooms", activeAreaId],
    queryFn: () => fetchRooms(activeAreaId || undefined),
    enabled: Boolean(activeAreaId),
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["rooms"] })
    queryClient.invalidateQueries({ queryKey: ["areas"] })
  }

  const createRoomMut = useMutation({
    mutationFn: createRoom,
    onSuccess: () => {
      showSuccessToast("Room added")
      invalidate()
    },
    onError: () => showErrorToast("Could not add room"),
  })

  const updateRoomMut = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Parameters<typeof updateRoom>[1] }) =>
      updateRoom(id, body),
    onSuccess: () => {
      showSuccessToast("Room updated")
      invalidate()
    },
    onError: () => showErrorToast("Could not update room"),
  })

  const deleteRoomMut = useMutation({
    mutationFn: deleteRoom,
    onSuccess: () => {
      showSuccessToast("Room deleted")
      invalidate()
    },
    onError: () => showErrorToast("Could not delete room"),
  })

  const createAreaMut = useMutation({
    mutationFn: createArea,
    onSuccess: (area) => {
      showSuccessToast("Area added")
      setSelectedAreaId(area.id)
      setNewAreaName("")
      invalidate()
    },
    onError: () => showErrorToast("Could not add area"),
  })

  const updateAreaMut = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      updateArea(id, { name }),
    onSuccess: () => {
      showSuccessToast("Area updated")
      setAreaDialogOpen(false)
      invalidate()
    },
    onError: () => showErrorToast("Could not update area"),
  })

  const deleteAreaMut = useMutation({
    mutationFn: deleteArea,
    onSuccess: () => {
      showSuccessToast("Area deleted")
      setSelectedAreaId("")
      invalidate()
    },
    onError: () => showErrorToast("Could not delete area — remove rooms first"),
  })

  const filteredRooms = useMemo(() => {
    const rooms = roomsData?.data ?? []
    const q = search.trim().toLowerCase()
    if (!q) return rooms
    return rooms.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        (r.description ?? "").toLowerCase().includes(q) ||
        (r.notification_emails ?? "").toLowerCase().includes(q),
    )
  }, [roomsData, search])

  const selectedArea = areas.find((a) => a.id === activeAreaId)
  const totalRooms = roomsData?.data?.length ?? 0

  const tableData = useMemo(
    () =>
      filteredRooms.map((room) => ({
        ...room,
        onToggleActive: (r: Room, active: boolean) => {
          updateRoomMut.mutate({ id: r.id, body: { is_active: active } })
        },
        onEdit: (r: Room) => {
          setEditingRoom(r)
          setRoomDialogOpen(true)
        },
        onDelete: (r: Room) => {
          if (window.confirm(`Delete room "${r.name}"?`)) {
            deleteRoomMut.mutate(r.id)
          }
        },
      })),
    [filteredRooms, updateRoomMut, deleteRoomMut],
  )

  const columns = useMemo(() => createRoomColumns(), [])

  const handleRoomSubmit = async (values: RoomFormValues) => {
    const body = roomFormToPayload(values)
    if (editingRoom) {
      await updateRoomMut.mutateAsync({ id: editingRoom.id, body })
    } else {
      await createRoomMut.mutateAsync(body)
    }
    setEditingRoom(null)
  }

  if (!user?.is_superuser) return null

  return (
    <div className={`flex h-screen flex-col overflow-hidden ${theme.pageBg}`}>
      <MrbsHeader />

      <div className="flex min-h-0 flex-1 flex-col gap-3 px-3 py-3 lg:px-4 lg:py-4">
        <div className={`${theme.card} shrink-0 px-4 py-3`}>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FEF3E8]">
                <DoorOpen className="h-4 w-4 text-[#E8872E]" />
              </div>
              <div>
                <h1 className="text-base font-bold text-slate-900">Rooms</h1>
                <p className="text-xs text-slate-500">
                  {areas.length} area{areas.length === 1 ? "" : "s"}
                  {activeAreaId
                    ? ` · ${totalRooms} room${totalRooms === 1 ? "" : "s"} in ${selectedArea?.name ?? "…"}`
                    : ""}
                </p>
              </div>
            </div>
            {activeAreaId ? (
              <Button
                type="button"
                className={`${fusionBtnPrimary} h-9 gap-2 px-5`}
                onClick={() => {
                  setEditingRoom(null)
                  setRoomDialogOpen(true)
                }}
              >
                <Plus className="h-4 w-4" />
                Add room
              </Button>
            ) : null}
          </div>

          <div className="grid grid-cols-1 gap-x-3 gap-y-2 sm:grid-cols-2 lg:grid-cols-4">
            <FilterField label="Area" className="sm:col-span-2">
              <div className="flex gap-1.5">
                <Select value={activeAreaId} onValueChange={setSelectedAreaId}>
                  <SelectTrigger className="h-8 flex-1 border-slate-200 text-xs">
                    <SelectValue placeholder="Select area" />
                  </SelectTrigger>
                  <SelectContent>
                    {areas.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 shrink-0 border-slate-200"
                  disabled={!activeAreaId}
                  onClick={() => {
                    setEditingAreaName(selectedArea?.name ?? "")
                    setAreaDialogOpen(true)
                  }}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 shrink-0 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                  disabled={!activeAreaId}
                  onClick={() => {
                    if (
                      window.confirm(
                        `Delete area "${selectedArea?.name}" and all its rooms?`,
                      )
                    ) {
                      deleteAreaMut.mutate(activeAreaId)
                    }
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </FilterField>

            <FilterField label="Search rooms">
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Name, description, email…"
                  className="h-8 border-slate-200 pl-8 text-xs"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  disabled={!activeAreaId}
                />
              </div>
            </FilterField>

            <FilterField label="New area">
              <div className="flex gap-1.5">
                <Input
                  placeholder="Area name"
                  className="h-8 border-slate-200 text-xs"
                  value={newAreaName}
                  onChange={(e) => setNewAreaName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newAreaName.trim()) {
                      e.preventDefault()
                      createAreaMut.mutate({ name: newAreaName.trim() })
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="h-8 shrink-0 border-slate-200 px-3 text-xs"
                  disabled={!newAreaName.trim() || createAreaMut.isPending}
                  onClick={() =>
                    createAreaMut.mutate({ name: newAreaName.trim() })
                  }
                >
                  Add
                </Button>
              </div>
            </FilterField>
          </div>

          {activeAreaId ? (
            <div className="mt-2 border-t border-slate-100 pt-2">
              <SectionTitle>
                Showing {filteredRooms.length} of {totalRooms} in{" "}
                {selectedArea?.name ?? "…"}
              </SectionTitle>
            </div>
          ) : null}
        </div>

        <section
          className={`${theme.card} flex min-h-0 flex-1 flex-col overflow-hidden`}
        >
          {!activeAreaId ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
              <div className="rounded-full bg-[#FEF3E8] p-4">
                <DoorOpen className="h-8 w-8 text-[#E8872E]" />
              </div>
              <p className="font-medium text-slate-700">No areas yet</p>
              <p className="max-w-sm text-sm text-slate-500">
                Create an area above to start adding meeting rooms.
              </p>
            </div>
          ) : isLoading ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-stone-200 border-t-[#F59E42]" />
              <p className="text-sm text-slate-500">Loading rooms…</p>
            </div>
          ) : tableData.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
              <div className="rounded-full bg-slate-100 p-4">
                <DoorOpen className="h-8 w-8 text-slate-400" />
              </div>
              <p className="font-medium text-slate-700">
                {search.trim() ? "No matching rooms" : "No rooms in this area"}
              </p>
              <p className="max-w-sm text-sm text-slate-500">
                {search.trim()
                  ? "Try a different search term."
                  : 'Click "Add room" to create the first one.'}
              </p>
              {!search.trim() ? (
                <Button
                  type="button"
                  className={`${fusionBtnPrimary} mt-1 gap-2`}
                  onClick={() => {
                    setEditingRoom(null)
                    setRoomDialogOpen(true)
                  }}
                >
                  <Plus className="h-4 w-4" />
                  Add room
                </Button>
              ) : null}
            </div>
          ) : (
            <>
              <div className="shrink-0 border-b border-slate-100 px-4 py-3">
                <p className="text-sm font-medium text-slate-800">
                  {selectedArea?.name}
                </p>
              </div>
              <div className="min-h-0 flex-1 overflow-auto p-4">
                <DataTable columns={columns} data={tableData} />
              </div>
            </>
          )}
        </section>
      </div>

      <RoomFormDialog
        open={roomDialogOpen}
        onOpenChange={(open) => {
          setRoomDialogOpen(open)
          if (!open) setEditingRoom(null)
        }}
        areas={areas}
        room={editingRoom}
        defaultAreaId={activeAreaId}
        onSubmit={handleRoomSubmit}
      />

      <Dialog open={areaDialogOpen} onOpenChange={setAreaDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit area</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="area-name">Name</Label>
            <Input
              id="area-name"
              value={editingAreaName}
              onChange={(e) => setEditingAreaName(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAreaDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              className={fusionBtnPrimary}
              disabled={!editingAreaName.trim() || !activeAreaId}
              onClick={() =>
                updateAreaMut.mutate({
                  id: activeAreaId,
                  name: editingAreaName.trim(),
                })
              }
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
