import { PrismaAdapter } from '@auth/prisma-adapter';
import NextAuth, { NextAuthConfig } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { prisma } from './prisma';
import { compare } from 'bcryptjs';
import { z } from 'zod';

const authSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const authConfig: NextAuthConfig = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/auth/signin',
  },
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        try {
          const { email, password } = authSchema.parse(credentials);

          const user = await prisma.user.findUnique({
            where: {
              email,
            },
          });

          if (!user || !user.password) {
            return null;
          }

          const isPasswordValid = await compare(password, user.password);

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
      },
    }),
  ],
  callbacks: {
    async session({ token, session }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.name = token.name as string | null;
        session.user.email = token.email as string;
      }

      return session;
    },
    async jwt({ token, user }) {
      if (token.email) {
        const dbUser = await prisma.user.findFirst({
          where: {
            email: token.email,
          },
        });

        if (!dbUser) {
          if (user) {
            token.id = user.id;
          }
          return token;
        }

        return {
          id: dbUser.id,
          name: dbUser.name,
          email: dbUser.email,
        };
      }
      return token;
    },
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig); 