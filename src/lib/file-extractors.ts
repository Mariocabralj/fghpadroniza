// Text extraction helpers for upload files (PDF, DOCX, TXT).
// All extractors return plain text suitable for the AI pipeline.

import * as pdfjsLib from "pdfjs-dist";
// @ts-ignore - vite worker import
import PdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?worker";
import mammoth from "mammoth";

// Configure pdf.js worker once
pdfjsLib.GlobalWorkerOptions.workerPort = new PdfWorker();

async function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

async function readFileAsPlainText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

async function extractFromPdf(file: File): Promise<string> {
  const buffer = await readFileAsArrayBuffer(file);
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  const parts: string[] = [];
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item: any) => ("str" in item ? item.str : ""))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    if (pageText) parts.push(pageText);
  }
  return parts.join("\n\n");
}

async function extractFromDocx(file: File): Promise<string> {
  const buffer = await readFileAsArrayBuffer(file);
  // Converte para HTML para preservar tabelas e marcadores de imagem,
  // depois transforma em texto/markdown leve que o motor da IA e o exportador
  // DOCX conseguem reaproveitar (tabelas em pipe + placeholders de imagem).
  try {
    const html = await mammoth.convertToHtml(
      { arrayBuffer: buffer },
      {
        convertImage: mammoth.images.imgElement(() =>
          Promise.resolve({ src: "[IMAGEM PRESERVADA DO DOCUMENTO ORIGINAL]" })
        ),
      } as any,
    );
    return htmlToPipeText(html.value || "");
  } catch {
    const result = await mammoth.extractRawText({ arrayBuffer: buffer });
    return result.value || "";
  }
}

/**
 * Conversão leve de HTML (saída do mammoth) para texto puro com:
 *  - tabelas em formato pipe (mantidas para o exportador)
 *  - marcadores [IMAGEM PRESERVADA DO DOCUMENTO ORIGINAL] em linha própria
 *  - tags [COR:#hex]...[/COR] para cores aplicadas pelo usuário no texto
 */
function htmlToPipeText(html: string): string {
  if (typeof window === "undefined" || !html) return html;
  const doc = new DOMParser().parseFromString(html, "text/html");

  const walk = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent || "";
    if (node.nodeType !== Node.ELEMENT_NODE) return "";
    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();

    if (tag === "img") return "\n[IMAGEM PRESERVADA DO DOCUMENTO ORIGINAL]\n";
    if (tag === "br") return "\n";

    if (tag === "table") {
      const rows = Array.from(el.querySelectorAll("tr"));
      return (
        "\n" +
        rows
          .map((tr) => {
            const cells = Array.from(tr.querySelectorAll("th,td")).map((c) =>
              (c.textContent || "").replace(/\s+/g, " ").trim(),
            );
            return "| " + cells.join(" | ") + " |";
          })
          .join("\n") +
        "\n"
      );
    }

    const inner = Array.from(el.childNodes).map(walk).join("");

    // Cor inline aplicada pelo usuário (style="color: rgb(...)") — preserva via tag.
    const style = el.getAttribute("style") || "";
    const colorMatch = style.match(/color:\s*([^;]+)/i);
    let wrapped = inner;
    if (colorMatch && inner.trim()) {
      const color = cssColorToHex(colorMatch[1].trim());
      if (color && color.toUpperCase() !== "#000000") {
        wrapped = `[COR:${color}]${inner}[/COR]`;
      }
    }

    if (["p", "div", "li", "h1", "h2", "h3", "h4", "h5", "h6"].includes(tag)) {
      return wrapped + "\n";
    }
    return wrapped;
  };

  return walk(doc.body)
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function cssColorToHex(c: string): string | null {
  if (c.startsWith("#")) return c.length === 7 ? c : null;
  const m = c.match(/rgba?\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (!m) return null;
  const hex = (n: number) => n.toString(16).padStart(2, "0");
  return "#" + hex(+m[1]) + hex(+m[2]) + hex(+m[3]);
}

/**
 * Extracts plain text from a user-uploaded file.
 * Supports: .pdf, .docx, .txt (fallback for any text/* file).
 */
export async function extractTextFromFile(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf")) return extractFromPdf(file);
  if (name.endsWith(".docx")) return extractFromDocx(file);
  if (name.endsWith(".txt") || file.type.startsWith("text/")) {
    return readFileAsPlainText(file);
  }
  // Best-effort fallback
  return readFileAsPlainText(file);
}
