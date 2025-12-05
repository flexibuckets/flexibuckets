import NextAuth, { type NextAuthConfig } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { z } from "zod"
import type { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      isAdmin: boolean
      totalUploadSize: number
    } & DefaultSession["user"]
  }
}

const authSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

const useSecureCookies = process.env.NEXTAUTH_URL?.startsWith("https://") ?? false

export const authConfig: NextAuthConfig = {
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        token.id = user.id
        token.email = user.email
      }
      return token
    },
    session: async ({ session, token }) => {
      if (session.user && token) {
        session.user.id = token.id as string

        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: {
              totalUploadSize: true,
              isAdmin: true,
            },
          })

          if (dbUser) {
            session.user.totalUploadSize = Number(dbUser.totalUploadSize)
            session.user.isAdmin = dbUser.isAdmin
          }
        } catch (error) {
          console.error("[auth] Failed to fetch user data:", error)
          // Set defaults if DB query fails
          session.user.totalUploadSize = 0
          session.user.isAdmin = false
        }
      }
      return session
    },
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        try {
          const { email, password } = authSchema.parse(credentials)

          const user = await prisma.user.findUnique({
            where: { email },
            select: {
              id: true,
              email: true,
              password: true,
              name: true,
            },
          })

          if (!user || !user.password) {
            return null
          }

          const isPasswordValid = await bcrypt.compare(password, user.password)

          if (!isPasswordValid) {
            return null
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
          }
        } catch {
          return null
        }
      },
    }),
  ],
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
  cookies: {
    sessionToken: {
      name: useSecureCookies ? "__Secure-next-auth.session-token" : "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: useSecureCookies,
      },
    },
    csrfToken: {
      name: useSecureCookies ? "__Host-next-auth.csrf-token" : "next-auth.csrf-token",
      options: {
        httpOnly: false, // Must be false so JS can read CSRF token
        sameSite: "lax",
        path: "/",
        secure: useSecureCookies,
      },
    },
    callbackUrl: {
      name: useSecureCookies ? "__Secure-next-auth.callback-url" : "next-auth.callback-url",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: useSecureCookies,
      },
    },
  },
}

// When using Credentials provider with JWT, do NOT use PrismaAdapter
export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt" },
  ...authConfig,
})
