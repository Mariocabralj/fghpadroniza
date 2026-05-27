// Text extraction helpers for upload files (PDF, DOCX, TXT).
// All extractors return plain text + image binaries (base64) suitable for the
// AI pipeline AND for re-insertion no DOCX final.

import * as pdfjsLib from "pdfjs-dist";
// @ts-ignore - vite worker import
import PdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?worker";
import mammoth from "mammoth";

pdfjsLib.GlobalWorkerOptions.workerPort = new PdfWorker();

export interface ExtractedDoc {
  text: string;
  /** id → base64 (sem prefixo data:) */
  images: Record<string, string>;
  /** id → mime (image/png, image/jpeg…) */
  imageTypes: Record<string, string>;
}

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

async function extractFromPdf(file: File): Promise<ExtractedDoc> {
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
  return { text: parts.join("\n\n"), images: {}, imageTypes: {} };
}

async function extractFromDocx(file: File): Promise<ExtractedDoc> {
  const buffer = await readFileAsArrayBuffer(file);
  const images: Record<string, string> = {};
  const imageTypes: Record<string, string> = {};
  let counter = 0;

  try {
    const html = await mammoth.convertToHtml(
      { arrayBuffer: buffer },
      {
        convertImage: mammoth.images.imgElement((image: any) =>
          image.read("base64").then((b64: string) => {
            counter += 1;
            const id = `img_${counter}`;
            images[id] = b64;
            imageTypes[id] = image.contentType || "image/png";
            // src serve como marcador para o htmlToPipeText converter em [IMAGEM:id]
            return { src: `__FGH_IMG__${id}__` };
          }),
        ),
      } as any,
    );
    return { text: htmlToPipeText(html.value || ""), images, imageTypes };
  } catch {
    const result = await mammoth.extractRawText({ arrayBuffer: buffer });
    return { text: result.value || "", images, imageTypes };
  }
}

/** HTML do mammoth → texto puro com tabelas em pipe, marcadores [IMAGEM:id]
 * e tags [COR:#hex]...[/COR] para cores inline definidas pelo usuário. */
function htmlToPipeText(html: string): string {
  if (typeof window === "undefined" || !html) return html;
  const doc = new DOMParser().parseFromString(html, "text/html");

  const walk = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent || "";
    if (node.nodeType !== Node.ELEMENT_NODE) return "";
    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();

    if (tag === "img") {
      const src = el.getAttribute("src") || "";
      const m = src.match(/__FGH_IMG__(.+?)__/);
      if (m) return `\n[IMAGEM:${m[1]}]\n`;
      return "\n[IMAGEM PRESERVADA DO DOCUMENTO ORIGINAL]\n";
    }
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

  return walk(doc.body).replace(/\n{3,}/g, "\n\n").trim();
}

function cssColorToHex(c: string): string | null {
  if (c.startsWith("#")) return c.length === 7 ? c : null;
  const m = c.match(/rgba?\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (!m) return null;
  const hex = (n: number) => n.toString(16).padStart(2, "0");
  return "#" + hex(+m[1]) + hex(+m[2]) + hex(+m[3]);
}

/** Extrai texto + imagens de um arquivo enviado pelo usuário. */
export async function extractDocumentFromFile(file: File): Promise<ExtractedDoc> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf")) return extractFromPdf(file);
  if (name.endsWith(".docx")) return extractFromDocx(file);
  if (name.endsWith(".txt") || file.type.startsWith("text/")) {
    return { text: await readFileAsPlainText(file), images: {}, imageTypes: {} };
  }
  return { text: await readFileAsPlainText(file), images: {}, imageTypes: {} };
}

/** Compat: mantém retorno só de texto para chamadas antigas. */
export async function extractTextFromFile(file: File): Promise<string> {
  const doc = await extractDocumentFromFile(file);
  return doc.text;
}
