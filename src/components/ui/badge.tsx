import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/shared/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-[var(--color-gold)] text-[var(--color-bg)]",
        secondary:
          "border-transparent bg-[var(--color-surface)] text-[var(--color-text-muted)]",
        destructive:
          "border-transparent bg-red-800 text-white",
        outline:
          "border-[var(--color-border)] text-[var(--color-text-muted)]",
        green:
          "border-transparent bg-[var(--color-green)] text-[var(--color-text)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
