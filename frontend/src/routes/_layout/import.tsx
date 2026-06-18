import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import type { ColumnDef } from "@tanstack/react-table"
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileUp,
  Upload,
} from "lucide-react"
import { useCallback, useMemo, useRef, useState } from "react"

import { DataTable } from "@/components/Common/DataTable"
import { MrbsHeader } from "@/components/mrbs/MrbsHeader"
import {
  downloadImportTemplate,
  parseImportFile,
  rowToPayload,
  type ImportFileKind,
  type ImportPreviewRow,
} from "@/components/mrbs/import-utils"
import { FilterField, PillRadio, SectionTitle } from "@/components/mrbs/mrbs-filter-ui"
import { fusionBtnPrimary } from "@/components/mrbs/fusion-brand"
import { formatDateTimeLabel } from "@/components/mrbs/schedule-utils"
import { scheduleTheme as theme } from "@/components/mrbs/schedule-theme"
import { Button } from "@/components/ui/button"
import useAuth from "@/hooks/useAuth"
import useCustomToast from "@/hooks/useCustomToast"
import { createBooking, fetchRooms } from "@/lib/mrbs-api"
import { isItAdmin } from "@/lib/user-roles"

export const Route = createFileRoute("/_layout/import")({
  component: ImportPage,
  head: () => ({
    meta: [{ title: "Import - Fusion Hotel Group" }],
  }),
})

type ImportPhase = "idle" | "preview" | "importing" | "done"

function ImportPage() {
  const { user } = useAuth()
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [fileName, setFileName] = useState("")
  const [fileKind, setFileKind] = useState<ImportFileKind>("unknown")
  const [rows, setRows] = useState<ImportPreviewRow[]>([])
  const [defaultType, setDefaultType] = useState<"internal" | "external">(
    "internal",
  )
  const [confirmationStatus, setConfirmationStatus] = useState<
    "confirmed" | "tentative"
  >("confirmed")
  const [phase, setPhase] = useState<ImportPhase>("idle")
  const [importResult, setImportResult] = useState<{
    success: number
    failed: number
  } | null>(null)
  const [dragOver, setDragOver] = useState(false)

  const { data: roomsData } = useQuery({
    queryKey: ["rooms"],
    queryFn: () => fetchRooms(),
  })
  const rooms = roomsData?.data ?? []

  const validCount = rows.filter((r) => r.status === "valid").length
  const errorCount = rows.filter((r) => r.status === "error").length

  const processFile = useCallback(
    (file: File) => {
      const reader = new FileReader()
      reader.onload = () => {
        const content = String(reader.result ?? "")
        const parsed = parseImportFile(file.name, content, rooms, defaultType)
        if (parsed.kind === "unknown" || parsed.rows.length === 0) {
          showErrorToast(
            "Could not read file. Use CSV or ICS with booking rows.",
          )
          return
        }
        setFileName(file.name)
        setFileKind(parsed.kind)
        setRows(parsed.rows)
        setPhase("preview")
        setImportResult(null)
      }
      reader.readAsText(file)
    },
    [rooms, defaultType, showErrorToast],
  )

  const importMut = useMutation({
    mutationFn: async (validRows: ImportPreviewRow[]) => {
      let success = 0
      let failed = 0
      const updated = [...rows]

      for (const row of validRows) {
        const payload = rowToPayload(row, {
          confirmationStatus,
        })
        if (!payload) continue
        try {
          await createBooking(payload)
          success++
        } catch {
          failed++
          const idx = updated.findIndex((r) => r.rowNum === row.rowNum)
          if (idx >= 0) {
            updated[idx] = {
              ...updated[idx]!,
              status: "error",
              message: "Import failed (conflict or server error)",
            }
          }
        }
      }
      setRows(updated)
      return { success, failed }
    },
    onSuccess: (result) => {
      setImportResult(result)
      setPhase("done")
      queryClient.invalidateQueries({ queryKey: ["bookings"] })
      if (result.failed === 0) {
        showSuccessToast(`Imported ${result.success} booking(s)`)
      } else {
        showErrorToast(
          `Imported ${result.success}, failed ${result.failed}. See preview for errors.`,
        )
      }
    },
    onError: () => showErrorToast("Import failed"),
  })

  const columns = useMemo<ColumnDef<ImportPreviewRow>[]>(
    () => [
      {
        accessorKey: "rowNum",
        header: "#",
        cell: ({ row }) => (
          <span className="text-slate-500">{row.original.rowNum}</span>
        ),
      },
      {
        accessorKey: "title",
        header: "Meeting",
        cell: ({ row }) => (
          <span className="font-medium text-slate-800">
            {row.original.title || "—"}
          </span>
        ),
      },
      {
        accessorKey: "roomName",
        header: "Room",
      },
      {
        id: "start",
        header: "Start",
        cell: ({ row }) =>
          row.original.startIso ? (
            <span className="whitespace-nowrap text-slate-600">
              {formatDateTimeLabel(row.original.startIso)}
            </span>
          ) : (
            "—"
          ),
      },
      {
        id: "end",
        header: "End",
        cell: ({ row }) =>
          row.original.endIso ? (
            <span className="whitespace-nowrap text-slate-600">
              {formatDateTimeLabel(row.original.endIso)}
            </span>
          ) : (
            "—"
          ),
      },
      {
        accessorKey: "bookingType",
        header: "Type",
        cell: ({ row }) => (
          <span className="capitalize text-slate-500">
            {row.original.bookingType}
          </span>
        ),
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) =>
          row.original.status === "valid" ? (
            <span className="inline-flex items-center gap-1 text-xs text-emerald-700">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Ready
            </span>
          ) : (
            <span
              className="inline-flex items-center gap-1 text-xs text-red-700"
              title={row.original.message}
            >
              <AlertCircle className="h-3.5 w-3.5" />
              {row.original.message ?? "Error"}
            </span>
          ),
      },
    ],
    [],
  )

  const reset = () => {
    setPhase("idle")
    setRows([])
    setFileName("")
    setFileKind("unknown")
    setImportResult(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const handleImport = () => {
    const validRows = rows.filter((r) => r.status === "valid")
    if (!validRows.length) {
      showErrorToast("No valid rows to import")
      return
    }
    setPhase("importing")
    importMut.mutate(validRows)
  }

  return (
    <div className={`flex h-screen flex-col overflow-hidden ${theme.pageBg}`}>
      <MrbsHeader />

      <div className="flex min-h-0 flex-1 flex-col gap-3 px-3 py-3 lg:px-4 lg:py-4">
        <div className={`${theme.card} shrink-0 px-4 py-3`}>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FEF3E8]">
                <Upload className="h-4 w-4 text-[#E8872E]" />
              </div>
              <div>
                <h1 className="text-base font-bold text-slate-900">
                  Import bookings
                </h1>
                <p className="text-xs text-slate-500">
                  Upload CSV or ICS calendar file · room names must match system
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-9 gap-2 border-slate-200 text-xs"
                onClick={downloadImportTemplate}
              >
                <Download className="h-4 w-4" />
                CSV template
              </Button>
              {phase !== "idle" ? (
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 border-slate-200 text-xs"
                  onClick={reset}
                >
                  Clear
                </Button>
              ) : null}
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.ics,.ical,text/csv,text/calendar"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) processFile(file)
            }}
          />

          {phase === "idle" ? (
            <button
              type="button"
              className={`flex w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 transition-colors ${
                dragOver
                  ? "border-[#F59E42] bg-[#FEF3E8]"
                  : "border-slate-200 bg-slate-50/50 hover:border-[#FBC081] hover:bg-[#FEF3E8]/40"
              }`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault()
                setDragOver(true)
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault()
                setDragOver(false)
                const file = e.dataTransfer.files?.[0]
                if (file) processFile(file)
              }}
            >
              <div className="rounded-full bg-white p-3 shadow-sm">
                <FileUp className="h-7 w-7 text-[#E8872E]" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-slate-800">
                  Drop file here or click to browse
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  CSV (spreadsheet export) or ICS (Outlook / Google Calendar)
                </p>
              </div>
            </button>
          ) : (
            <div className="grid grid-cols-1 gap-x-3 gap-y-2 sm:grid-cols-2 lg:grid-cols-4">
              <FilterField label="File">
                <p className="truncate text-xs text-slate-700">
                  {fileName}{" "}
                  <span className="text-slate-400">({fileKind.toUpperCase()})</span>
                </p>
              </FilterField>
              <FilterField label="Default type">
                <PillRadio
                  value={defaultType}
                  onChange={(v) => {
                    setDefaultType(v)
                    if (fileName && rows.length) {
                      setRows((prev) =>
                        prev.map((r) =>
                          r.status === "valid"
                            ? { ...r, bookingType: v }
                            : r,
                        ),
                      )
                    }
                  }}
                  options={[
                    { value: "internal", label: "Internal" },
                    { value: "external", label: "External" },
                  ]}
                />
              </FilterField>
              <FilterField label="Confirmation">
                <PillRadio
                  value={confirmationStatus}
                  onChange={setConfirmationStatus}
                  options={[
                    { value: "confirmed", label: "Confirmed" },
                    { value: "tentative", label: "Tentative" },
                  ]}
                />
              </FilterField>
              <FilterField label="Summary">
                <p className="text-xs text-slate-600">
                  <span className="font-medium text-emerald-700">{validCount}</span>{" "}
                  ready ·{" "}
                  <span className="font-medium text-red-600">{errorCount}</span>{" "}
                  errors
                </p>
              </FilterField>
            </div>
          )}

          {phase === "preview" || phase === "importing" || phase === "done" ? (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
              <SectionTitle>
                {importResult
                  ? `Done — ${importResult.success} imported, ${importResult.failed} failed`
                  : `${rows.length} row(s) parsed`}
              </SectionTitle>
              <Button
                type="button"
                className={`${fusionBtnPrimary} h-9 gap-2 px-5`}
                disabled={
                  phase === "importing" ||
                  phase === "done" ||
                  validCount === 0 ||
                  importMut.isPending
                }
                onClick={handleImport}
              >
                <Upload className="h-4 w-4" />
                {phase === "importing"
                  ? "Importing…"
                  : `Import ${validCount} booking(s)`}
              </Button>
            </div>
          ) : null}

          {!isItAdmin(user) && phase !== "idle" ? (
            <p className="mt-2 text-xs text-slate-500">
              Imported bookings will be submitted for HR / IT approval.
            </p>
          ) : null}
        </div>

        {rows.length > 0 ? (
          <section
            className={`${theme.card} flex min-h-0 flex-1 flex-col overflow-hidden`}
          >
            <div className="shrink-0 border-b border-slate-100 px-4 py-3">
              <p className="text-sm font-medium text-slate-800">Preview</p>
            </div>
            <div className="min-h-0 flex-1 overflow-auto p-4">
              <DataTable columns={columns} data={rows} />
            </div>
          </section>
        ) : null}
      </div>
    </div>
  )
}
