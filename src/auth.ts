import NextAuth, { NextAuthConfig } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { DefaultSession } from "next-auth"

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
});

export const authConfig: NextAuthConfig = {
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        token.id = user.id;
        token.email = user.email;
      }
      return token;
    },
    session: async ({ session, token }) => {
      if (session.user && token) {                       
        session.user.id = token.id as string;
                                         
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: {
            totalUploadSize: true,
            isAdmin: true,
          },
        });

        if (dbUser) {
          session.user.totalUploadSize = Number(dbUser.totalUploadSize);
          session.user.isAdmin = dbUser.isAdmin;
        }
      }
      return session;
    },
  },
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        try {
          const { email, password } = authSchema.parse(credentials);

          const user = await prisma.user.findUnique({
            where: { email },
            select: {
              id: true,
              email: true,
              password: true,
              name: true,
            },
          });

          if (!user || !user.password) {
            return null;
          }

          const isPasswordValid = await bcrypt.compare(password, user.password);

          if (!isPasswordValid) {
            return null;
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
          };
        } catch {
          return null;
        }
      }
    })
  ],
  secret: process.env.NEXTAUTH_SECRET,
  useSecureCookies: false, // Allow non-HTTPS
  trustHost: false, // Disable host checking
  cookies: {
    sessionToken: {
      name: 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: false
      }
    },
    csrfToken: {
      name: 'next-auth.csrf-token', 
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: false
      }
    }
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  ...authConfig,
});
