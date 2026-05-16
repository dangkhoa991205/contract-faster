import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { readDocxBuffer } from "@/lib/read-file";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const contract = await db.contract.findFirst({
    where: { id, userId: session.user.id },
    include: { template: true },
  });

  if (!contract) {
    return NextResponse.json({ error: "Contract not found" }, { status: 404 });
  }

  const templateBuffer = await readDocxBuffer(contract.template.fileUrl);

  const zip = new PizZip(templateBuffer);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
  });

  doc.render(contract.fieldValues as Record<string, string>);

  const outputBuffer = doc
    .getZip()
    .generate({ type: "nodebuffer", compression: "DEFLATE" });

  const outputDir = join(process.cwd(), "uploads", "contracts");
  await mkdir(outputDir, { recursive: true });

  const filename = `contract-${id}-${Date.now()}.docx`;
  const outputPath = join(outputDir, filename);
  await writeFile(outputPath, outputBuffer);

  const outputUrl = `/uploads/contracts/${filename}`;

  await db.contract.update({
    where: { id },
    data: { outputUrl, status: "COMPLETED" },
  });

  return new NextResponse(outputBuffer as unknown as BodyInit, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${contract.title.replace(/[^a-zA-Z0-9]/g, "_")}.docx"`,
    },
  });
}
