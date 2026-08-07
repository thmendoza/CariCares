import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

// Use edge-safe config (no DB, no Node built-ins) in middleware.
export const { auth: middleware } = NextAuth(authConfig);

export const config = {
  // Excludes static asset requests from the auth gate — was missing .mp4
  // (only .png), so the redesign's landing-hero video was silently
  // 302-redirected to /sign-in instead of loading. Auth decision logic
  // itself (session/role checks in auth.config.ts) is unchanged.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.mp4$).*)"],
};
