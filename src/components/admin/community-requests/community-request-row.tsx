import { Badge } from "@/components/ui/badge"
import { CommunityRequestEditDialog } from "./community-request-edit-dialog"
import { CopyPhoneButton } from "./copy-phone-button"
import { DuplicatePartnerPanel } from "./duplicate-partner-panel"
import type { CommunityJoinRequestWithDuplicateFlags } from "@/shared/community/admin-requests"
import {
  formatAbsoluteDateTime,
  formatPhoneDisplay,
  formatRelativeTime,
  whatsappHref,
} from "@/shared/community/admin-requests-format"
import { statusBadgeVariant, statusLabel } from "@/shared/community/admin-requests-status"

function duplicateReason(request: CommunityJoinRequestWithDuplicateFlags) {
  return [request.duplicateByPhone ? "nomor" : null, request.duplicateBySocial ? "sosial" : null]
    .filter(Boolean)
    .join(" + ")
}

type CommunityRequestRowProps = {
  request: CommunityJoinRequestWithDuplicateFlags
}

/**
 * A Server Component with small client islands (copy, edit). Keeping the row
 * itself on the server means the relative timestamp is computed once and never
 * disagrees with what was hydrated.
 */
export function CommunityRequestRow({ request }: CommunityRequestRowProps) {
  return (
    <tr className="border-t" style={{ borderColor: "var(--color-border)" }}>
      <td className="px-4 py-3 align-middle">
        <span className="block text-sm font-medium" style={{ color: "var(--color-text)" }}>
          {request.fullName}
        </span>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs">
          <a
            href={whatsappHref(request.normalizedPhone)}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Buka WhatsApp ${request.phone}`}
            className="underline-offset-2 hover:underline"
            style={{ color: "var(--color-gold)" }}
          >
            {formatPhoneDisplay(request.phone)}
          </a>
          <CopyPhoneButton phone={request.phone} />
          {request.socialUsername && (
            <span style={{ color: "var(--color-text-muted)" }}>{request.socialUsername}</span>
          )}
          {request.userId && (
            <span style={{ color: "var(--color-text-muted)" }}>· Terhubung dengan akun</span>
          )}
        </div>
      </td>

      <td className="max-w-[22rem] px-4 py-3 align-middle">
        {/* Clamped visually rather than sliced, so the full text stays in the
            DOM for browser find and screen readers. */}
        <span
          className="line-clamp-1 text-sm"
          style={{ color: request.intent ? "var(--color-text-muted)" : "var(--color-border)" }}
        >
          {request.intent ?? "Tidak diisi"}
        </span>
        {request.adminNote && (
          <span className="line-clamp-1 text-xs" style={{ color: "var(--color-gold)" }}>
            Catatan: {request.adminNote}
          </span>
        )}
      </td>

      <td
        className="whitespace-nowrap px-4 py-3 align-middle text-xs"
        style={{ color: "var(--color-text-muted)" }}
        title={formatAbsoluteDateTime(request.createdAt)}
      >
        {formatRelativeTime(request.createdAt)}
      </td>

      <td className="px-4 py-3 align-middle">
        <div className="flex flex-wrap items-center gap-1">
          <Badge variant={statusBadgeVariant(request.status)} className="text-xs">
            {statusLabel(request.status)}
          </Badge>
          {request.possibleDuplicate && (
            <DuplicatePartnerPanel
              id={request.id}
              fullName={request.fullName}
              reason={duplicateReason(request)}
            />
          )}
        </div>
      </td>

      <td className="px-4 py-3 text-right align-middle">
        <CommunityRequestEditDialog
          id={request.id}
          fullName={request.fullName}
          status={request.status}
          adminNote={request.adminNote}
        />
      </td>
    </tr>
  )
}
