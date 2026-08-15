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

      // Imported dynamically: both packages are ESM-only and this config is
      // loaded as CJS, so static imports fail to build.
      const { compile } = await import("@mdx-js/mdx")
      const { default: remarkFrontmatter } = await import("remark-frontmatter")
      // Must match next.config.mjs. Without the same plugin here, the tests
      // compile MDX differently from the build -- which is how the leaked
      // frontmatter slipped past a passing word-count assertion.
      // Keep these options in step with next.config.mjs -- the point of
      // compiling MDX here at all is that tests see what the build produces.
      const compiled = await compile(code, {
        jsx: false,
        development: false,
        remarkPlugins: [remarkFrontmatter],
      })
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
      ["src/components/**/*.test.ts", "happy-dom"],
    ],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
})
