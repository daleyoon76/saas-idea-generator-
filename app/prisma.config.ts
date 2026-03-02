import path from "node:path";
import dotenv from "dotenv";
import { defineConfig } from "prisma/config";

// Next.js 프로젝트이므로 .env.local 우선 로드
dotenv.config({ path: path.resolve(__dirname, ".env.local") });
dotenv.config(); // .env 폴백

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DIRECT_URL"] || process.env["DATABASE_URL"],
  },
});
