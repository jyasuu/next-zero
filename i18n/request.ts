import { getRequestConfig } from "next-intl/server"

export default getRequestConfig(async ({ locale }) => {
  const resolved = locale === "zh" ? "zh" : "en"

  return {
    locale: resolved,
    messages: (await import(`../messages/${resolved}.json`)).default,
  }
})
