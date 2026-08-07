import { auth, signOut } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AppTopBar, type AppNavItem } from "@/components/shared/app-topbar";
import { LogOut } from "lucide-react";

const ROLE_LABELS: Record<string, string> = {
  TEACHER: "Teacher",
  ACADEMIC_COORDINATOR: "Coordinator",
  SCHOOL_ADMIN: "Admin",
  THERAPIST: "Therapist",
};

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/sign-in");

  const role = session.user.role ?? "";
  const isCoordinator = role === "ACADEMIC_COORDINATOR";
  const isAdmin = role === "SCHOOL_ADMIN";

  const displayName = session.user.name ?? session.user.email ?? "?";
  const initials = displayName
    .split(" ")
    .map((p: string) => p[0] ?? "")
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const roleLabel = ROLE_LABELS[role] ?? role;

  const navItems: AppNavItem[] = [
    { label: "Home", href: "/dashboard" },
    { label: "Connect", href: "/connect-doc" },
    ...(isCoordinator ? [{ label: "Reviews", href: "/coordinator/queue" }] : []),
    ...(isAdmin
      ? [
          { label: "Students", href: "/admin/students" },
          { label: "Users", href: "/admin/users" },
        ]
      : []),
    { label: "Settings", href: "/settings" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <AppTopBar navItems={navItems} roleLabel={roleLabel} initials={initials}>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/sign-in" });
          }}
        >
          <button
            type="submit"
            title="Sign out"
            aria-label="Sign out"
            className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors flex-shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </form>
      </AppTopBar>

      <main className="w-full px-4 sm:px-6 lg:px-8 py-8 max-w-6xl mx-auto">
        {children}
      </main>
    </div>
  );
}
