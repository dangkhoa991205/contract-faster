import mammoth from "mammoth";
import PizZip from "pizzip";

/**
 * Extracts paragraph text-alignment values from DOCX XML in document order.
 * Skips empty paragraphs (no runs/drawings) because mammoth ignores them too.
 */
function extractAlignments(docXml: string): string[] {
  const alignments: string[] = [];
  const paraRe = /<w:p[ >][\s\S]*?<\/w:p>/g;
  let m: RegExpExecArray | null;
  while ((m = paraRe.exec(docXml)) !== null) {
    const xml = m[0];
    // Skip empty paragraphs (no runs, no drawings, no hyperlinks)
    if (!/<w:r[ >]/.test(xml) && !/<w:drawing/.test(xml) && !/<w:hyperlink/.test(xml)) continue;
    const jc = xml.match(/<w:jc\s+w:val="([^"]+)"/);
    alignments.push(
      !jc ? "" :
      jc[1] === "center" ? "center" :
      jc[1] === "right" ? "right" :
      jc[1] === "both" ? "justify" : ""
    );
  }
  return alignments;
}

/**
 * Converts a DOCX buffer to HTML, preserving paragraph alignment
 * (center / right / justify) that mammoth drops by default.
 */
export async function convertToHtmlWithAlignment(buffer: Buffer): Promise<string> {
  let alignments: string[] = [];
  try {
    const zip = new PizZip(buffer);
    const file = zip.file("word/document.xml");
    if (file) alignments = extractAlignments(file.asText());
  } catch { /* fall back gracefully */ }

  const { value: html } = await mammoth.convertToHtml({ buffer });

  if (!alignments.length) return html;

  // Match ALL block elements that mammoth generates from DOCX paragraphs:
  // <p> regular, <h1>-<h6> headings, <li> list items
  let pIdx = 0;
  return html.replace(/<(p|h[1-6]|li)(\s[^>]*)?>/g, (match, tag, attrs) => {
    if (pIdx >= alignments.length) return match;
    const align = alignments[pIdx++];
    if (!align) return match;
    const a = attrs ?? "";
    if (a.includes('style="')) {
      return `<${tag}${a.replace(/style="([^"]*)"/, `style="$1; text-align: ${align};"`)}>`;
    }
    return `<${tag}${a} style="text-align: ${align};">`;
  });
}
