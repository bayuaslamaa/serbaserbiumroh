import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { isExternalHref, type Service } from "@/lib/services/catalog"

/** Full-density catalog card used on /layanan. */
export function ServiceCard({ service }: { service: Service }) {
  const Icon = service.icon
  const external = isExternalHref(service.href)

  return (
    <Link
      href={service.href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      className="flex flex-col gap-3.5 rounded-[14px] border p-[22px] transition-colors hover:border-[rgba(201,168,76,0.45)] hover:bg-[rgba(201,168,76,0.06)]"
      style={{
        borderColor: service.isNew
          ? "rgba(201,168,76,0.45)"
          : "rgba(201,168,76,0.16)",
        background: service.isNew
          ? "rgba(201,168,76,0.07)"
          : "rgba(255,255,255,0.02)",
      }}
    >
      <span className="flex items-center justify-between">
        <span
          className="flex h-11 w-11 items-center justify-center rounded-[11px] border"
          style={{
            background: "rgba(201,168,76,0.1)",
            borderColor: "rgba(201,168,76,0.25)",
          }}
        >
          <Icon size={22} className="text-gold" />
        </span>
        {service.isNew && (
          <span className="rounded-full bg-gold px-2.5 py-[3px] text-[10px] font-bold tracking-[0.06em] text-bg">
            BARU
          </span>
        )}
      </span>

      <span>
        <span className="block text-lg font-bold text-text">{service.name}</span>
        <span className="mt-1.5 block text-[13px] leading-[1.55] text-text-muted">
          {service.description}
        </span>
      </span>

      <span
        className="mt-auto flex items-center justify-between border-t pt-2.5"
        style={{ borderColor: "rgba(201,168,76,0.12)" }}
      >
        {service.price ? (
          <span className="text-[13px] font-bold text-gold">{service.price}</span>
        ) : (
          <span />
        )}
        <span className="flex items-center gap-1.5 text-[13px] font-semibold text-gold">
          Selengkapnya
          <ArrowRight size={14} />
        </span>
      </span>
    </Link>
  )
}
