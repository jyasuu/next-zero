export function isAdminLoginEnabled(
  env: Record<string, string | undefined> = process.env
): boolean {
  if (env.ADMIN_LOGIN_ENABLED === "false") return false
  return Boolean(env.ADMIN_USERNAME && env.ADMIN_PASSWORD)
}
