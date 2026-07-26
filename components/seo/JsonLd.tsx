import type { JsonLdObject } from "@/lib/seo/schema"

/**
 * Escapes the characters that can break out of a <script> block.
 *
 * Schema values come from the database -- hotel names, pilgrim stories, FAQ
 * answers -- so a literal "</script>" in any of them would end the block early
 * and inject the remainder as markup. JSON.stringify alone does not protect
 * against this because "<" is legal inside a JSON string.
 */
function serialize(data: JsonLdObject): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
}

export function JsonLd({ data }: { data: JsonLdObject }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serialize(data) }}
    />
  )
}
