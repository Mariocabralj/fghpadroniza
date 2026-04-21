import {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType,
  LevelFormat, Footer, Header, PageNumber,
  ImageRun,
} from "docx";
import headerLogoUrl from "@/assets/header_logo.png";

const today = new Date().toLocaleDateString("pt-BR");

// Margins: 2.5cm top/bottom, 3cm left/right (1cm = 567 DXA)
const MARGIN_TOP = 2268;       // extra room for header (image + metadata table)
const MARGIN_BOTTOM = 2400;    // larger footer area
const MARGIN_LEFT = 1701;
const MARGIN_RIGHT = 1701;
const PAGE_WIDTH = 11906;
const PAGE_HEIGHT = 16838;
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
                bold: rowIdx === 0,
                font: "Arial",
                size: 22,
              })],
            })],
          })
        ),
      })
    ),
  });
}

async function loadHeaderImage(): Promise<Uint8Array | null> {
  try {
    const response = await fetch(headerLogoUrl);
    if (!response.ok) return null;
    const arrayBuffer = await response.arrayBuffer();
    return new Uint8Array(arrayBuffer);
  } catch {
    return null;
  }
}

function createHeaderTable(title: string): Table {
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
    new TextRun({ text, font: "Arial", size: 20, bold });

  return new Table({
    alignment: AlignmentType.CENTER,
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
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
              smallRun("Elaboração: ", true), smallRun("[A PREENCHER]"),
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
  // Arial 11pt = size 22 (half-points)
  const footerRun = (text: string, bold = false) =>
    new TextRun({ text, font: "Arial", size: 22, bold });

  return new Table({
    alignment: AlignmentType.CENTER,
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
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

function createHeader(title: string, headerImage: Uint8Array | null): Header {
  const children: (Paragraph | Table)[] = [];

  if (headerImage) {
    children.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      indent: { left: 0, right: 0 },
      spacing: { before: 0, after: 120 },
      children: [new ImageRun({
        type: "png",
        data: headerImage,
        transformation: { width: 150, height: 19 },
        altText: { title: "FGH Logo", description: "Logo institucional FGH", name: "header-logo" },
      })],
    }));
  }

  children.push(createHeaderTable(title));

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
        spacing: { before: 160, after: 0 },
        children: [
          new TextRun({ text: "Página ", font: "Arial", size: 22 }),
          new TextRun({ children: [PageNumber.CURRENT], font: "Arial", size: 22 }),
          new TextRun({ text: " de ", font: "Arial", size: 22 }),
          new TextRun({ children: [PageNumber.TOTAL_PAGES], font: "Arial", size: 22 }),
        ],
      }),
    ],
  });
}

function parseContentLines(lines: string[], title: string): (Paragraph | Table)[] {
  const children: (Paragraph | Table)[] = [];
  const upperTitle = title.trim().toUpperCase();
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip metadata lines (now in header)
    if (trimmed.match(/^(Codificação|Código|Emissão|Versão|Título|Elaboração|Aprovação|Revisão|Setor):/i)) {
      i++;
      continue;
    }

    // Skip page break markers (no cover anymore — render as a single flow)
    if (trimmed === "---QUEBRA_DE_PAGINA---") {
      i++;
      continue;
    }

    // Skip duplicated title lines from the body (title now lives only in header)
    if (trimmed && trimmed.toUpperCase() === upperTitle) {
      i++;
      continue;
    }

    // Empty lines
    if (!trimmed) {
      children.push(new Paragraph({ spacing: { before: 60, after: 60 }, children: [] }));
      i++;
      continue;
    }

    // Table blocks (lines with leading |)
    if (line.includes("|") && line.trim().startsWith("|")) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].includes("|")) {
        tableLines.push(lines[i]);
        i++;
      }
      const rows = parseTableLines(tableLines);
      if (rows.length > 0) children.push(buildTableFromRows(rows));
      continue;
    }

    // Pipe-separated table without leading pipe
    if (line.includes("|") && line.split("|").length >= 3) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].includes("|") && lines[i].split("|").length >= 3) {
        tableLines.push(lines[i]);
        i++;
      }
      const rows = parseTableLines(tableLines);
      if (rows.length > 0) children.push(buildTableFromRows(rows));
      continue;
    }

    // SUMÁRIO heading
    if (trimmed.toUpperCase() === "SUMÁRIO" || trimmed.toUpperCase() === "ÍNDICE") {
      children.push(new Paragraph({
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
        spacing: { before: 300, after: 200 },
        children: [new TextRun({ text: trimmed.toUpperCase(), bold: true, font: "Arial", size: 28 })],
      }));
      i++;
      continue;
    }

    // Section headers (numbered, all caps like "1. APRESENTAÇÃO")
    if (line.match(/^\d+\.?\s+[A-ZÁÉÍÓÚÂÊÔÃÕÇ\/ ]{3,}/)) {
      children.push(new Paragraph({
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 300, after: 120 },
        children: [new TextRun({ text: line, bold: true, font: "Arial", size: 24 })],
      }));
      i++;
      continue;
    }

    // CAPÍTULO headers
    if (line.match(/^CAPÍTULO/i)) {
      children.push(new Paragraph({
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 300, after: 120 },
        children: [new TextRun({ text: line, bold: true, font: "Arial", size: 24 })],
      }));
      i++;
      continue;
    }

    // Sub-items (6.1, 6.2, 6.1.1)
    if (line.match(/^\d+\.\d+/)) {
      children.push(new Paragraph({
        heading: HeadingLevel.HEADING_2,
        indent: { left: 360 },
        spacing: { before: 100, after: 60 },
        children: [new TextRun({ text: line, bold: true, font: "Arial", size: 22 })],
      }));
      i++;
      continue;
    }

    // Bullet items
    if (line.match(/^[\-•●]\s/)) {
      children.push(new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        spacing: { before: 40, after: 40 },
        alignment: AlignmentType.JUSTIFIED,
        children: [new TextRun({ text: line.replace(/^[\-•●]\s*/, ""), font: "Arial", size: 22 })],
      }));
      i++;
      continue;
    }

    // Regular paragraph - justified
    children.push(new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      spacing: { before: 40, after: 40, line: 360 },
      children: [new TextRun({ text: line, font: "Arial", size: 22 })],
    }));
    i++;
  }

  return children;
}

export async function exportDocx(title: string, standardizedText: string): Promise<Blob> {
  const cleanText = stripMarkdown(standardizedText);
  const allLines = cleanText.split("\n");

  const headerImage = await loadHeaderImage();
  const header = createHeader(title, headerImage);
  const footer = createFooter();

  const pageProps = {
    page: {
      size: { width: PAGE_WIDTH, height: PAGE_HEIGHT },
      margin: { top: MARGIN_TOP, right: MARGIN_RIGHT, bottom: MARGIN_BOTTOM, left: MARGIN_LEFT },
    },
    titlePage: false, // ensure header/footer are identical on the first page
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

  // No cover. Document starts directly on "1. APRESENTAÇÃO".
  const bodyChildren = parseContentLines(allLines, title);

  const sectionChildren = bodyChildren.length > 0 ? bodyChildren : [
    new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      children: [new TextRun({ text: standardizedText, font: "Arial", size: 22 })],
    }),
  ];

  const doc = new Document({
    styles: {
      default: {
        document: { run: { font: "Arial", size: 22 } },
      },
      paragraphStyles: [
        {
          id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
          run: { size: 28, bold: true, font: "Arial" },
          paragraph: { spacing: { before: 300, after: 200 }, outlineLevel: 0 },
        },
        {
          id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
          run: { size: 24, bold: true, font: "Arial" },
          paragraph: { spacing: { before: 200, after: 120 }, outlineLevel: 1 },
        },
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
