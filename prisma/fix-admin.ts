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
  const rawPassword = process.env.BOOTSTRAP_ADMIN_PASSWORD;
  if (!email || !rawPassword) {
    throw new Error("BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_PASSWORD must be set in .env.local");
  }

  const existing = await db.user.findUnique({ where: { email } });

  if (existing) {
    console.log(`Found user: ${email}`);
    console.log(`  role: ${existing.role}`);
    console.log(`  accountStatus: ${existing.accountStatus}`);
    console.log(`  adminTitle: ${existing.adminTitle}`);

    const hashed = await bcrypt.hash(rawPassword, 12);
    const updated = await db.user.update({
      where: { email },
      data: {
        role: "SCHOOL_ADMIN",
        adminTitle: "SCHOOL_DIRECTOR",
        accountStatus: "ACTIVE",
        approvedAt: new Date(),
        password: hashed,
      },
    });
    console.log(`\nFixed: role=${updated.role}, status=${updated.accountStatus}`);
    console.log(`Password reset to: ${rawPassword}`);
  } else {
    const hashed = await bcrypt.hash(rawPassword, 12);
    const admin = await db.user.create({
      data: {
        email,
        name: "Thmendoza",
        role: "SCHOOL_ADMIN",
        adminTitle: "SCHOOL_DIRECTOR",
        accountStatus: "ACTIVE",
        approvedAt: new Date(),
        password: hashed,
      },
    });
    console.log(`Created admin: ${admin.email}`);
    console.log(`Password: ${rawPassword}`);
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
