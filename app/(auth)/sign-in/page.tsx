"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { CariMascot } from "@/components/shared/cari-mascot";
import { HillsBackground, HeroVeil } from "@/components/shared/hills-background";
import { LogoLockup } from "@/components/shared/logo-lockup";
import { primaryButtonClass } from "@/components/shared/lovable-buttons";

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setFormError(null);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setFormError("Incorrect email or password.");
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  }

  return (
    <div className="relative isolate flex min-h-screen items-center justify-center overflow-hidden px-6 py-16">
      <HillsBackground />
      <HeroVeil />
      <div className="relative z-10 w-full max-w-md">
        <div className="pointer-events-none relative mx-auto -mb-10 w-40">
          <CariMascot pose="wave" size={160} className="w-40" alt="Cari waving hello at the sign in page" />
        </div>
        <div className="paper px-8 pt-12 pb-9">
          <div className="flex items-center justify-center">
            <LogoLockup logosOnly />
          </div>
          <h1 className="mt-7 text-center text-3xl">Welcome back</h1>
          <p className="mt-2 text-center text-sm leading-relaxed text-muted-foreground">
            Sign in with your school account to continue.
          </p>

          {(error || formError) && (
            <div className="mt-5 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {formError ?? "Something went wrong. Please try again."}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <label className="block text-sm font-semibold">
              Email
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="you@hcjmsdi.edu.ph"
                className="mt-2 w-full rounded-xl border border-input bg-ivory px-4 py-3 text-base font-normal outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
              />
            </label>
            <label className="block text-sm font-semibold">
              Password
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="mt-2 w-full rounded-xl border border-input bg-ivory px-4 py-3 text-base font-normal outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
              />
            </label>
            <button type="submit" disabled={loading} className={primaryButtonClass("md", "w-full py-3.5")}>
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <p className="mt-6 text-center text-xs leading-relaxed text-muted-foreground">
            No account yet?{" "}
            <Link href="/sign-up" className="font-semibold text-primary hover:underline">
              Request access
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense>
      <SignInForm />
    </Suspense>
  );
}
