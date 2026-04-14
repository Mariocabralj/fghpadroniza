import {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType,
  PageBreak, LevelFormat, Footer, Header, PageNumber,
  ImageRun, VerticalAlign, SectionType,
} from "docx";

const today = new Date().toLocaleDateString("pt-BR");

// Margins: 2.5cm top/bottom, 3cm left/right (1cm = 567 DXA)
const MARGIN_TOP = 1418;
const MARGIN_BOTTOM = 1418;
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

async function loadHeaderImage(): Promise<Buffer | null> {
  try {
    const response = await fetch("/templates/header_logo.png");
    if (!response.ok) return null;
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch {
    return null;
  }
}

function createHeaderTable(title: string): Table {
  const col1 = 4030;
  const col2 = 4016;
  const col3 = 1730;
  const totalWidth = col1 + col2 + col3;

  const cellProps = (w: number) => ({
    borders,
    width: { size: w, type: WidthType.DXA as const },
    margins: { top: 20, bottom: 20, left: 60, right: 60 },
  });

  const smallRun = (text: string, bold = false) =>
    new TextRun({ text, font: "Arial", size: 20, bold });

  return new Table({
    width: { size: totalWidth, type: WidthType.DXA },
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
      // Row 2: Título (merged visually across 3 cols)
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
    width: { size: w, type: WidthType.DXA as const },
    margins: { top: 20, bottom: 20, left: 60, right: 60 },
  });
  const tinyRun = (text: string) =>
    new TextRun({ text, font: "Arial", size: 16 });

  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: [colW, colW, colW],
    rows: [
      new TableRow({
        children: [
          new TableCell({
            ...cellProps(colW),
            children: [new Paragraph({ spacing: { after: 0, line: 240 }, children: [
              tinyRun("Atualizado por: [A PREENCHER]"),
            ] })],
          }),
          new TableCell({
            ...cellProps(colW),
            children: [new Paragraph({ spacing: { after: 0, line: 240 }, children: [
              tinyRun("Validado por: [A PREENCHER]"),
            ] })],
          }),
          new TableCell({
            ...cellProps(colW),
            children: [new Paragraph({ spacing: { after: 0, line: 240 }, children: [
              tinyRun("Aprovado por: [A PREENCHER]"),
            ] })],
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({ ...cellProps(colW), children: [new Paragraph({ spacing: { after: 0, line: 240 }, children: [tinyRun("Data: XX/XX/XXXX")] })] }),
          new TableCell({ ...cellProps(colW), children: [new Paragraph({ spacing: { after: 0, line: 240 }, children: [tinyRun("Data: XX/XX/XXXX")] })] }),
          new TableCell({ ...cellProps(colW), children: [new Paragraph({ spacing: { after: 0, line: 240 }, children: [tinyRun("Data: XX/XX/XXXX")] })] }),
        ],
      }),
    ],
  });
}

function createHeader(title: string, headerImage: Buffer | null): Header {
  const children: (Paragraph | Table)[] = [];

  if (headerImage) {
    children.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
      children: [new ImageRun({
        type: "png",
        data: headerImage,
        transformation: { width: 580, height: 59 },
        altText: { title: "FGH Logo", description: "Logo institucional FGH", name: "header-logo" },
      })],
    }));
  }

  children.push(createHeaderTable(title));

  return new Header({ children });
}

function createFooter(): Footer {
  return new Footer({
    children: [
      createFooterTable(),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 60 },
        children: [
          new TextRun({ text: "Página ", font: "Arial", size: 16 }),
          new TextRun({ children: [PageNumber.CURRENT], font: "Arial", size: 16 }),
        ],
      }),
    ],
  });
}

function parseContentLines(lines: string[]): (Paragraph | Table)[] {
  const children: (Paragraph | Table)[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Skip metadata lines (now in header)
    if (line.match(/^(Codificação|Código|Emissão|Versão|Título|Elaboração|Aprovação|Revisão|Setor):/i)) {
      i++;
      continue;
    }

    // Empty lines
    if (!line.trim()) {
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
    if (line.trim().toUpperCase() === "SUMÁRIO" || line.trim().toUpperCase() === "ÍNDICE") {
      children.push(new Paragraph({
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
        spacing: { before: 300, after: 200 },
        children: [new TextRun({ text: line.trim().toUpperCase(), bold: true, font: "Arial", size: 28 })],
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

  // Split by page break markers
  const pages: string[][] = [[]];
  for (const line of allLines) {
    if (line.trim() === "---QUEBRA_DE_PAGINA---") {
      pages.push([]);
    } else {
      pages[pages.length - 1].push(line);
    }
  }

  const headerImage = await loadHeaderImage();
  const header = createHeader(title, headerImage);
  const footer = createFooter();

  const pageProps = {
    page: {
      size: { width: PAGE_WIDTH, height: PAGE_HEIGHT },
      margin: { top: 2268, right: MARGIN_RIGHT, bottom: MARGIN_BOTTOM, left: MARGIN_LEFT }, // Extra top margin for header
    },
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

  // SECTION 1: Cover page - vertically centered title
  const coverSection = {
    properties: {
      ...pageProps,
      verticalAlign: VerticalAlign.CENTER,
    },
    headers: { default: header },
    footers: { default: footer },
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 200 },
        children: [new TextRun({
          text: "DOCUMENTO OFICIAL",
          bold: true,
          font: "Arial",
          size: 20,
          color: "00377B",
        })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 200, after: 0 },
        children: [new TextRun({
          text: "Versão vigente para uso institucional",
          font: "Arial",
          size: 18,
          italics: true,
          color: "666666",
        })],
      }),
      new Paragraph({ spacing: { before: 600 }, children: [] }),
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
        spacing: { before: 400, after: 400 },
        children: [new TextRun({
          text: title.toUpperCase(),
          bold: true,
          font: "Arial",
          size: 28,
        })],
      }),
    ],
  };

  // SECTION 2+: Content pages
  const contentSections: any[] = [];

  // If pages were split by page break markers, process each
  // Skip first page content if it's just the title (already on cover)
  let startPage = 0;
  if (pages.length > 1) {
    // First page content was the cover, skip metadata lines
    const firstPageClean = pages[0].filter(l => 
      !l.match(/^(Codificação|Código|Emissão|Versão|Título|Elaboração|Aprovação|Revisão|Setor):/i) &&
      l.trim() !== title.toUpperCase() &&
      l.trim().length > 0
    );
    if (firstPageClean.length === 0) {
      startPage = 1; // Skip empty cover page content
    }
  }

  for (let pageIdx = startPage; pageIdx < pages.length; pageIdx++) {
    const pageLines = pages[pageIdx];
    // Filter out cover title duplicates
    const filteredLines = pageLines.filter(l => {
      const trimmed = l.trim();
      if (pageIdx === 0 && trimmed === title.toUpperCase()) return false;
      return true;
    });

    const children = parseContentLines(filteredLines);
    if (children.length === 0) continue;

    contentSections.push({
      properties: {
        ...pageProps,
        ...(pageIdx === startPage ? { type: SectionType.NEXT_PAGE } : {}),
      },
      headers: { default: header },
      footers: { default: footer },
      children,
    });
  }

  // If no content sections, add a minimal one
  if (contentSections.length === 0) {
    const children = parseContentLines(allLines);
    contentSections.push({
      properties: pageProps,
      headers: { default: header },
      footers: { default: footer },
      children: children.length > 0 ? children : [
        new Paragraph({ children: [new TextRun({ text: standardizedText, font: "Arial", size: 22 })] }),
      ],
    });
  }

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
    sections: [coverSection, ...contentSections],
  });

  return Packer.toBlob(doc);
}
