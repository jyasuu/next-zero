import type { NextConfig } from "next"
import createNextIntlPlugin from "next-intl/plugin"

const withNextIntl = createNextIntlPlugin("./i18n/request.ts")

const nextConfig: NextConfig = {
  ...(process.env.VERCEL ? {} : { output: "standalone" }),
  serverExternalPackages: ["sql.js"],
  outputFileTracingIncludes: {
    "/**": ["./lib/db/sql-wasm.wasm"],
  },
}

export default withNextIntl(nextConfig)
