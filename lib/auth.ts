import NextAuth from "next-auth"
import GitHub from "next-auth/providers/github"
import Keycloak from "next-auth/providers/keycloak"
import Credentials from "next-auth/providers/credentials"
import { getProviderConfigs } from "@/lib/auth-providers"
import { getDb, queryRow, save } from "@/lib/db"
import { mapRealmRoles } from "@/lib/role-mapping"
import { isAdminLoginEnabled } from "@/lib/admin-login"

const providerConfigs = getProviderConfigs()

const providers = [
  ...(isAdminLoginEnabled()
    ? [
        Credentials({
          id: "credentials",
          name: "Server Admin",
          credentials: {
            username: { label: "Username", type: "text" },
            password: { label: "Password", type: "password" },
          },
          async authorize(credentials) {
            const username = credentials?.username as string | undefined
            const password = credentials?.password as string | undefined
            if (
              username &&
              password &&
              username === process.env.ADMIN_USERNAME &&
              password === process.env.ADMIN_PASSWORD
            ) {
              return { id: "admin", name: "Server Admin", email: "admin@localhost", isAdmin: true }
            }
            return null
          },
        }),
      ]
    : []),
  ...providerConfigs.map((cfg) => {
    if (cfg.type === "github") {
      return GitHub({ clientId: cfg.clientId, clientSecret: cfg.clientSecret })
    }
    if (cfg.type === "keycloak") {
      return Keycloak({
        clientId: cfg.clientId,
        clientSecret: cfg.clientSecret,
        issuer: cfg.issuer!,
        profile(profile) {
          return {
            id: profile.sub,
            name: profile.name ?? profile.preferred_username,
            email: profile.email,
            image: profile.picture,
            realmRoles: profile.realm_access?.roles ?? [],
          }
        },
      })
    }
    return null
  }).filter((p): p is NonNullable<typeof p> => p !== null),
]

async function provisionRoleForEmail(
  name: string,
  email: string,
  realmRoles: string[]
): Promise<string> {
  const db = await getDb()
  const existing = queryRow(db, "SELECT role FROM users WHERE email = ?", [email])
  if (existing) {
    return (existing.role as string) ?? ""
  }

  const role = mapRealmRoles(realmRoles, process.env.ROLE_MAPPING)
  const createdAt = new Date().toISOString().split("T")[0]
  db.run(
    "INSERT INTO users (id, name, email, role, status, created_at) VALUES (?, ?, ?, ?, 'active', ?)",
    [String(Date.now()), name || email, email, role ?? "", createdAt]
  )
  save(db)
  return role ?? ""
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  callbacks: {
    async jwt({ token, user, account }) {
      if (account) {
        token.provider = account.provider
        token.providerAccountId = account.providerAccountId
      }
      if (user) {
        if (user.isAdmin) {
          token.isAdmin = true
          delete token.role
        } else {
          token.isAdmin = false
          token.role = await provisionRoleForEmail(
            user.name ?? "",
            user.email ?? "",
            user.realmRoles ?? []
          )
        }
      }
      return token
    },
    async session({ session, token }) {
      session.user.provider = token.provider as string
      session.user.providerAccountId = token.providerAccountId as string
      session.user.role = token.role as string | undefined
      session.user.isAdmin = token.isAdmin as boolean | undefined
      return session
    },
    authorized({ auth: session }) {
      return !!session?.user
    },
  },
  trustHost: true,
})

export { providerConfigs }
