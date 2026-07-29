import "next-auth"

declare module "next-auth" {
  interface User {
    provider?: string
    providerAccountId?: string
  }
  interface Session {
    user: {
      provider?: string
      providerAccountId?: string
    } & import("next-auth").DefaultSession["user"]
  }
}
