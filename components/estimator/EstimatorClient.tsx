"use client"

import { useReducer, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import type { EstimateParams, BudgetBreakdown as Breakdown, PricingConfig } from "@/types"
import { DEFAULT_PARAMS } from "@/types"
import { calculateBudget } from "@/lib/budget/calculate"
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
  | { type: "OPEN_SAVE" }
  | { type: "CLOSE_SAVE" }
  | { type: "SAVE_START" }
  | { type: "SAVE_ERROR" }
  | { type: "DISMISS_NOTES" }

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
  existingRawInput?: string
  existingAiNotes?: string
  existingTitle?: string | null
  savedAt?: string | null
  initialParams?: Partial<EstimateParams>
  storySource?: string
}

export function EstimatorClient({
  pricingConfig,
  estimateId,
  existingParams,
  existingRawInput,
  existingAiNotes,
  existingTitle,
  savedAt,
  initialParams,
  storySource,
}: EstimatorClientProps) {
  const startState: State = {
    rawInput: existingRawInput ?? "",
    params: existingParams ?? (initialParams ? { ...DEFAULT_PARAMS, ...initialParams } : DEFAULT_PARAMS),
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

  const paramsUnchanged = useMemo(() => {
    if (!existingParams) return false
    return JSON.stringify(state.params) === JSON.stringify(existingParams)
  }, [state.params, existingParams])

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
    dispatch({ type: "SAVE_START" })
    try {
      const isEdit = !!estimateId
      const url = isEdit ? `/api/estimate/${estimateId}` : "/api/estimate"
      const method = isEdit ? "PATCH" : "POST"
      const body = isEdit
        ? { params: state.params, title: saveTitle.trim() || null }
        : {
            rawInput: state.rawInput || "(diedit manual)",
            params: state.params,
            aiNotes: state.aiNotes || null,
            title: saveTitle.trim() || null,
          }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        toast({ title: "Gagal menyimpan", description: "Coba lagi.", variant: "destructive" })
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
            <span className="font-semibold" style={{ color: "var(--color-gold)" }}>Catatan AI: </span>
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
          <BudgetBreakdown breakdown={breakdown} pax={state.params.pax} />
          <Button
            onClick={() => { setSaveTitle(existingTitle ?? ""); dispatch({ type: "OPEN_SAVE" }) }}
            className="w-full"
            size="lg"
            disabled={paramsUnchanged}
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
