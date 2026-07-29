import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"

export default async function LoginPage() {
  const session = await auth()
  if (session?.user) redirect("/dashboard")

  return (
    <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
      <div className="flex flex-col space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
        <p className="text-sm text-muted-foreground">Sign in to your account</p>
      </div>
      <div className="grid gap-4">
        <form
          action={async () => {
            "use server"
            const { signIn } = await import("@/lib/auth")
            await signIn("github", { redirectTo: "/dashboard" })
          }}
        >
          <button className="inline-flex w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            Sign in with GitHub
          </button>
        </form>
      </div>
    </div>
  )
}
