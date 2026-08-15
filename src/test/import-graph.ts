import fs from "node:fs"
import path from "node:path"

/**
 * Static import-graph helpers for tests that assert on module boundaries.
 *
 * Shared rather than copied because two suites already need them and they are
 * the kind of thing that quietly diverges: app/(dashboard)/pricelist-hotel
 * checks that the page reaches no estimate pricing module (R9), and
 * components/pricelist-hotel checks that the client reaches no database module.
 * Both questions are the same walk over the same edges.
 *
 * Everything here reads source text off disk rather than importing modules, the
 * way middleware.test.ts reads the build manifest: what is being asserted is
 * the import statements an author wrote, which an actual module import has
 * already erased. It follows repo-local specifiers only -- packages are edges
 * the walk records but does not descend into.
 */

/**
 * Every way this codebase names another module, as {statement, module} pairs.
 *
 * One pattern per form, because a single regex misses most of them. An earlier
 * version matched only `import ... from "m"` with a lazy `[\s\S]*?` in the
 * middle, and six shapes walked straight through it: `await import("m")`,
 * `export ... from "m"`, `require("m")`, a bare `import "m"` -- and, worst,
 * a bare `import "m"` sitting ABOVE another import, because `[\s\S]*?` ran past
 * it and reported the NEXT module in its place. `[^"';]*?` is what stops that
 * one: the clause between `import` and `from` may wrap across lines but can
 * never cross a quote.
 */
export const IMPORT_PATTERNS = [
  // import x / {x} / * as x / type {x} from "m", and export ... from "m"
  /\b(?:import|export)\s[^"';]*?\bfrom\s*["']([^"']+)["']/g,
  // import "m" -- side-effect only, no bindings
  /\bimport\s*["']([^"']+)["']/g,
  // import("m") -- dynamic, with or without await
  /\bimport\s*\(\s*["']([^"']+)["']/g,
  // require("m")
  /\brequire\s*\(\s*["']([^"']+)["']/g,
]

/** Every module this source text names, paired with the statement that names it. */
export function importsOf(source: string): Array<{ statement: string; module: string }> {
  const found: Array<{ statement: string; module: string }> = []

  for (const pattern of IMPORT_PATTERNS) {
    for (const match of source.matchAll(pattern)) {
      found.push({ statement: match[0], module: match[1] })
    }
  }

  return found
}

/**
 * A repo-local module specifier resolved to the file it names, or null for a
 * package (`react`, `drizzle-orm`) this scan does not follow.
 */
export function resolveLocal(specifier: string, fromFile: string): string | null {
  let base: string
  if (specifier.startsWith("@/")) base = path.join(process.cwd(), specifier.slice(2))
  else if (specifier.startsWith(".")) base = path.resolve(path.dirname(fromFile), specifier)
  else return null

  for (const candidate of [
    `${base}.ts`,
    `${base}.tsx`,
    path.join(base, "index.ts"),
    path.join(base, "index.tsx"),
  ]) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate
  }

  return null
}

/** Every {file, module} edge reachable from an entry file, following repo-local imports. */
export function importGraph(entry: string): Array<{ file: string; module: string }> {
  const edges: Array<{ file: string; module: string }> = []
  const seen = new Set<string>()
  const queue = [path.join(process.cwd(), entry)]

  while (queue.length > 0) {
    const file = queue.shift() as string
    if (seen.has(file) || !fs.existsSync(file)) continue
    seen.add(file)

    for (const { module } of importsOf(fs.readFileSync(file, "utf8"))) {
      edges.push({ file: path.relative(process.cwd(), file), module })
      const next = resolveLocal(module, file)
      if (next) queue.push(next)
    }
  }

  return edges
}
