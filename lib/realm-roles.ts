interface RealmAccessClaim {
  realm_access?: {
    roles?: string[]
  }
}

export function realmRolesFromAccessToken(accessToken: string): string[] {
  if (!accessToken) return []
  const parts = accessToken.split(".")
  if (parts.length !== 3) return []
  try {
    const padded = parts[1] + "=".repeat((4 - (parts[1].length % 4)) % 4)
    const decoded = Buffer.from(padded.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf-8")
    const claim = JSON.parse(decoded) as RealmAccessClaim
    return claim.realm_access?.roles ?? []
  } catch {
    return []
  }
}
