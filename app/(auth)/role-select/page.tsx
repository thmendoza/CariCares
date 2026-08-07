import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { RoleSelectForm } from "./form";
import { AutoRedirect } from "@/components/shared/auto-redirect";

export default async function RoleSelectPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  // Always read from DB — JWT may be stale
  const dbUser = await db.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, accountStatus: true },
  });

  // User already has a role and is active — JWT is stale.
  // Use client-side navigation to /sign-in so they get a fresh JWT on login.
  if (dbUser?.role && dbUser.accountStatus === "ACTIVE") {
    return <AutoRedirect to="/sign-in" />;
  }

  // User selected a role but awaiting admin approval
  if (dbUser?.role && dbUser.accountStatus !== "ACTIVE") {
    redirect("/pending-approval");
  }

  return <RoleSelectForm />;
}
