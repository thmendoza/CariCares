import { redirect } from "next/navigation";
import { auth, signOut } from "@/lib/auth";
import { db } from "@/lib/db";
import { Mascot } from "@/components/shared/mascot";
import { AutoRedirect } from "@/components/shared/auto-redirect";

export default async function PendingApprovalPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  const dbUser = await db.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, accountStatus: true },
  });

  if (!dbUser?.role) {
    redirect("/role-select");
  }

  // Approved — JWT may be stale; send to sign-in for a fresh token
  if (dbUser.accountStatus === "ACTIVE") {
    return (
      <AutoRedirect to="/sign-in">
        <div className="min-h-screen flex items-center justify-center bg-primary/10">
          <div className="text-center">
            <Mascot scene="celebrate" size="lg" className="mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">Your account is approved! Redirecting…</p>
          </div>
        </div>
      </AutoRedirect>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md text-center">
        <Mascot scene="read" size="lg" className="mx-auto mb-6" />
        <h1 className="text-xl font-bold text-foreground mb-2">
          You&apos;re on the list!
        </h1>
        <p className="text-sm text-muted-foreground mb-2">
          Your account is pending approval from a School Admin.
        </p>
        <p className="text-sm text-muted-foreground mb-8">
          You&apos;ll get access as soon as they approve your request. Feel free
          to close this tab and come back later.
        </p>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/sign-in" });
          }}
        >
          <button
            type="submit"
            className="text-sm text-muted-foreground/70 hover:text-muted-foreground underline underline-offset-2 transition-colors"
          >
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}
