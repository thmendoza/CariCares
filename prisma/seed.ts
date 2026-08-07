import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const db = new PrismaClient({ adapter });

async function main() {
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL;
  if (!email) {
    console.error("BOOTSTRAP_ADMIN_EMAIL env var is not set. Skipping seed.");
    return;
  }

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Bootstrap admin already exists: ${email}`);
    return;
  }

  const rawPassword = process.env.BOOTSTRAP_ADMIN_PASSWORD;
  if (!rawPassword) {
    console.error("BOOTSTRAP_ADMIN_PASSWORD env var is not set. Skipping seed.");
    return;
  }
  const hashed = await bcrypt.hash(rawPassword, 12);

  const admin = await db.user.create({
    data: {
      email,
      name: "Bootstrap Admin",
      role: "SCHOOL_ADMIN",
      adminTitle: "SCHOOL_DIRECTOR",
      accountStatus: "ACTIVE",
      approvedAt: new Date(),
      password: hashed,
    },
  });

  console.log(`Bootstrap admin created: ${admin.email} (${admin.id})`);
  console.log(`Password: ${rawPassword}  ← change this after first sign-in`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
