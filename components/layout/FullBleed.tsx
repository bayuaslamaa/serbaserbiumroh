import { cn } from '@/lib/utils'

/**
 * Lets a homepage section span the viewport from inside the public layout's
 * two nested containers (`container mx-auto px-4` in the layout, `max-w-6xl`
 * on the page). Both centre their content, so escaping them needs viewport
 * units rather than a negative padding offset.
 *
 * The 100vw width includes the scrollbar gutter on platforms that reserve one,
 * which would otherwise add a sliver of horizontal scroll to every public page.
 * `overflow-x-clip` on the public layout's root absorbs it. `clip` and not
 * `hidden` on purpose: `hidden` would make that root a scroll container and
 * break the sticky navbar inside it.
 */
export function FullBleed({
  children,
  className,
  style,
}: {
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
}) {
  return (
    <div
      className={cn('relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen', className)}
      style={style}
    >
      {children}
    </div>
  )
}
