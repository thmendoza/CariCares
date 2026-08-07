import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { authConfig } from "@/auth.config";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;

        const user = await db.user.findUnique({ where: { email } });
        if (!user?.password) return null;

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) return null;

        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user }) {
      const userId = (user?.id as string) ?? (token.id as string);
      if (userId) {
        const dbUser = await db.user.findUnique({
          where: { id: userId },
          select: { role: true, accountStatus: true, adminTitle: true },
        });
        token.id = userId;
        token.role = dbUser?.role ?? null;
        token.accountStatus = dbUser?.accountStatus ?? "PENDING_APPROVAL";
        token.adminTitle = dbUser?.adminTitle ?? null;
      }
      return token;
    },
    // session callback inherited from authConfig (maps token claims → session.user)
  },
});
