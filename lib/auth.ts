import NextAuth from "next-auth"
import GitHub from "next-auth/providers/github"
import Keycloak from "next-auth/providers/keycloak"
import { getProviderConfigs } from "@/lib/auth-providers"

const providerConfigs = getProviderConfigs()

const providers = providerConfigs.map((cfg) => {
  if (cfg.type === "github") {
    return GitHub({ clientId: cfg.clientId, clientSecret: cfg.clientSecret })
  }
  if (cfg.type === "keycloak") {
    return Keycloak({ clientId: cfg.clientId, clientSecret: cfg.clientSecret, issuer: cfg.issuer! })
  }
  return null
}).filter((p): p is NonNullable<typeof p> => p !== null)

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.provider = account.provider
        token.providerAccountId = account.providerAccountId
      }
      return token
    },
    async session({ session, token }) {
      session.user.provider = token.provider as string
      session.user.providerAccountId = token.providerAccountId as string
      return session
    },
    authorized({ auth: session }) {
      return !!session?.user
    },
  },
  trustHost: true,
})

export { providerConfigs }
