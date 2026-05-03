// Type declarations for MDX modules processed by @next/mdx
declare module '*.mdx' {
  import type { ComponentType } from 'react'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Component: ComponentType<any>
  export default Component
}
