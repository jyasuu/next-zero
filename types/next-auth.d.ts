import "next-auth"

declare module "next-auth" {
  interface User {
    provider?: string
    providerAccountId?: string
    role?: string
    isAdmin?: boolean
    realmRoles?: string[]
  }
  interface Session {
    user: {
      provider?: string
      providerAccountId?: string
      role?: string
      isAdmin?: boolean
    } & import("next-auth").DefaultSession["user"]
  }
}
