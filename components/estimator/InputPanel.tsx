"use client"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

const EXAMPLES = [
  "Umroh 9 malam Makkah + 4 malam Madinah, hotel standard kamar quad, Garuda",
  "Pelataran Nabawi + Haram, 2 orang, triple, tour Makkah & Madinah",
  "Paket ekonomi lion air, double room, 12 hari",
]

interface InputPanelProps {
  value: string
  onChange: (v: string) => void
  onParse: () => void
  loading: boolean
}

export function InputPanel({ value, onChange, onParse, loading }: InputPanelProps) {
  return (
    <div
      className="rounded-xl border p-5 flex flex-col gap-4"
      style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
    >
      <div>
        <h2
          className="text-lg font-bold mb-1"
          style={{ fontFamily: "var(--font-heading)", color: "var(--color-gold)" }}
        >
          Deskripsi Perjalanan
        </h2>
        <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
          Ceritakan rencana umroh Anda, biarkan AI mengisi detailnya.
        </p>
      </div>

      <Textarea
        placeholder="Contoh: Umroh 9 malam Makkah + 4 malam Madinah, hotel standard, kamar quad, penerbangan Garuda..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-[120px] resize-y"
        style={{ background: "rgba(0,0,0,0.2)", borderColor: "var(--color-border)", color: "var(--color-text)" }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) onParse()
        }}
      />

      <div className="flex flex-wrap gap-2">
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            type="button"
            onClick={() => onChange(ex)}
            className="text-xs px-2 py-1 rounded-full border transition-colors hover:border-[var(--color-gold)]"
            style={{ borderColor: "var(--color-border)", color: "var(--color-text-muted)" }}
          >
            {ex.slice(0, 40)}…
          </button>
        ))}
      </div>

      <Button onClick={onParse} disabled={loading} className="w-full sm:w-auto">
        {loading ? "Menganalisis…" : "Hitung Estimasi"}
      </Button>
    </div>
  )
}
