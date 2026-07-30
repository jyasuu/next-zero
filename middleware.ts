import createIntlMiddleware from "next-intl/middleware"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const intlMiddleware = createIntlMiddleware({
  locales: ["en", "zh"],
  defaultLocale: "en",
  localePrefix: "never",
})

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (pathname.startsWith("/api") || pathname.startsWith("/_next")) {
    return NextResponse.next()
  }

  if (pathname === "/") {
    return NextResponse.redirect(new URL("/dashboard", req.url))
  }

  return intlMiddleware(req)
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\..*).*)",
  ],
}
