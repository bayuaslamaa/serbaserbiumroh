import { defineConfig, type Plugin } from "vitest/config"
import react from "@vitejs/plugin-react"
import { fileURLToPath, URL } from "node:url"

/**
 * Compiles .mdx the way @next/mdx does at build time.
 *
 * Without this, a test that renders a guide page cannot see its content, and
 * the word-count guard on the panduan pages would be asserting against a mock
 * instead of the real guide.
 */
function mdx(): Plugin {
  return {
    name: "vitest-mdx",
    enforce: "pre",
    async transform(code, id) {
      if (!id.endsWith(".mdx")) return null

      // Imported dynamically: @mdx-js/mdx is ESM-only and this config is
      // loaded as CJS, so a static import fails to build.
      const { compile } = await import("@mdx-js/mdx")
      const compiled = await compile(code, { jsx: false, development: false })
      return { code: String(compiled), map: null }
    },
  }
}

export default defineConfig({
  plugins: [mdx(), react()],
  test: {
    environment: "node",
    setupFiles: ["./vitest.setup.ts"],
    globals: true,
    environmentMatchGlobs: [
      ["**/*.test.tsx", "happy-dom"],
      ["components/**/*.test.ts", "happy-dom"],
    ],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
})
