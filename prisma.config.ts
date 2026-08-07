import * as dotenv from "dotenv";
import { defineConfig } from "prisma/config";

// Load .env.local first (Next.js convention), then fall back to .env
dotenv.config({ path: ".env.local" });
dotenv.config();

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // DIRECT_URL bypasses PgBouncer for migrations (required by Prisma Migrate)
    url: process.env["DIRECT_URL"] ?? process.env["DATABASE_URL"],
  },
});
