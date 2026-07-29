export interface ProviderConfig {
  id: string
  name: string
  type: "github" | "keycloak" | "oidc"
  clientId: string
  clientSecret: string
  issuer?: string
}

export function getProviderConfigs(): ProviderConfig[] {
  const raw = process.env.AUTH_PROVIDERS
  if (raw) {
    try {
      return JSON.parse(raw) as ProviderConfig[]
    } catch {
      console.error("Invalid AUTH_PROVIDERS JSON")
    }
  }

  const single = process.env.AUTH_PROVIDER
  if (!single) return []

  if (single === "github") {
    if (!process.env.AUTH_GITHUB_ID || !process.env.AUTH_GITHUB_SECRET) return []
    return [{ id: "github", name: "GitHub", type: "github", clientId: process.env.AUTH_GITHUB_ID, clientSecret: process.env.AUTH_GITHUB_SECRET }]
  }

  if (single === "keycloak") {
    if (!process.env.KEYCLOAK_CLIENT_ID || !process.env.KEYCLOAK_CLIENT_SECRET || !process.env.KEYCLOAK_ISSUER) return []
    return [{ id: "keycloak", name: "Keycloak", type: "keycloak", clientId: process.env.KEYCLOAK_CLIENT_ID, clientSecret: process.env.KEYCLOAK_CLIENT_SECRET, issuer: process.env.KEYCLOAK_ISSUER }]
  }

  return []
}
