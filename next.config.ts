import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["pg", "@react-pdf/renderer"],
  },
}

export default nextConfig
