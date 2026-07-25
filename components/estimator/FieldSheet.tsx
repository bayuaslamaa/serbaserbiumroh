"use client"

import * as React from "react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

interface FieldSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  children: React.ReactNode
  /**
   * When true, disables Radix's default close-on-outside-pointer/backdrop-tap
   * behavior — the sheet then only closes via an explicit `onOpenChange(false)`
   * call (e.g. its close button, or a field body's own "Selesai" action).
   * Used by field bodies (e.g. the services multi-select) that must stay open
   * across multiple interactions.
   */
  disableOutsideClose?: boolean
}

/**
 * Class applied to the sheet's field-body wrapper so mobile-sizing overrides
 * (larger, >=44px touch targets for Stepper/RadioCardGrid/ServiceCheckboxGrid)
 * can target "field body rendered inside FieldSheet" specifically, without
 * changing those components' sizing anywhere else they're used. The actual
 * sizing overrides are applied by whichever unit composes those controls
 * inside this shell.
 */
const FIELD_SHEET_BODY_CLASS = "field-sheet-body"

/**
 * Mobile bottom-sheet shell a field editor renders inside — wraps the shared
 * Radix `Dialog`/`DialogContent` primitive, repositioned to a bottom-anchored
 * sheet instead of the default centered dialog. Inherits Radix's focus-trap,
 * Escape-to-close, and scroll-lock for free.
 */
export function FieldSheet({ open, onOpenChange, title, children, disableOutsideClose }: FieldSheetProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "left-0 right-0 top-auto bottom-0 translate-x-0 translate-y-0",
          "max-w-none w-full rounded-t-2xl rounded-b-none border-b-0",
          "sm:rounded-t-2xl sm:rounded-b-none",
          "max-h-[85vh] overflow-y-auto"
        )}
        onPointerDownOutside={(event) => {
          if (disableOutsideClose) event.preventDefault()
        }}
        onInteractOutside={(event) => {
          if (disableOutsideClose) event.preventDefault()
        }}
      >
        <DialogTitle
          className="text-sm font-bold"
          style={{ fontFamily: "var(--font-heading)", color: "var(--color-gold)" }}
        >
          {title}
        </DialogTitle>
        <div className={FIELD_SHEET_BODY_CLASS}>{children}</div>
      </DialogContent>
    </Dialog>
  )
}
