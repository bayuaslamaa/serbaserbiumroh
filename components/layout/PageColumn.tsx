import { cn } from '@/lib/utils'

/**
 * Reproduces the exact column public page content sits on: the public layout's
 * `container mx-auto px-4` with the homepage's `max-w-6xl` inside it.
 *
 * A full-bleed band spans the viewport, so its content has to re-derive that
 * column rather than approximate it. Approximating with one padding value
 * drifts — the container's max-width steps at each breakpoint while the inner
 * cap does not, so a single `px-*` lines up at one width and is off by that
 * padding at every other.
 */
export function PageColumn({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className="container mx-auto px-4">
      <div className={cn('mx-auto max-w-6xl', className)}>{children}</div>
    </div>
  )
}
