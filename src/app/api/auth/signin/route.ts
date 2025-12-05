import { signIn } from "@/auth"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()

    // Use server-side signIn which doesn't need CSRF validation
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    })

    return NextResponse.json({ success: true, url: result })
  } catch (error) {
    console.error("Sign in error:", error)
    // NextAuth throws an error on failed auth, which is expected
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 })
  }
}
