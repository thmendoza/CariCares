import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { UserActionsClient } from "./user-actions-client";

export default async function AdminUsersPage() {
  const session = await auth();
  if (session?.user?.role !== "SCHOOL_ADMIN") redirect("/dashboard");

  const [pending, active, suspended] = await Promise.all([
    db.user.findMany({
      where: { accountStatus: "PENDING_APPROVAL", role: { not: null } },
      orderBy: { createdAt: "asc" },
    }),
    db.user.findMany({
      where: { accountStatus: "ACTIVE" },
      orderBy: { name: "asc" },
    }),
    db.user.findMany({
      where: { accountStatus: "SUSPENDED" },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div>
      <h1 className="text-h1 text-foreground mb-6">
        User Management
      </h1>

      {pending.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-3">
            Pending Approval ({pending.length})
          </h2>
          <div className="space-y-2">
            {pending.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between paper px-5 py-4"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {user.name ?? user.email}
                  </p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                  <p className="text-xs text-muted-foreground/70 mt-0.5">
                    {user.role?.replace(/_/g, " ")}
                    {user.adminTitle ? ` · ${user.adminTitle.replace(/_/g, " ")}` : ""}
                  </p>
                </div>
                <UserActionsClient userId={user.id} currentStatus="PENDING_APPROVAL" />
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="mb-8">
        <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-3">
          Active Users ({active.length})
        </h2>
        {active.length === 0 ? (
          <p className="text-sm text-muted-foreground/70">No active users yet.</p>
        ) : (
          <div className="space-y-2">
            {active.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between paper px-5 py-4"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {user.name ?? user.email}
                  </p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                  <p className="text-xs text-muted-foreground/70 mt-0.5">
                    {user.role?.replace(/_/g, " ")}
                    {user.adminTitle ? ` · ${user.adminTitle.replace(/_/g, " ")}` : ""}
                  </p>
                </div>
                <UserActionsClient userId={user.id} currentStatus="ACTIVE" />
              </div>
            ))}
          </div>
        )}
      </section>

      {suspended.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-3">
            Suspended ({suspended.length})
          </h2>
          <div className="space-y-2">
            {suspended.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between paper px-5 py-4"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {user.name ?? user.email}
                  </p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
                <UserActionsClient userId={user.id} currentStatus="SUSPENDED" />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
