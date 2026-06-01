import {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType,
  LevelFormat, Footer, Header, PageNumber,
  ImageRun, HorizontalPositionRelativeFrom, VerticalPositionRelativeFrom,
  HorizontalPositionAlign, VerticalPositionAlign, TextWrappingType, TextWrappingSide,
} from "docx";
import headerLogoUrl from "@/assets/header_logo.png";

const today = new Date().toLocaleDateString("pt-BR");

// Margins: 2.5cm top/bottom, 1.5cm left/right (1cm ≈ 567 DXA)
// Header anchored 0.2cm from top of page (≈113 DXA) per Norma Zero refinada.
const MARGIN_TOP = 2000;       // body starts below header table
const MARGIN_BOTTOM = 2400;    // larger footer area
const MARGIN_LEFT = 850;       // 1.5cm
const MARGIN_RIGHT = 850;      // 1.5cm
const MARGIN_HEADER = 283;     // ~0,5cm — distância do topo da página até o cabeçalho (máx. 1cm)
const MARGIN_FOOTER = 567;     // 1cm
const PAGE_WIDTH = 11906;      // A4
const PAGE_HEIGHT = 16838;     // A4
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;

const cellBorder = { style: BorderStyle.SINGLE, size: 1, color: "000000" };
const borders = { top: cellBorder, bottom: cellBorder, left: cellBorder, right: cellBorder };

function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/^#{1,6}\s*/gm, "");
}

function parseTableLines(lines: string[]): string[][] {
  const rows: string[][] = [];
  for (const line of lines) {
    if (line.includes("|")) {
      const cells = line.split("|").map(c => c.trim()).filter(c => c && !c.match(/^[-:]+$/));
      if (cells.length > 0 && !cells.every(c => c.match(/^[-:]+$/))) {
        rows.push(cells);
      }
    }
  }
  return rows;
}

function normalizePlainText(text: string): string {
  return stripMarkdown(text)
    .replace(/\[(?:COR|MARCA):#[0-9a-fA-F]{3,8}\]/g, "")
    .replace(/\[\/(?:COR|MARCA)\]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

function collectStrictBoldWhitelist(lines: string[]): Set<string> {
  const whitelist = new Set<string>();
  let inSummary = false;
  for (const raw of lines) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const upper = normalizePlainText(trimmed);
    if (upper === "SUMÁRIO" || upper === "ÍNDICE") {
      inSummary = true;
      whitelist.add(upper);
      continue;
    }
    const topLevel = trimmed.match(/^(\d+)\.\s+(.+)$/);
    const chapter = trimmed.match(/^(CAPÍTULO\s+[IVXLCDM]+\s*[-–—]\s*.+)$/i);
    if (inSummary && (topLevel || chapter)) {
      whitelist.add(upper.replace(/\s*\.{2,}\s*\d+$/, ""));
      continue;
    }
    if (inSummary && (/^\d+\.\d+/.test(trimmed) || /^[\-•●]/.test(trimmed))) continue;
    if (topLevel || chapter) {
      whitelist.add(upper);
      inSummary = false;
    }
  }
  return whitelist;
}

function isStrictBoldAllowed(line: string, whitelist: Set<string>): boolean {
  const normalized = normalizePlainText(line).replace(/\s*\.{2,}\s*\d+$/, "");
  return whitelist.has(normalized);
}

function buildTableFromRows(rows: string[][]): Table {
  const numCols = Math.max(...rows.map(r => r.length), 1);
  const colWidth = Math.floor(CONTENT_WIDTH / numCols);

  return new Table({
    alignment: AlignmentType.CENTER,
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: Array(numCols).fill(colWidth),
    rows: rows.map((row, rowIdx) =>
      new TableRow({
        children: Array.from({ length: numCols }, (_, i) =>
          new TableCell({
            borders,
            width: { size: colWidth, type: WidthType.DXA },
            shading: rowIdx === 0 ? { fill: "D9E2F3", type: ShadingType.CLEAR } : undefined,
            margins: { top: 40, bottom: 40, left: 80, right: 80 },
            children: [new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({
                text: row[i] || "",
                bold: false,
                font: "Calibri",
                size: 22,
              })],
            })],
          })
        ),
      })
    ),
  });
}

async function loadBinary(url: string): Promise<Uint8Array | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const arrayBuffer = await response.arrayBuffer();
    return new Uint8Array(arrayBuffer);
  } catch {
    return null;
  }
}

async function loadHeaderImage(): Promise<Uint8Array | null> {
  return loadBinary(headerLogoUrl);
}

async function loadTarjaImage(): Promise<Uint8Array | null> {
  return loadBinary(tarjaAzulUrl);
}

function createHeaderTable(title: string, elaboracao: string = "[a preencher]"): Table {
  // Distribute header table across the full content width (no indent)
  const col1 = Math.floor(CONTENT_WIDTH * 0.44);
  const col2 = Math.floor(CONTENT_WIDTH * 0.36);
  const col3 = CONTENT_WIDTH - col1 - col2;

  const cellProps = (w: number) => ({
    borders,
    width: { size: w, type: WidthType.DXA },
    margins: { top: 40, bottom: 40, left: 80, right: 80 },
  });

  const smallRun = (text: string, bold = false) =>
    new TextRun({ text, font: "Calibri", size: 20, bold: false });

  return new Table({
    alignment: AlignmentType.CENTER,
    width: { size: 100, type: WidthType.PERCENTAGE },
    indent: { size: 0, type: WidthType.DXA },
    columnWidths: [col1, col2, col3],
    rows: [
      // Row 1: Código | Emissão | Versão
      new TableRow({
        children: [
          new TableCell({
            ...cellProps(col1),
            children: [new Paragraph({ spacing: { after: 0, line: 240 }, children: [
              smallRun("Código: ", true), smallRun("[A PREENCHER PELA QUALIDADE]"),
            ] })],
          }),
          new TableCell({
            ...cellProps(col2),
            children: [new Paragraph({ spacing: { after: 0, line: 240 }, children: [
              smallRun("Emissão: ", true), smallRun(today),
            ] })],
          }),
          new TableCell({
            ...cellProps(col3),
            children: [new Paragraph({ spacing: { after: 0, line: 240 }, children: [
              smallRun("Versão: ", true), smallRun("001"),
            ] })],
          }),
        ],
      }),
      // Row 2: Título (merged across 3 cols)
      new TableRow({
        children: [
          new TableCell({
            ...cellProps(col1),
            columnSpan: 3,
            children: [new Paragraph({ spacing: { after: 0, line: 240 }, children: [
              smallRun("Título: ", true), smallRun(title),
            ] })],
          }),
        ],
      }),
      // Row 3: Elaboração | Aprovação | Revisão
      new TableRow({
        children: [
          new TableCell({
            ...cellProps(col1),
            children: [new Paragraph({ spacing: { after: 0, line: 240 }, children: [
              smallRun("Elaboração: ", true), smallRun(elaboracao),
            ] })],
          }),
          new TableCell({
            ...cellProps(col2),
            children: [new Paragraph({ spacing: { after: 0, line: 240 }, children: [
              smallRun("Aprovação: ", true), smallRun("[A PREENCHER]"),
            ] })],
          }),
          new TableCell({
            ...cellProps(col3),
            children: [new Paragraph({ spacing: { after: 0, line: 240 }, children: [
              smallRun("Revisão: ", true), smallRun("[A PREENCHER PELA QUALIDADE]"),
            ] })],
          }),
        ],
      }),
    ],
  });
}

function createFooterTable(): Table {
  const colW = Math.floor(CONTENT_WIDTH / 3);
  const cellProps = (w: number) => ({
    borders,
    width: { size: w, type: WidthType.DXA },
    margins: { top: 100, bottom: 100, left: 120, right: 120 },
  });
  // Calibri 10pt = size 20 (half-points)
  const footerRun = (text: string, bold = false) =>
    new TextRun({ text, font: "Calibri", size: 20, bold: false });

  return new Table({
    alignment: AlignmentType.CENTER,
    width: { size: 100, type: WidthType.PERCENTAGE },
    indent: { size: 0, type: WidthType.DXA },
    columnWidths: [colW, colW, colW],
    rows: [
      new TableRow({
        children: [
          new TableCell({
            ...cellProps(colW),
            children: [new Paragraph({ spacing: { after: 0, line: 280 }, children: [
              footerRun("Atualizado por: ", true), footerRun("[A PREENCHER]"),
            ] })],
          }),
          new TableCell({
            ...cellProps(colW),
            children: [new Paragraph({ spacing: { after: 0, line: 280 }, children: [
              footerRun("Validado por: ", true), footerRun("[A PREENCHER]"),
            ] })],
          }),
          new TableCell({
            ...cellProps(colW),
            children: [new Paragraph({ spacing: { after: 0, line: 280 }, children: [
              footerRun("Aprovado por: ", true), footerRun("[A PREENCHER]"),
            ] })],
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({ ...cellProps(colW), children: [new Paragraph({ spacing: { after: 0, line: 280 }, children: [footerRun("Data: ", true), footerRun("XX/XX/XXXX")] })] }),
          new TableCell({ ...cellProps(colW), children: [new Paragraph({ spacing: { after: 0, line: 280 }, children: [footerRun("Data: ", true), footerRun("XX/XX/XXXX")] })] }),
          new TableCell({ ...cellProps(colW), children: [new Paragraph({ spacing: { after: 0, line: 280 }, children: [footerRun("Data: ", true), footerRun("XX/XX/XXXX")] })] }),
        ],
      }),
    ],
  });
}

function createHeader(
  title: string,
  headerImage: Uint8Array | null,
  tarjaImage: Uint8Array | null,
  elaboracao: string = "[a preencher]",
): Header {
  const children: (Paragraph | Table)[] = [];

  // Institutional blue stripe — anchored, behind document.
  // Horizontal anchor: COLUMN with offset 0 (encosta na borda esquerda da área útil).
  // behindDocument:true + zIndex base garante tarja atrás de tabelas e textos.
  if (tarjaImage) {
    // Full Page Background — A4 (21cm x 29.7cm = 7559675 x 10691495 EMU).
    // Ancorada à PÁGINA, offsets 0/0, behindDoc para ficar atrás de tudo.
    children.push(new Paragraph({
      spacing: { before: 0, after: 0 },
      children: [new ImageRun({
        type: "jpg",
        data: tarjaImage,
        // 21cm x 29.7cm em pixels (96dpi): 794 x 1123
        transformation: { width: 794, height: 1123 },
        floating: {
          horizontalPosition: {
            relative: HorizontalPositionRelativeFrom.PAGE,
            offset: 0,
          },
          verticalPosition: {
            relative: VerticalPositionRelativeFrom.PAGE,
            offset: 0,
          },
          behindDocument: true,
          wrap: { type: TextWrappingType.NONE, side: TextWrappingSide.BOTH_SIDES },
          allowOverlap: true,
          zIndex: 251659264,
        },
        altText: { title: "Tarja Azul FGH", description: "Tarja institucional FGH", name: "tarja_azul_imagem.jpeg" },
      })],
    }));
  }

  if (headerImage) {
    // Logo institucional: largura fixa em cm (Norma Zero) — 18cm de largura útil,
    // proporção 8:1 mantida (1248x156). 18cm ≈ 680px, altura ≈ 85px.
    children.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      indent: { left: 0, right: 0 },
      spacing: { before: 0, after: 120 },
      children: [new ImageRun({
        type: "png",
        data: headerImage,
        transformation: { width: 680, height: 85 },
        altText: { title: "FGH Logo", description: "Logo institucional FGH", name: "header_logo.png" },
      })],
    }));
  }

  children.push(createHeaderTable(title, elaboracao));

  // Small spacer paragraph after the header table
  children.push(new Paragraph({ spacing: { before: 0, after: 0 }, children: [] }));

  return new Header({ children });
}

function createFooter(): Footer {
  return new Footer({
    children: [
      createFooterTable(),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 120, after: 0 },
        children: [
          new TextRun({ text: "Página ", font: "Calibri", size: 20 }),
          new TextRun({ children: [PageNumber.CURRENT], font: "Calibri", size: 20 }),
          new TextRun({ text: " de ", font: "Calibri", size: 20 }),
          new TextRun({ children: [PageNumber.TOTAL_PAGES], font: "Calibri", size: 20 }),
        ],
      }),
    ],
  });
}

function parseContentLines(
  lines: string[],
  title: string,
  imageAssets: { images: Record<string, string>; imageTypes: Record<string, string> },
): (Paragraph | Table)[] {
  const children: (Paragraph | Table)[] = [];
  const upperTitle = title.trim().toUpperCase();
  const boldWhitelist = collectStrictBoldWhitelist(lines);
  let i = 0;
  let firstSectionSeen = false;

  // Estado do iterador de numeração — evita duplicatas ao achatar níveis profundos.
  const seqState = new Map<string, number>();

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Metadados (já no header)
    if (trimmed.match(/^(Codificação|Código|Emissão|Versão|Título|Elaboração|Aprovação|Revisão|Setor):/i)) {
      i++;
      continue;
    }

    if (trimmed === "---QUEBRA_DE_PAGINA---") { i++; continue; }

    if (trimmed && trimmed.toUpperCase() === upperTitle) { i++; continue; }

    if (!firstSectionSeen && trimmed) {
      const isNumberedSection = /^\d+\.?\s+[A-ZÁÉÍÓÚÂÊÔÃÕÇ\/ ]{3,}/.test(line);
      const isSummary = ["SUMÁRIO", "ÍNDICE"].includes(trimmed.toUpperCase());
      const isChapter = /^CAPÍTULO/i.test(line);
      if (isNumberedSection || isSummary || isChapter) {
        firstSectionSeen = true;
      } else {
        const looksLikeTitle =
          /^[A-ZÁÉÍÓÚÂÊÔÃÕÇ0-9\/\-\s]{4,}$/.test(trimmed) ||
          /^#{1,3}\s/.test(line) ||
          trimmed.toUpperCase().includes(upperTitle);
        if (looksLikeTitle) { i++; continue; }
      }
    }

    // Marcador de imagem preservada do documento original — re-insere o blob real.
    const imgMatch = trimmed.match(/^\[IMAGEM:([^\]]+)\]$/);
    if (imgMatch) {
      const id = imgMatch[1];
      const b64 = imageAssets.images[id];
      if (b64) {
        const mime = imageAssets.imageTypes[id] || "image/png";
        const type: any = mime.includes("jpeg") || mime.includes("jpg") ? "jpg"
          : mime.includes("gif") ? "gif"
          : mime.includes("bmp") ? "bmp"
          : "png";
        try {
          const bin = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
          children.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 120, after: 120 },
            children: [new ImageRun({
              type,
              data: bin,
              transformation: { width: 520, height: 360 },
              altText: { title: id, description: "Imagem preservada do documento original", name: id },
            })],
          }));
        } catch {
          children.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: `[IMAGEM ${id} — não foi possível carregar]`, italics: true, font: "Calibri", size: 20, color: "999999" })],
          }));
        }
      } else {
        children.push(new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: "[IMAGEM PRESERVADA DO DOCUMENTO ORIGINAL]", italics: true, font: "Calibri", size: 20 })],
        }));
      }
      i++;
      continue;
    }

    // Marcador especial Bizagi
    if (trimmed.toUpperCase() === "[INSERIR IMAGEM DO BIZAGI AQUI]") {
      children.push(new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 120, after: 120 },
        children: [new TextRun({ text: "[INSERIR IMAGEM DO BIZAGI AQUI]", bold: false, italics: true, font: "Calibri", size: 22, color: "0F3460" })],
      }));
      i++;
      continue;
    }

    if (!trimmed) {
      children.push(new Paragraph({ spacing: { before: 60, after: 60 }, children: [] }));
      i++;
      continue;
    }

    // Tabelas
    if (line.includes("|") && line.trim().startsWith("|")) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].includes("|")) { tableLines.push(lines[i]); i++; }
      const rows = parseTableLines(tableLines);
      if (rows.length > 0) children.push(buildTableFromRows(rows));
      continue;
    }
    if (line.includes("|") && line.split("|").length >= 3) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].includes("|") && lines[i].split("|").length >= 3) { tableLines.push(lines[i]); i++; }
      const rows = parseTableLines(tableLines);
      if (rows.length > 0) children.push(buildTableFromRows(rows));
      continue;
    }

    if (trimmed.toUpperCase() === "SUMÁRIO" || trimmed.toUpperCase() === "ÍNDICE") {
      children.push(new Paragraph({
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
        spacing: { before: 300, after: 200 },
        children: [new TextRun({ text: trimmed.toUpperCase(), bold: isStrictBoldAllowed(trimmed, boldWhitelist), font: "Calibri", size: 28 })],
      }));
      i++;
      continue;
    }

    // Seções numeradas top-level (ex. "1. APRESENTAÇÃO") — negrito apenas no título.
    if (line.match(/^\d+\.?\s+[A-ZÁÉÍÓÚÂÊÔÃÕÇ\/ ]{3,}/)) {
      // top-level — registra contador para parent="" sob este número.
      const numMatch = line.match(/^(\d+)/);
      if (numMatch) seqState.set("", Math.max(seqState.get("") ?? 0, parseInt(numMatch[1], 10)));
      children.push(new Paragraph({
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 300, after: 120 },
        children: parseInlineRuns(line, { bold: isStrictBoldAllowed(line, boldWhitelist), size: 24 }),
      }));
      i++;
      continue;
    }

    if (line.match(/^CAPÍTULO/i)) {
      children.push(new Paragraph({
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 300, after: 120 },
        children: parseInlineRuns(line, { bold: isStrictBoldAllowed(line, boldWhitelist), size: 24 }),
      }));
      i++;
      continue;
    }

    // Subitens (6.1, 6.1.1) — máximo 3 níveis, com iterador sequencial estável.
    if (line.match(/^\d+\.\d+/)) {
      const renumbered = renumberSubsection(line, seqState);
      children.push(new Paragraph({
        indent: { left: 360 },
        spacing: { before: 100, after: 60 },
        alignment: AlignmentType.JUSTIFIED,
        children: parseInlineRuns(renumbered, { bold: false, size: 22 }),
      }));
      i++;
      continue;
    }

    if (line.match(/^[\-•●]\s/)) {
      children.push(new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        spacing: { before: 40, after: 40 },
        alignment: AlignmentType.JUSTIFIED,
        children: parseInlineRuns(line.replace(/^[\-•●]\s*/, ""), { bold: false, size: 22 }),
      }));
      i++;
      continue;
    }

    // Parágrafo regular — NUNCA em negrito.
    children.push(new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      spacing: { before: 40, after: 40, line: 360 },
      children: parseInlineRuns(line, { bold: false, size: 22 }),
    }));
    i++;
  }

  return children;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers de hierarquia + cores inline
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Renumera uma linha de subseção respeitando o limite de 3 níveis E garantindo
 * que o último dígito SEJA sequencial dentro do mesmo "parent" (ex.: 6.2.1,
 * 6.2.2, 6.2.3...). Achatar um nível profundo (ex.: 6.2.2.1.1) NUNCA pode
 * produzir números repetidos no mesmo bloco.
 */
function renumberSubsection(line: string, state: Map<string, number>): string {
  const match = line.match(/^(\d+(?:\.\d+){1,9})(\s*)(.*)$/);
  if (!match) return line;
  const originalParts = match[1].split(".").map(Number);
  const sep = match[2] || " ";
  const rest = match[3] || "";

  const wasDeeper = originalParts.length > 3;
  const capped = originalParts.slice(0, 3);
  const parentKey = capped.slice(0, -1).join(".");
  const lastUsed = state.get(parentKey) ?? 0;

  let lastDigit = capped[capped.length - 1];
  if (wasDeeper || lastDigit <= lastUsed) {
    lastDigit = lastUsed + 1;
  }
  capped[capped.length - 1] = lastDigit;
  state.set(parentKey, lastDigit);

  // Reset de filhos: ao avançar 6.2 → 6.3, esquece contadores de 6.2.*
  const fullKey = capped.join(".");
  for (const k of Array.from(state.keys())) {
    if (k.startsWith(fullKey + ".")) state.delete(k);
  }

  return `${capped.join(".")}${sep}${rest}`.trimEnd();
}

/**
 * Separa título curto (negrito) e corpo (não negrito) de subseções como
 * "6.1 Identificação: descrição...". Se a linha não tem um separador claro
 * (":" ou "—"/"–" antes de 60 chars), trata APENAS a numeração como título;
 * todo o restante vira corpo (não negrito) — evita o bug de negritar parágrafo.
 */
function splitSubsectionTitleAndBody(line: string): { headingText: string; bodyText: string } {
  const prefixMatch = line.match(/^(\d+(?:\.\d+){1,2})(\s+)(.*)$/);
  if (!prefixMatch) return { headingText: line, bodyText: "" };
  const prefix = prefixMatch[1];
  const rest = prefixMatch[3];

  // Procura separador EXPLÍCITO de "título: corpo" no início da linha.
  const sepMatch = rest.match(/^([^:\n—–]{1,60}?)(:|\s[—–-]\s)\s*(.*)$/);
  if (sepMatch) {
    const titlePart = sepMatch[1].trim();
    const body = sepMatch[3].trim();
    return { headingText: `${prefix} ${titlePart}${sepMatch[2] === ":" ? ":" : ""}`.trim(), bodyText: body };
  }

  // Sem separador. Linha curta sem pontuação interna → título inteiro.
  if (rest.length <= 60 && !/[.;]/.test(rest)) {
    return { headingText: `${prefix} ${rest}`.trim(), bodyText: "" };
  }

  // Caso geral: só a numeração é negrito; tudo o mais é corpo.
  return { headingText: prefix, bodyText: rest };
}

/**
 * Suporta cores inline via [COR:#hex] e marca-texto via [MARCA:#hex].
 * Mesmo com opts.bold=true, só os títulos whitelisted devem chamar essa opção.
 */
function parseInlineRuns(text: string, opts: { bold?: boolean; size?: number }): TextRun[] {
  const size = opts.size ?? 22;
  const bold = !!opts.bold;
  const buildRun = (value: string, style: { color?: string; highlight?: string }) => new TextRun({
    text: value,
    font: "Calibri",
    size,
    bold,
    color: style.color,
    shading: style.highlight ? { type: ShadingType.CLEAR, fill: style.highlight, color: "auto" } : undefined,
  });
  const parse = (value: string, style: { color?: string; highlight?: string } = {}): TextRun[] => {
    const out: TextRun[] = [];
    let cursor = 0;
    const open = /\[(COR|MARCA):(#?[0-9a-fA-F]{3,8})\]/g;
    let m: RegExpExecArray | null;
    while ((m = open.exec(value)) !== null) {
      if (m.index > cursor) out.push(buildRun(value.slice(cursor, m.index), style));
      const tag = m[1];
      const hex = m[2].replace("#", "").toUpperCase();
      const close = `[/${tag}]`;
      const closeIdx = value.indexOf(close, open.lastIndex);
      if (closeIdx === -1) {
        out.push(buildRun(value.slice(m.index), style));
        cursor = value.length;
        break;
      }
      const nextStyle = tag === "COR" ? { ...style, color: hex } : { ...style, highlight: hex };
      out.push(...parse(value.slice(open.lastIndex, closeIdx), nextStyle));
      cursor = closeIdx + close.length;
      open.lastIndex = cursor;
    }
    if (cursor < value.length) out.push(buildRun(value.slice(cursor), style));
    return out;
  };
  const runs = parse(text).filter((run: any) => run);
  return runs.length ? runs : [buildRun(text, {})];
}

export async function exportDocx(
  title: string,
  standardizedText: string,
  elaboracao: string = "[a preencher]",
  imageAssets: { images: Record<string, string>; imageTypes: Record<string, string> } = { images: {}, imageTypes: {} },
): Promise<Blob> {
  const cleanText = stripMarkdown(standardizedText);
  const allLines = cleanText.split("\n");

  const [headerImage, tarjaImage] = await Promise.all([loadHeaderImage(), loadTarjaImage()]);
  const header = createHeader(title, headerImage, tarjaImage, elaboracao);
  const footer = createFooter();

  const pageProps = {
    page: {
      size: { width: PAGE_WIDTH, height: PAGE_HEIGHT },
      margin: {
        top: MARGIN_TOP, right: MARGIN_RIGHT, bottom: MARGIN_BOTTOM, left: MARGIN_LEFT,
        header: MARGIN_HEADER, footer: MARGIN_FOOTER,
      },
    },
    titlePage: false,
  };

  const numbering = {
    config: [{
      reference: "bullets",
      levels: [{
        level: 0,
        format: LevelFormat.BULLET,
        text: "\u2022",
        alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 720, hanging: 360 } } },
      }],
    }],
  };

  const bodyChildren = parseContentLines(allLines, title, imageAssets);

  const sectionChildren = bodyChildren.length > 0 ? bodyChildren : [
    new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      children: [new TextRun({ text: standardizedText, font: "Calibri", size: 22 })],
    }),
  ];

  const doc = new Document({
    styles: {
      default: { document: { run: { font: "Calibri", size: 22 } } },
      paragraphStyles: [
        { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
          run: { size: 28, bold: false, font: "Calibri" },
          paragraph: { spacing: { before: 300, after: 200 }, outlineLevel: 0 } },
        { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
          run: { size: 24, bold: false, font: "Calibri" },
          paragraph: { spacing: { before: 200, after: 120 }, outlineLevel: 1 } },
      ],
    },
    numbering,
    sections: [{
      properties: pageProps,
      headers: { default: header },
      footers: { default: footer },
      children: sectionChildren,
    }],
  });

  return Packer.toBlob(doc);
}

