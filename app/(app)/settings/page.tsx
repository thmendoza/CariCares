import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

const ROLE_LABELS: Record<string, string> = {
  TEACHER: "Teacher",
  ACADEMIC_COORDINATOR: "Coordinator",
  SCHOOL_ADMIN: "Admin",
  THERAPIST: "Therapist",
};

export default async function SettingsPage() {
  const session = await auth();
  if (!session) redirect("/sign-in");

  const { name, email, role, adminTitle } = session.user;

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-h1 text-foreground mb-6">Settings</h1>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Name</span>
            <span className="text-foreground font-medium">{name ?? "—"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Email</span>
            <span className="text-foreground font-medium">{email ?? "—"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Role</span>
            <span className="text-foreground font-medium">
              {ROLE_LABELS[role ?? ""] ?? role}
              {adminTitle ? ` (${adminTitle.replace(/_/g, " ")})` : ""}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="flex items-center justify-between opacity-50 pointer-events-none">
            <div>
              <p className="text-foreground font-medium">Email notifications</p>
              <p className="text-xs text-muted-foreground">Coming soon</p>
            </div>
            <div className="w-9 h-5 rounded-full bg-cream relative flex-shrink-0">
              <div className="w-4 h-4 rounded-full bg-card shadow-sm absolute top-0.5 left-0.5" />
            </div>
          </div>
          <div className="flex items-center justify-between opacity-50 pointer-events-none">
            <div>
              <p className="text-foreground font-medium">Dark mode</p>
              <p className="text-xs text-muted-foreground">Coming soon</p>
            </div>
            <div className="w-9 h-5 rounded-full bg-cream relative flex-shrink-0">
              <div className="w-4 h-4 rounded-full bg-card shadow-sm absolute top-0.5 left-0.5" />
            </div>
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground mt-4">
        To change your name, email, or password, please contact a School Admin.
      </p>
    </div>
  );
}
