import { useState, useMemo } from "react";
import { Navigate, useLocation } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Download, Send, Sparkles, CheckCircle2, AlertTriangle } from "lucide-react";
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType,
  PageBreak, LevelFormat, TableOfContents, Footer, PageNumber,
} from "docx";
import { saveAs } from "file-saver";

const today = new Date().toLocaleDateString("pt-BR");

// Margins: 2.5cm top/bottom, 3cm left/right (in DXA: 1cm = 567 DXA)
const MARGIN_TOP = 1418;    // 2.5cm
const MARGIN_BOTTOM = 1418; // 2.5cm
const MARGIN_LEFT = 1701;   // 3cm
const MARGIN_RIGHT = 1701;  // 3cm
const PAGE_WIDTH = 11906;   // A4
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT; // ~8504

interface CheckItem {
  label: string;
  ok: boolean;
}

function analyzeChecklist(text: string): CheckItem[] {
  return [
    { label: "Codificação", ok: /codifica|código:/i.test(text) },
    { label: "Apresentação", ok: /apresentação/i.test(text) },
    { label: "Objetivo", ok: /objetivo/i.test(text) },
    { label: "Abrangência", ok: /abrang/i.test(text) },
    { label: "Competência", ok: /competência/i.test(text) },
    { label: "Siglário", ok: /siglário/i.test(text) },
    { label: "Disposições Gerais", ok: /disposiç/i.test(text) },
    { label: "Alterações de Versões", ok: /alteraç.*vers|versão.*data.*controle/i.test(text) },
    { label: "Referências", ok: /referência|bibliograf/i.test(text) },
  ];
}

function stripMarkdown(text: string): string {
  return text.replace(/\*\*(.*?)\*\*/g, "$1").replace(/\*(.*?)\*/g, "$1").replace(/^#{1,6}\s*/gm, "");
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

function buildTableFromRows(rows: string[][], isVersionTable = false): Table {
  const numCols = Math.max(...rows.map(r => r.length), 1);
  const colWidth = Math.floor(CONTENT_WIDTH / numCols);
  const cellBorder = { style: BorderStyle.SINGLE, size: 1, color: "000000" };
  const borders = { top: cellBorder, bottom: cellBorder, left: cellBorder, right: cellBorder };

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

export default function Workspace() {
  const { user } = useAuth();
  const location = useLocation();
  const state = location.state as any;
  const title = state?.title || "Documento Padronizado";
  const sector = state?.sector || "";
  const docType = state?.docType || "POP/PRS";

  const [original, setOriginal] = useState(
    state?.pastedText || state?.ideaText || state?.fileName || ""
  );
  const [standardized, setStandardized] = useState(state?.standardizedText || "");

  const checklist = useMemo(() => analyzeChecklist(standardized), [standardized]);
  const completionPct = Math.round((checklist.filter((c) => c.ok).length / checklist.length) * 100);

  if (!user) return <Navigate to="/" />;

  const exportDocx = async () => {
    const cleanText = stripMarkdown(standardized);
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

    const sections: any[] = [];

    for (let pageIdx = 0; pageIdx < pages.length; pageIdx++) {
      const pageLines = pages[pageIdx];
      const children: (Paragraph | Table)[] = [];
      let i = 0;

      while (i < pageLines.length) {
        const line = pageLines[i];

        // Empty lines
        if (!line.trim()) {
          children.push(new Paragraph({ spacing: { before: 60, after: 60 }, children: [] }));
          i++;
          continue;
        }

        // Detect table blocks (lines with |)
        if (line.includes("|") && line.trim().startsWith("|")) {
          const tableLines: string[] = [];
          while (i < pageLines.length && pageLines[i].includes("|")) {
            tableLines.push(pageLines[i]);
            i++;
          }
          const rows = parseTableLines(tableLines);
          if (rows.length > 0) {
            const isVersion = rows[0]?.some(c => /vers[ãa]o/i.test(c));
            children.push(buildTableFromRows(rows, isVersion));
          }
          continue;
        }

        // Pipe-separated table without leading pipe
        if (line.includes("|") && line.split("|").length >= 3) {
          const tableLines: string[] = [];
          while (i < pageLines.length && pageLines[i].includes("|") && pageLines[i].split("|").length >= 3) {
            tableLines.push(pageLines[i]);
            i++;
          }
          const rows = parseTableLines(tableLines);
          if (rows.length > 0) {
            children.push(buildTableFromRows(rows));
          }
          continue;
        }

        // Cover title (first page, all caps, centered)
        if (pageIdx === 0 && line === line.toUpperCase() && line.length > 5 && !line.match(/^\d+\./) && i < 3) {
          children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            spacing: { before: 400, after: 200 },
            children: [new TextRun({ text: line, bold: true, font: "Arial", size: 28 })],
          }));
          i++;
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

        // Sub-items (6.1, 6.2, 6.1.1, etc)
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

        // Metadata lines (Codificação, Emissão, etc)
        if (line.match(/^(Codificação|Código|Emissão|Versão|Título|Elaboração|Aprovação|Revisão|Setor):/i)) {
          const [key, ...rest] = line.split(":");
          children.push(new Paragraph({
            spacing: { before: 40, after: 40 },
            children: [
              new TextRun({ text: key + ": ", bold: true, font: "Arial", size: 22 }),
              new TextRun({ text: rest.join(":").trim(), font: "Arial", size: 22 }),
            ],
          }));
          i++;
          continue;
        }

        // Regular paragraph - justified
        children.push(new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          spacing: { before: 40, after: 40, line: 360 }, // 1.5 line spacing
          children: [new TextRun({ text: line, font: "Arial", size: 22 })],
        }));
        i++;
      }

      sections.push({
        properties: {
          page: {
            size: { width: PAGE_WIDTH, height: 16838 },
            margin: { top: MARGIN_TOP, right: MARGIN_RIGHT, bottom: MARGIN_BOTTOM, left: MARGIN_LEFT },
          },
        },
        footers: {
          default: new Footer({
            children: [new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({ text: "Página ", font: "Arial", size: 18 }),
                new TextRun({ children: [PageNumber.CURRENT], font: "Arial", size: 18 }),
              ],
            })],
          }),
        },
        children,
      });
    }

    // If no page breaks detected, use single section
    if (sections.length === 0) {
      sections.push({
        properties: {
          page: {
            size: { width: PAGE_WIDTH, height: 16838 },
            margin: { top: MARGIN_TOP, right: MARGIN_RIGHT, bottom: MARGIN_BOTTOM, left: MARGIN_LEFT },
          },
        },
        children: [new Paragraph({ children: [new TextRun({ text: standardized, font: "Arial", size: 22 })] })],
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
      sections,
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `${title.replace(/\s+/g, "_")}_FGH.docx`);
  };

  const sendToQuality = () => {
    const code = standardized.match(/Codificação:\s*(.+)/i)?.[1]?.trim() || "[A PREENCHER PELA QUALIDADE]";
    const subject = encodeURIComponent(`Documento para Revisão - ${title}`);
    const body = encodeURIComponent(
      `Prezado(a) Setor de Qualidade,\n\nSegue para revisão o documento:\n\nTítulo: ${title}\nTipo: ${docType}\nCodificação: ${code}\nVersão: 01\nElaborado por: ${user.name} - ${user.role}\nData: ${today}\n\nO documento foi padronizado através do sistema FGH Padroniza e está pronto para análise final.\n\nAtenciosamente,\n${user.name}\n${user.role}`
    );
    window.open(`mailto:hps.qualidade@hps.fghsaude.org.br?subject=${subject}&body=${body}`);
  };

  return (
    <AppLayout>
      <div className="p-4 h-[calc(100vh-4rem)] flex flex-col gap-4 animate-fade-in">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-foreground">Workspace</h1>
          <div className="flex gap-2">
            <Button onClick={exportDocx} className="bg-success text-success-foreground font-semibold gap-2 hover:bg-success/90">
              <Download className="w-4 h-4" /> Exportar .DOCX
            </Button>
            <Button variant="outline" onClick={sendToQuality} className="gap-2">
              <Send className="w-4 h-4" /> Enviar à Qualidade
            </Button>
          </div>
        </div>

        <div className="flex-1 grid grid-cols-1 lg:grid-cols-5 gap-4 min-h-0">
          <div className="lg:col-span-2 bg-card rounded-xl border shadow-card flex flex-col min-h-0">
            <div className="p-4 border-b flex items-center justify-between shrink-0">
              <div>
                <h2 className="font-semibold text-foreground text-sm">Documento Original</h2>
                <p className="text-xs text-muted-foreground">Conteúdo enviado por você (editável)</p>
              </div>
              <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-info/10 text-info">Rascunho</span>
            </div>
            <Textarea value={original} onChange={(e) => setOriginal(e.target.value)} className="flex-1 border-0 rounded-none resize-none focus-visible:ring-0 text-sm" />
          </div>

          <div className="lg:col-span-3 flex flex-col gap-4 min-h-0">
            <div className="flex-1 bg-card rounded-xl border shadow-card flex flex-col min-h-0">
              <div className="p-4 border-b flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <div>
                    <h2 className="font-semibold text-foreground text-sm">Documento Padronizado FGH</h2>
                    <p className="text-xs text-muted-foreground">Gerado por IA conforme Norma Zero</p>
                  </div>
                </div>
                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-success/10 text-success">Pronto</span>
              </div>
              <Textarea value={standardized} onChange={(e) => setStandardized(e.target.value)} className="flex-1 border-0 rounded-none resize-none focus-visible:ring-0 text-sm font-mono" />
            </div>

            <div className="bg-card rounded-xl border shadow-card p-4 shrink-0">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-foreground text-sm">Checklist de Conformidade</h3>
                <span className="text-xs font-semibold text-primary">{completionPct}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-1.5 mb-3">
                <div className="h-1.5 rounded-full gradient-primary" style={{ width: `${completionPct}%` }} />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {checklist.map((c, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-xs">
                    {c.ok ? <CheckCircle2 className="w-4 h-4 text-success shrink-0" /> : <AlertTriangle className="w-4 h-4 text-warning shrink-0" />}
                    <span className={c.ok ? "text-foreground" : "text-warning"}>{c.label}{c.ok ? " ✓" : ""}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
