import { readFile } from "fs/promises";
import { join } from "path";

/**
 * Read a template/contract file from either Vercel Blob (production)
 * or local filesystem (development), based on the fileUrl stored in DB.
 */
export async function readDocxBuffer(fileUrl: string): Promise<Buffer> {
  if (fileUrl.startsWith("http://") || fileUrl.startsWith("https://")) {
    // Vercel Blob or any remote URL
    const res = await fetch(fileUrl);
    if (!res.ok) throw new Error(`Failed to fetch file: ${res.statusText}`);
    return Buffer.from(await res.arrayBuffer());
  }
  // Local filesystem (development)
  const filePath = join(process.cwd(), fileUrl.replace(/^\//, ""));
  return readFile(filePath);
}
