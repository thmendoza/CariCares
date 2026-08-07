import type { NextAuthConfig } from "next-auth";

// Edge-safe config: no DB imports, no Node.js built-ins.
// Providers are added in lib/auth.ts (server-only).
export const authConfig: NextAuthConfig = {
  providers: [],
  pages: {
    signIn: "/sign-in",
    error: "/sign-in",
  },
  callbacks: {
    // Map custom JWT claims → session.user so middleware can read role/accountStatus.
    // This runs in the Edge Runtime (no DB access), reading from the already-encoded token.
    session({ session, token }) {
      if (token.id) session.user.id = token.id as string;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const u = session.user as any;
      u.role = token.role ?? null;
      u.accountStatus = token.accountStatus ?? "PENDING_APPROVAL";
      u.adminTitle = token.adminTitle ?? null;
      return session;
    },
    authorized({ auth, request }) {
      const session = auth;
      const path = request.nextUrl.pathname;
      const isAuthed = !!session?.user;
      const isActive = session?.user?.accountStatus === "ACTIVE";
      const role = session?.user?.role;

      if (
        path.startsWith("/sign-in") ||
        path.startsWith("/sign-up") ||
        path.startsWith("/api/auth") ||
        path.startsWith("/api/register") ||
        path === "/"
      ) {
        return true;
      }

      if (!isAuthed) return Response.redirect(new URL("/sign-in", request.url));

      if (!role && path !== "/role-select" && path !== "/pending-approval") {
        return Response.redirect(new URL("/role-select", request.url));
      }

      if (role && !isActive && path !== "/pending-approval") {
        return Response.redirect(new URL("/pending-approval", request.url));
      }

      if (isActive && (path === "/role-select" || path === "/pending-approval")) {
        return Response.redirect(new URL("/dashboard", request.url));
      }

      if (
        path.startsWith("/coordinator") &&
        role !== "ACADEMIC_COORDINATOR" &&
        role !== "SCHOOL_ADMIN"
      ) {
        return Response.redirect(new URL("/dashboard", request.url));
      }

      if (path.startsWith("/admin") && role !== "SCHOOL_ADMIN") {
        return Response.redirect(new URL("/dashboard", request.url));
      }

      return true;
    },
  },
};
