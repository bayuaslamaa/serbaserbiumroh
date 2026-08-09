import fs from "node:fs"
import path from "node:path"

import { describe, expect, it } from "vitest"

import { importGraph } from "@/test/import-graph"

/**
 * Lives next to the component it guards. This assertion spent a while inside
 * app/(dashboard)/pricelist-hotel/__tests__/page.test.tsx, where it named a
 * file in a different directory and sat under a docblock that described
 * something else -- so the suite that would have to change when the client's
 * imports change was not the suite anyone looking at the client would open.
 */
describe("the pricelist client stays out of the database module graph", () => {
  const CLIENT = "components/pricelist-hotel/PricelistClient.tsx"

  /**
   * The gate `pnpm test` and `npx tsc --noEmit` both structurally cannot be.
   *
   * The rendering suite mocks @/lib/db, and tsc only checks types, so neither
   * notices a "use client" module value-importing a server module. The bundler
   * does: it follows the import into lib/db, into pg, and fails on
   * `fs`/`net`/`dns` -- which is exactly how this branch shipped a build that
   * did not compile.
   *
   * `npx next build` is the real check and is a row in the plan's Verification
   * Contract. This test is the fast, local one that names the cause rather than
   * a webpack trace.
   */
  it('declares "use client" and reaches @/lib/db from nothing it imports', () => {
    const source = fs.readFileSync(path.join(process.cwd(), CLIENT), "utf8")

    expect(source.trimStart().startsWith('"use client"')).toBe(true)

    const edges = importGraph(CLIENT)
    expect(edges.length).toBeGreaterThan(0)

    for (const { file, module } of edges) {
      // lib/db and lib/db/schema, however they are spelled. Matching the
      // module rather than the resolved file keeps the failure message naming
      // the import the author wrote.
      expect(
        /(^|\/)lib\/db($|\/)/.test(module),
        `${file} imports ${module}, which puts pg in the browser bundle`,
      ).toBe(false)
    }

    // The specific regression: lib/hotels/pricelist value-imports db, so the
    // client must take its types from pricelist-types instead.
    expect(edges.map((edge) => edge.module)).not.toContain("@/lib/hotels/pricelist")
  })
})
