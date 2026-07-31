export function mapRealmRoles(
  realmRoles: string[],
  mappingJson: string | undefined
): string | null {
  if (!realmRoles || realmRoles.length === 0) return null
  if (!mappingJson) return null

  let mapping: Record<string, string>
  try {
    mapping = JSON.parse(mappingJson) as Record<string, string>
  } catch {
    return null
  }

  for (const realmRole of realmRoles) {
    const appRole = mapping[realmRole]
    if (appRole) return appRole
  }

  return null
}
