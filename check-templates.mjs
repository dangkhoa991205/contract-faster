import { readFile } from "fs/promises";
import { join } from "path";

// Read prisma config to get DB URL
const { db } = await import("./lib/db.ts").catch(() => null) || {};

// Just scan uploads folder
import { readdirSync, existsSync } from "fs";

const uploadDir = join(process.cwd(), "uploads", "templates");
if (existsSync(uploadDir)) {
  const files = readdirSync(uploadDir);
  console.log("Files in uploads/templates:", files);

  // Check first DOCX for tokens
  const docxFiles = files.filter(f => f.endsWith(".docx"));
  if (docxFiles.length > 0) {
    const mammoth = await import("mammoth");
    for (const f of docxFiles.slice(0, 3)) {
      const buf = await readFile(join(uploadDir, f));
      const { value } = await mammoth.default.extractRawText({ buffer: buf });
      const tokens = [...value.matchAll(/\{\{([^}]+)\}\}/g)].map(m => m[1].trim());
      console.log(`\n${f}:`);
      console.log("Tokens found:", tokens.length > 0 ? tokens : "NONE - no {{}} placeholders!");
      console.log("First 300 chars:", value.slice(0, 300));
    }
  }
} else {
  console.log("No uploads/templates directory found");
}
