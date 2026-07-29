import createMiddleware from "next-intl/middleware"
import { auth } from "@/lib/auth"

const intlMiddleware = createMiddleware({
  locales: ["en"],
  defaultLocale: "en",
  localeDetection: false,
})

export default auth((req) => {
  const { pathname } = req.nextUrl

  if (pathname.startsWith("/login") || pathname.startsWith("/api")) {
    return
  }

  return intlMiddleware(req)
})

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\..*).*)",
  ],
}
