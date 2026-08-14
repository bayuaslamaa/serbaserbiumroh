"use client"

import { track } from "@/lib/analytics"

type TrackedLinkProps = React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  event: string
  params?: Record<string, unknown>
}

/**
 * An outbound `<a>` that reports the click before the browser leaves.
 *
 * It exists so the pages holding these CTAs stay server components: the parents
 * are static markup, and turning each of them into a client component just to
 * attach one handler would ship their whole subtree to the browser.
 *
 * Only for links GA cannot infer — outbound and cross-app ones. Internal
 * navigation is already covered by pageviews, so it needs no event.
 *
 * Import ANALYTICS_EVENTS from "@/lib/analytics", never from here: re-exporting
 * it through this file makes it a client-module reference, and a server
 * component reading `.CONTACT.CONSULT_CLICK` off that throws at render.
 */
export function TrackedLink({ event, params, onClick, children, ...rest }: TrackedLinkProps) {
  return (
    <a
      {...rest}
      onClick={(e) => {
        track(event, params)
        onClick?.(e)
      }}
    >
      {children}
    </a>
  )
}
