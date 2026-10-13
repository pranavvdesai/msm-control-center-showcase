import fs from "fs";
import path from "path";

// Serverless file systems are read-only except /tmp, so the hosted showcase copies the bundled
// synthetic database there on cold start. Changes last only as long as the warm instance.
const target = "/tmp/msm-showcase.db";
if (!fs.existsSync(target)) {
  fs.copyFileSync(path.join(process.cwd(), "prisma", "demo.db"), target);
}
process.env.DATABASE_URL = `file:${target}`;
