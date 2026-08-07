import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function CoordinatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (
    session?.user?.role !== "ACADEMIC_COORDINATOR" &&
    session?.user?.role !== "SCHOOL_ADMIN"
  ) {
    redirect("/dashboard");
  }
  return <>{children}</>;
}
