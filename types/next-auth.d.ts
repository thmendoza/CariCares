import { DefaultSession } from "next-auth";
import { Role, AdminTitle, AccountStatus } from "@/app/generated/prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role | null;
      accountStatus: AccountStatus;
      adminTitle: AdminTitle | null;
    } & DefaultSession["user"];
  }
}
