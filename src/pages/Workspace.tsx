import { useState, useMemo } from "react";
import { Navigate, useLocation } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Download, Send, Sparkles, CheckCircle2, AlertTriangle } from "lucide-react";
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType } from "docx";
import { saveAs } from "file-saver";

const today = new Date().toLocaleDateString("pt-BR");

interface CheckItem {
  label: string;
  ok: boolean;
}

function analyzeChecklist(text: string): CheckItem[] {
  const lower = text.toLowerCase();
  return [
    { label: "Código de identificação", ok: /código:/i.test(text) },
    { label: "Objetivo definido", ok: /objetivo/i.test(text) },
    { label: "Abrangência definida", ok: /abrang|âmbito/i.test(text) },
    { label: "Responsabilidades", ok: /responsabilidade|competência|elaboração/i.test(text) },
    { label: "Procedimento detalhado", ok: /procedimento|disposiç|atividade|etapa/i.test(text) },
    { label: "Referências normativas", ok: /referência|bibliograf/i.test(text) },
    { label: "Histórico de revisões", ok: /histórico|alteraç|revisões/i.test(text) },
    { label: "Aprovação", ok: /aprovad|aprovação.*:.*\S/i.test(text) && !/a definir|a preencher|___/i.test(text.match(/aprovação[:\s]*(.*)/i)?.[1] || "") },
  ];
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
    const lines = standardized.split("\n");
    const children: Paragraph[] = [];

    for (const line of lines) {
      if (!line.trim()) {
        children.push(new Paragraph({ children: [] }));
        continue;
      }

      // Section headers (numbered, all caps)
      if (line.match(/^\d+\.?\s+[A-ZÁÉÍÓÚÂÊÔÃÕÇ\/ ]{4,}$/)) {
        children.push(new Paragraph({
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 300, after: 120 },
          children: [new TextRun({ text: line, bold: true, font: "Arial", size: 24 })],
        }));
        continue;
      }

      // Chapter headers (CAPÍTULO)
      if (line.match(/^CAPÍTULO/i)) {
        children.push(new Paragraph({
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 300, after: 120 },
          children: [new TextRun({ text: line, bold: true, font: "Arial", size: 24 })],
        }));
        continue;
      }

      // Main title
      if (line.match(/^(PROCEDIMENTO OPERACIONAL|PROTOCOLO CL[ÍI]NICO|MANUAL|PLANO|POL[ÍI]TICA|REGIMENTO|FLUXOGRAMA|CARTA|ATA DE)/i)) {
        children.push(new Paragraph({
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
          spacing: { before: 200, after: 200 },
          children: [new TextRun({ text: line, bold: true, font: "Arial", size: 28 })],
        }));
        continue;
      }

      // Sub-items (5.1, 6.2, etc)
      if (line.match(/^\d+\.\d+/)) {
        children.push(new Paragraph({
          indent: { left: 360 },
          spacing: { before: 60, after: 60 },
          children: [new TextRun({ text: line, font: "Arial", size: 22 })],
        }));
        continue;
      }

      // Bullet items
      if (line.match(/^[\-•●]\s/)) {
        children.push(new Paragraph({
          indent: { left: 540 },
          spacing: { before: 40, after: 40 },
          children: [new TextRun({ text: line, font: "Arial", size: 22 })],
        }));
        continue;
      }

      // Metadata lines (Código, Emissão, etc)
      if (line.match(/^(Código|Emissão|Versão|Título|Elaboração|Aprovação|Revisão|Setor):/)) {
        children.push(new Paragraph({
          spacing: { before: 40, after: 40 },
          children: [
            new TextRun({ text: line.split(":")[0] + ": ", bold: true, font: "Arial", size: 22 }),
            new TextRun({ text: line.split(":").slice(1).join(":").trim(), font: "Arial", size: 22 }),
          ],
        }));
        continue;
      }

      // Regular paragraph
      children.push(new Paragraph({
        spacing: { before: 40, after: 40 },
        children: [new TextRun({ text: line, font: "Arial", size: 22 })],
      }));
    }

    // Add footer
    children.push(new Paragraph({ children: [] }));
    children.push(new Paragraph({
      spacing: { before: 400 },
      children: [
        new TextRun({ text: `Atualizado por: ${user.name}`, font: "Arial", size: 18 }),
        new TextRun({ text: `  |  Validado por: A definir  |  Aprovado por: A definir`, font: "Arial", size: 18 }),
      ],
    }));
    children.push(new Paragraph({
      children: [new TextRun({ text: `Data: ${today}`, font: "Arial", size: 18 })],
    }));

    const doc = new Document({
      styles: {
        default: {
          document: { run: { font: "Arial", size: 22 } },
        },
      },
      sections: [{
        properties: {
          page: {
            size: { width: 11906, height: 16838 }, // A4
            margin: { top: 1440, right: 1134, bottom: 1440, left: 1418 },
          },
        },
        children,
      }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `${title.replace(/\s+/g, "_")}_FGH.docx`);
  };

  const sendToQuality = () => {
    const code = standardized.match(/Código:\s*(.+)/)?.[1]?.trim() || `DOC-${sector?.substring(0, 3).toUpperCase() || "GER"}-001`;
    const subject = encodeURIComponent(`Documento para Revisão - ${title}`);
    const body = encodeURIComponent(
      `Prezado(a) Setor de Qualidade,\n\nSegue para revisão o documento:\n\nTítulo: ${title}\nTipo: ${docType}\nCódigo: ${code}\nVersão: 001\nElaborado por: ${user.name} - ${user.role}\nData: ${today}\n\nO documento foi padronizado através do sistema FGH Padroniza e está pronto para análise final.\n\nAtenciosamente,\n${user.name}\n${user.role}`
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
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {checklist.map((c, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-xs">
                    {c.ok ? <CheckCircle2 className="w-4 h-4 text-success shrink-0" /> : <AlertTriangle className="w-4 h-4 text-warning shrink-0" />}
                    <span className={c.ok ? "text-foreground" : "text-warning"}>{c.label}{c.ok ? " - OK" : " - A preencher"}</span>
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
