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
  const hashed = await bcrypt.hash(rawPassword, 12);
  await db.user.update({
    where: { email },
    data: { password: hashed },
  });
  console.log(`Password reset for ${email} — change after first sign-in.`);
}

main().finally(() => db.$disconnect());
