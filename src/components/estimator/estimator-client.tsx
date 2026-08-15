"use client"

import { useReducer, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import type {
  EstimateParams,
  BudgetBreakdown as Breakdown,
  PricingConfig,
  ManualOverrides,
} from "@/shared/types"
import { DEFAULT_PARAMS } from "@/shared/types"
import { calculateBudget } from "@/shared/budget/calculate"
import { applyOverrides, breakdownToBaseRows, isEmptyOverrides } from "@/shared/budget/overrides"
import { arePersistableEstimateTotals, MAX_IDR, MAX_LABEL_LEN, MAX_ROWS } from "@/shared/estimate/overrides"
import { normaliseStoredOverrides, normaliseStoredParams } from "@/shared/estimate/services"
import { InputPanel } from "./input-panel"
import { ParamsPanel } from "./params-panel"
import { SentenceCard } from "./sentence-card"
import { BudgetBreakdown } from "./budget-breakdown"
import { EstimatorRail } from "./estimator-rail"
import { MobileTotalBar } from "./mobile-total-bar"
import { MobileWaPanel } from "./mobile-wa-panel"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "@/shared/hooks/use-toast"
import { useIsDesktop } from "@/shared/hooks/use-is-desktop"

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
  /**
   * Whether this operator may ask for the catalogue-grounded (enhanced) parse. Defaults to false so
   * a caller that forgets to pass it does not expose the capped, ADMIN-only path — the route answers
   * 403 either way, but a control that always 403s is worse than no control.
   *
   * Not a re-implementation of a gate: /estimate/new is admin-only for the whole page, while
   * /estimate/[id] is reachable by the non-admin who owns the estimate and can reopen this panel
   * with "Tulis ulang dari nol".
   */
  canUseEnhancedParse?: boolean
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
  canUseEnhancedParse = false,
}: EstimatorClientProps) {
  // A saved estimate is seeded straight into the reducer and posted back verbatim on save, so the
  // retired service keys its JSONB may still name are rewritten here too — normalising only at the
  // pricing boundary would show the right total and then fail the save with a 400.
  const startOverrides = normaliseStoredOverrides(existingOverrides ?? EMPTY_OVERRIDES)
  const startState: State = {
    rawInput: existingRawInput ?? "",
    params: existingParams
      ? normaliseStoredParams(existingParams)
      : initialParams
        ? normaliseStoredParams({ ...DEFAULT_PARAMS, ...initialParams })
        : DEFAULT_PARAMS,
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

  // UI-only state for the narrative revamp — never touches the reducer above.
  const [showStory, setShowStory] = useState(!startState.hasParsed)
  const [showFullForm, setShowFullForm] = useState(false)
  const [waOpen, setWaOpen] = useState(false)
  // The catalogue-grounded parse is a per-request option, not part of the estimate. Local state, NOT
  // the reducer: params in there are the saved artefact, and a flag sitting alongside them is a path
  // for the assistant's request settings to start influencing what gets persisted.
  const [enhancedParse, setEnhancedParse] = useState(false)
  const isDesktop = useIsDesktop()

  function startOver() {
    setShowStory(true)
    setWaOpen(false)
  }

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
    // Read once, up front: the request that comes back must be judged against the mode it was sent
    // in, and the enhanced-only refusals below are only refusals if this was an enhanced request.
    const wantsEnhanced = canUseEnhancedParse && enhancedParse
    dispatch({ type: "PARSE_START" })
    try {
      const res = await fetch("/api/estimate/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // The flag is omitted entirely when off, so the normal path sends byte-for-byte the body it
        // sent before this option existed (R4).
        body: JSON.stringify({ input: state.rawInput, ...(wantsEnhanced ? { enhanced: true } : {}) }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        // 403 and 429 are the enhanced path's two refusals, and neither may land as a silent failure.
        // The route answers 403 with a bare "Forbidden" — an API contract string, not something an
        // operator can act on — so it is restated here. Its 429 body is already operator copy and is
        // passed through so the used/limit numbers survive.
        const enhancedRefusal = wantsEnhanced && (res.status === 403 || res.status === 429)
        const description =
          wantsEnhanced && res.status === 403
            ? "Mode harga katalog hanya untuk admin. Hilangkan centang harga katalog lalu coba lagi."
            : ((err as { error?: string })?.error ?? "Coba lagi.")
        toast({
          title: enhancedRefusal ? "Mode harga katalog tidak tersedia" : "Gagal menganalisis",
          description,
          variant: "destructive",
        })
        dispatch({ type: "PARSE_ERROR" })
        return
      }
      const { params, notes } = await res.json()
      dispatch({ type: "PARSE_SUCCESS", payload: { params, notes } })
      setShowStory(false)
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

      <div className="flex items-center justify-end gap-2 flex-wrap">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowFullForm((v) => !v)}
        >
          {showFullForm ? "Tutup form lengkap" : "Buka form lengkap"}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={startOver}>
          Tulis ulang dari nol
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_352px] gap-6">
        <div className="flex flex-col gap-4 min-w-0">
          <InputPanel
            value={state.rawInput}
            onChange={(v) => dispatch({ type: "SET_INPUT", payload: v })}
            onParse={handleParse}
            loading={state.parseStatus === "loading"}
            visible={showStory}
            onCancel={() => setShowStory(false)}
            enhanced={enhancedParse}
            // Handler withheld, not merely a false flag: InputPanel renders no toggle at all without
            // it, so a non-admin never sees a control the route would 403.
            onEnhancedChange={canUseEnhancedParse ? setEnhancedParse : undefined}
          />
          <SentenceCard
            params={state.params}
            pricing={pricingConfig}
            onChange={(patch) => dispatch({ type: "UPDATE_PARAMS", payload: patch })}
            storySource={storySource}
            onStartOver={startOver}
          />
          {showFullForm && (
            <ParamsPanel
              params={state.params}
              pricing={pricingConfig}
              onChange={(patch) => dispatch({ type: "UPDATE_PARAMS", payload: patch })}
              storySource={storySource}
            />
          )}
          {/* Rincian Biaya belongs in the wide main column, not the 352px rail (Hi-Fi handoff,
              "Komponen kolom utama" #4): its 1fr/148px/176px row grid needs the full width, and
              inside the rail the 1fr label column collapses. Rendered once here for both
              breakpoints — the rail/mobile block below only carries the total and CTAs. */}
          <BudgetBreakdown
            display={display}
            customRows={state.manualOverrides.customRows}
            pax={state.params.pax}
            travelMonth={state.params.travelMonth}
            editable={canEditOverrides}
            {...rowHandlers}
          />
        </div>

        {isDesktop ? (
          <EstimatorRail
            display={display}
            pax={state.params.pax}
            params={state.params}
            onSave={() => { setSaveTitle(existingTitle ?? ""); dispatch({ type: "OPEN_SAVE" }) }}
            saveLabel={estimateId ? "Perbarui Estimasi" : "Simpan Estimasi"}
            saveDisabled={paramsUnchanged && overridesUnchanged}
            waOpen={waOpen}
            onWaOpenChange={setWaOpen}
          />
        ) : (
          <div className="flex flex-col gap-4 pb-24">
            <Button
              onClick={() => { setSaveTitle(existingTitle ?? ""); dispatch({ type: "OPEN_SAVE" }) }}
              className="w-full"
              size="lg"
              disabled={paramsUnchanged && overridesUnchanged}
            >
              {estimateId ? "Perbarui Estimasi" : "Simpan Estimasi"}
            </Button>
            {waOpen && <MobileWaPanel display={display} params={state.params} pax={state.params.pax} />}
          </div>
        )}
      </div>

      {!isDesktop && <MobileTotalBar display={display} waOpen={waOpen} onWaOpenChange={setWaOpen} />}

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
