"use client"

import { useReducer, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import type {
  EstimateParams,
  BudgetBreakdown as Breakdown,
  PricingConfig,
  ManualOverrides,
} from "@/types"
import { DEFAULT_PARAMS } from "@/types"
import { calculateBudget } from "@/lib/budget/calculate"
import { applyOverrides, breakdownToBaseRows, isEmptyOverrides } from "@/lib/budget/overrides"
import { arePersistableEstimateTotals, MAX_IDR, MAX_LABEL_LEN, MAX_ROWS } from "@/lib/estimate/overrides"
import { InputPanel } from "./InputPanel"
import { ParamsPanel } from "./ParamsPanel"
import { BudgetBreakdown } from "./BudgetBreakdown"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "@/hooks/use-toast"

type ParseStatus = "idle" | "loading" | "error"
type SaveStatus = "idle" | "loading" | "error"

interface State {
  rawInput: string
  params: EstimateParams
  manualOverrides: ManualOverrides
  aiNotes: string
  parseStatus: ParseStatus
  saveStatus: SaveStatus
  showSaveDialog: boolean
  hasParsed: boolean
}

type Action =
  | { type: "SET_INPUT"; payload: string }
  | { type: "PARSE_START" }
  | { type: "PARSE_SUCCESS"; payload: { params: EstimateParams; notes: string } }
  | { type: "PARSE_ERROR" }
  | { type: "UPDATE_PARAMS"; payload: Partial<EstimateParams> }
  | { type: "SET_OVERRIDES"; payload: ManualOverrides }
  | { type: "OPEN_SAVE" }
  | { type: "CLOSE_SAVE" }
  | { type: "SAVE_START" }
  | { type: "SAVE_ERROR" }
  | { type: "DISMISS_NOTES" }

const EMPTY_OVERRIDES: ManualOverrides = { overrides: {}, customRows: [] }

function newCustomId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID()
  return `c_${Date.now()}_${Math.floor(Math.random() * 1e6)}`
}

function sanitizeOverrides(o: ManualOverrides): ManualOverrides | null {
  return isEmptyOverrides(o) ? null : o
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "SET_INPUT":
      return { ...state, rawInput: action.payload }
    case "PARSE_START":
      return { ...state, parseStatus: "loading" }
    case "PARSE_SUCCESS":
      return {
        ...state,
        params: action.payload.params,
        aiNotes: action.payload.notes,
        parseStatus: "idle",
        hasParsed: true,
      }
    case "PARSE_ERROR":
      return { ...state, parseStatus: "error" }
    case "UPDATE_PARAMS":
      return { ...state, params: { ...state.params, ...action.payload } }
    case "SET_OVERRIDES":
      return { ...state, manualOverrides: action.payload }
    case "OPEN_SAVE":
      return { ...state, showSaveDialog: true }
    case "CLOSE_SAVE":
      return { ...state, showSaveDialog: false, saveStatus: "idle" }
    case "SAVE_START":
      return { ...state, saveStatus: "loading" }
    case "SAVE_ERROR":
      return { ...state, saveStatus: "error" }
    case "DISMISS_NOTES":
      return { ...state, aiNotes: "" }
    default:
      return state
  }
}

const initialState: State = {
  rawInput: "",
  params: DEFAULT_PARAMS,
  manualOverrides: EMPTY_OVERRIDES,
  aiNotes: "",
  parseStatus: "idle",
  saveStatus: "idle",
  showSaveDialog: false,
  hasParsed: false,
}

interface EstimatorClientProps {
  pricingConfig: PricingConfig
  estimateId?: string
  existingParams?: EstimateParams
  existingOverrides?: ManualOverrides
  existingRawInput?: string
  existingAiNotes?: string
  existingTitle?: string | null
  savedAt?: string | null
  initialParams?: Partial<EstimateParams>
  storySource?: string
  canEditOverrides?: boolean
}

export function EstimatorClient({
  pricingConfig,
  estimateId,
  existingParams,
  existingOverrides,
  existingRawInput,
  existingAiNotes,
  existingTitle,
  savedAt,
  initialParams,
  storySource,
  canEditOverrides = true,
}: EstimatorClientProps) {
  const startOverrides = existingOverrides ?? EMPTY_OVERRIDES
  const startState: State = {
    rawInput: existingRawInput ?? "",
    params: existingParams ?? (initialParams ? { ...DEFAULT_PARAMS, ...initialParams } : DEFAULT_PARAMS),
    manualOverrides: startOverrides,
    aiNotes: existingAiNotes ?? "",
    parseStatus: "idle",
    saveStatus: "idle",
    showSaveDialog: false,
    hasParsed: !!existingParams,
  }
  const [state, dispatch] = useReducer(reducer, startState)
  const [saveTitle, setSaveTitle] = useState(existingTitle ?? "")
  const router = useRouter()

  const breakdown: Breakdown = calculateBudget(state.params, pricingConfig)
  const display = applyOverrides(breakdown, state.manualOverrides, state.params.pax)

  // Current auto (computed) amount for each row key — captured when an override is set
  // so the row can flag itself stale once the underlying parameters change.
  const baseIdrByKey = useMemo(() => {
    const map: Record<string, number> = {}
    for (const r of breakdownToBaseRows(breakdown)) map[r.key] = r.baseIdr
    return map
  }, [breakdown])

  const overrides = state.manualOverrides

  function setOverrides(next: ManualOverrides) {
    dispatch({ type: "SET_OVERRIDES", payload: next })
  }

  // Merge a patch into one computed-row override, pruning empty fields so the map stays minimal.
  function patchRow(
    key: string,
    patch: { label?: string | null; idr?: number | null; unitPrice?: number | null; hidden?: boolean },
  ) {
    const cur = overrides.overrides[key] ?? {}
    const merged = { ...cur, ...patch }
    const cleaned: { label?: string; idr?: number; unitPrice?: number; hidden?: boolean; autoIdrAtOverride?: number } = {}
    if (merged.label != null && merged.label !== "") cleaned.label = merged.label
    if (merged.idr != null) {
      cleaned.idr = merged.idr
      // Only (re)capture the auto baseline when THIS patch sets the amount; a label/hidden
      // edit to an already-overridden row must preserve the original baseline so a legitimate
      // stale warning is not silently cleared.
      cleaned.autoIdrAtOverride = patch.idr != null ? (baseIdrByKey[key] ?? patch.idr) : cur.autoIdrAtOverride
    }
    if (merged.unitPrice != null) cleaned.unitPrice = merged.unitPrice
    if (merged.hidden) cleaned.hidden = true
    const nextMap = { ...overrides.overrides }
    if (Object.keys(cleaned).length === 0) delete nextMap[key]
    else nextMap[key] = cleaned
    setOverrides({ ...overrides, overrides: nextMap })
  }

  function amountExceedsLimit(idr: number | null): boolean {
    if (idr == null || idr <= MAX_IDR) return false
    toast({
      title: "Nominal terlalu besar",
      description: `Maksimal Rp ${MAX_IDR.toLocaleString("id-ID")} per baris.`,
      variant: "destructive",
    })
    return true
  }

  const rowHandlers = {
    onSetAmount: (key: string, idr: number | null) => {
      if (amountExceedsLimit(idr)) return
      // A direct value edit supersedes any unit-price override on the row.
      patchRow(key, { idr: idr == null ? undefined : idr, unitPrice: null })
    },
    onSetUnitPrice: (key: string, unitPrice: number | null) => {
      if (amountExceedsLimit(unitPrice)) return
      // Editing the unit price re-derives the value, so drop any direct value override.
      patchRow(key, { unitPrice: unitPrice == null ? undefined : unitPrice, idr: null })
    },
    onSetLabel: (key: string, label: string | null) => {
      if (label && label.length > MAX_LABEL_LEN) return
      patchRow(key, { label: label && label.length ? label : undefined })
    },
    onToggleHidden: (key: string) =>
      patchRow(key, { hidden: overrides.overrides[key]?.hidden ? undefined : true }),
    onResetRow: (key: string) =>
      patchRow(key, { idr: undefined, unitPrice: undefined, label: undefined, hidden: false }),
    onAddCustom: () => {
      if (overrides.customRows.length >= MAX_ROWS) {
        toast({
          title: "Batas baris tercapai",
          description: `Maksimal ${MAX_ROWS} baris biaya tambahan.`,
          variant: "destructive",
        })
        return
      }
      setOverrides({
        ...overrides,
        customRows: [...overrides.customRows, { id: newCustomId(), label: "", idr: 0 }],
      })
    },
    onSetCustomLabel: (id: string, label: string) =>
      setOverrides({
        ...overrides,
        customRows: overrides.customRows.map((r) =>
          r.id === id ? { ...r, label: label.slice(0, MAX_LABEL_LEN) } : r,
        ),
      }),
    onSetCustomAmount: (id: string, idr: number | null) => {
      if (amountExceedsLimit(idr)) return
      setOverrides({
        ...overrides,
        customRows: overrides.customRows.map((r) => (r.id === id ? { ...r, idr: idr ?? 0 } : r)),
      })
    },
    onRemoveCustom: (id: string) =>
      setOverrides({ ...overrides, customRows: overrides.customRows.filter((r) => r.id !== id) }),
  }

  const paramsUnchanged = useMemo(() => {
    if (!existingParams) return false
    return JSON.stringify(state.params) === JSON.stringify(existingParams)
  }, [state.params, existingParams])

  const overridesUnchanged = useMemo(
    () => JSON.stringify(state.manualOverrides) === JSON.stringify(startOverrides),
    [state.manualOverrides, startOverrides],
  )

  async function handleParse() {
    if (!state.rawInput.trim()) {
      toast({ title: "Input kosong", description: "Tuliskan deskripsi perjalanan Anda.", variant: "destructive" })
      return
    }
    dispatch({ type: "PARSE_START" })
    try {
      const res = await fetch("/api/estimate/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: state.rawInput }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        toast({ title: "Gagal menganalisis", description: (err as any)?.error ?? "Coba lagi.", variant: "destructive" })
        dispatch({ type: "PARSE_ERROR" })
        return
      }
      const { params, notes } = await res.json()
      dispatch({ type: "PARSE_SUCCESS", payload: { params, notes } })
    } catch {
      toast({ title: "Gagal menganalisis", description: "Periksa koneksi internet Anda.", variant: "destructive" })
      dispatch({ type: "PARSE_ERROR" })
    }
  }

  async function handleSave() {
    if (state.manualOverrides.customRows.some((row) => row.label.trim().length === 0)) {
      toast({
        title: "Nama biaya belum diisi",
        description: "Isi nama setiap baris biaya tambahan atau hapus baris yang kosong.",
        variant: "destructive",
      })
      return
    }
    if (!arePersistableEstimateTotals(display.totalIdrPax, display.totalIdrGrp)) {
      toast({
        title: "Total estimasi terlalu besar",
        description: "Kurangi nominal biaya atau jumlah jamaah sebelum menyimpan.",
        variant: "destructive",
      })
      return
    }
    dispatch({ type: "SAVE_START" })
    try {
      const isEdit = !!estimateId
      const url = isEdit ? `/api/estimate/${estimateId}` : "/api/estimate"
      const method = isEdit ? "PATCH" : "POST"
      // Only send overrides when they actually changed, so a title/param-only edit never
      // touches the override path (which would otherwise 403 a non-admin or clear the column).
      const manualOverrides = overridesUnchanged ? undefined : sanitizeOverrides(state.manualOverrides)
      const body = isEdit
        ? {
          params: paramsUnchanged ? undefined : state.params,
          manualOverrides,
          expectedUpdatedAt: savedAt,
          title: saveTitle.trim() || null,
        }
        : {
          rawInput: state.rawInput || "(diedit manual)",
          params: state.params,
          manualOverrides,
          aiNotes: state.aiNotes || null,
          title: saveTitle.trim() || null,
        }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const error = await res.json().catch(() => null) as { error?: string } | null
        toast({
          title: res.status === 409 ? "Estimasi sudah berubah" : "Gagal menyimpan",
          description: res.status === 409
            ? "Muat ulang halaman sebelum menyimpan perubahan Anda."
            : (error?.error ?? "Coba lagi."),
          variant: "destructive",
        })
        dispatch({ type: "SAVE_ERROR" })
        return
      }
      toast({ title: isEdit ? "Estimasi diperbarui!" : "Estimasi tersimpan!" })
      router.push("/dashboard")
    } catch {
      toast({ title: "Gagal menyimpan", description: "Periksa koneksi internet Anda.", variant: "destructive" })
      dispatch({ type: "SAVE_ERROR" })
    }
  }

  return (
    <div className="space-y-4">
      {savedAt && (
        <div className="text-xs" style={{ color: "var(--color-text-muted)" }}>
          Disimpan pada {new Date(savedAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
        </div>
      )}
      {state.aiNotes && (
        <div
          className="flex items-start justify-between gap-3 rounded-lg border p-4"
          style={{ borderColor: "var(--color-gold-muted)", background: "rgba(201,168,76,0.08)" }}
        >
          <p className="text-sm" style={{ color: "var(--color-text)" }}>
            <span className="font-semibold" style={{ color: "var(--color-gold)" }}>Catatan: </span>
            {state.aiNotes}
          </p>
          <button
            type="button"
            onClick={() => dispatch({ type: "DISMISS_NOTES" })}
            className="shrink-0 text-lg leading-none hover:opacity-70"
            style={{ color: "var(--color-text-muted)" }}
            aria-label="Tutup"
          >
            ×
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="flex flex-col gap-4">
          <InputPanel
            value={state.rawInput}
            onChange={(v) => dispatch({ type: "SET_INPUT", payload: v })}
            onParse={handleParse}
            loading={state.parseStatus === "loading"}
          />
          <ParamsPanel
            params={state.params}
            pricing={pricingConfig}
            onChange={(patch) => dispatch({ type: "UPDATE_PARAMS", payload: patch })}
            storySource={storySource}
          />
        </div>

        <div className="lg:sticky lg:top-20 flex flex-col gap-4 self-start">
          <BudgetBreakdown
            display={display}
            customRows={state.manualOverrides.customRows}
            pax={state.params.pax}
            editable={canEditOverrides}
            {...rowHandlers}
          />
          <Button
            onClick={() => { setSaveTitle(existingTitle ?? ""); dispatch({ type: "OPEN_SAVE" }) }}
            className="w-full"
            size="lg"
            disabled={paramsUnchanged && overridesUnchanged}
          >
            {estimateId ? "Perbarui Estimasi" : "Simpan Estimasi"}
          </Button>
        </div>
      </div>

      <Dialog open={state.showSaveDialog} onOpenChange={(open) => !open && dispatch({ type: "CLOSE_SAVE" })}>
        <DialogContent style={{ background: "#0f2318", borderColor: "var(--color-border)" }}>
          <DialogHeader>
            <DialogTitle style={{ color: "var(--color-gold)", fontFamily: "var(--font-heading)" }}>
              Simpan Estimasi
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label style={{ color: "var(--color-text-muted)" }}>Judul (opsional)</Label>
            <Input
              placeholder={`Estimasi ${state.params.hotelTier.charAt(0)}${state.params.hotelTier.slice(1).toLowerCase()} ${state.params.nightsMadinah}+${state.params.nightsMakkah} malam`}
              value={saveTitle}
              onChange={(e) => setSaveTitle(e.target.value)}
              style={{ background: "rgba(0,0,0,0.3)", borderColor: "var(--color-border)", color: "var(--color-text)" }}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => dispatch({ type: "CLOSE_SAVE" })}
              disabled={state.saveStatus === "loading"}
            >
              Batal
            </Button>
            <Button onClick={handleSave} disabled={state.saveStatus === "loading"}>
              {state.saveStatus === "loading" ? "Menyimpan…" : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
