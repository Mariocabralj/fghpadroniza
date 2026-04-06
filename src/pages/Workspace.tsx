import { useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Download, Send, Sparkles, CheckCircle2, AlertTriangle } from "lucide-react";
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType, BorderStyle } from "docx";
import { saveAs } from "file-saver";

const today = new Date().toLocaleDateString("pt-BR");
const nextYear = new Date(Date.now() + 365 * 86400000).toLocaleDateString("pt-BR");

const defaultOriginal = `Higienização das Mãos

A higienização das mãos é fundamental para prevenir infecções hospitalares. Deve ser realizada por todos os profissionais de saúde antes e após contato com pacientes.

Materiais: sabonete líquido, papel toalha, álcool gel 70%.

Passos:
1. Abrir a torneira e molhar as mãos
2. Aplicar sabonete líquido suficiente
3. Ensaboar as palmas das mãos friccionando-as
4. Esfregar o dorso das mãos
5. Entrelaçar os dedos e friccionar
6. Esfregar o polegar com movimento circular
7. Friccionar as pontas dos dedos nas palmas
8. Enxaguar as mãos retirando todo o sabonete
9. Secar com papel toalha descartável
10. Fechar a torneira com papel toalha`;

const generateStandardized = (title: string, sector: string, docType: string) => {
  const code = `POP-${sector?.substring(0, 3).toUpperCase() || "GER"}-001`;
  return `PROCEDIMENTO OPERACIONAL PADRÃO - POP

${title || "HIGIENIZAÇÃO DAS MÃOS"}

Código: ${code}
Versão: 01
Data de Emissão: ${today}
Próxima Revisão: ${nextYear}
Setor: ${sector || "Enfermagem"}

1. OBJETIVO / FINALIDADE
Padronizar a técnica de higienização das mãos visando a prevenção e controle de infecções relacionadas à assistência à saúde (IRAS), garantindo a segurança do paciente e do profissional.

2. ÂMBITO DE APLICAÇÃO
Este procedimento aplica-se a todos os profissionais de saúde, visitantes e acompanhantes nas dependências da Fundação Gestão Hospitalar Martiniano Fernandes.

3. RESPONSABILIDADES
- Elaboração: Analista de Processos
- Execução: Todos os profissionais de saúde
- Supervisão: Coordenação de Enfermagem e CCIH
- Aprovação: Gerência de Qualidade

4. MATERIAIS NECESSÁRIOS
- Sabonete líquido neutro ou antisséptico
- Papel toalha descartável
- Álcool gel 70%
- Lixeira com pedal

5. PROCEDIMENTO
5.1 Abrir a torneira e molhar as mãos, evitando encostar na pia
5.2 Aplicar na palma da mão quantidade suficiente de sabonete líquido
5.3 Ensaboar as palmas das mãos, friccionando-as entre si
5.4 Esfregar a palma da mão direita contra o dorso da mão esquerda e vice-versa
5.5 Entrelaçar os dedos e friccionar os espaços interdigitais
5.6 Esfregar o dorso dos dedos com movimentos de vai e vem
5.7 Esfregar o polegar com auxílio da palma da mão contralateral, com movimento circular
5.8 Friccionar as polpas digitais e unhas nas palmas das mãos
5.9 Esfregar os punhos com movimentos circulares
5.10 Enxaguar as mãos, retirando os resíduos de sabonete
5.11 Secar as mãos com papel toalha descartável
5.12 Fechar a torneira utilizando o papel toalha

6. REFERÊNCIAS NORMATIVAS
- ANVISA - Segurança do Paciente: Higienização das Mãos (2009)
- OMS - Diretrizes sobre Higienização das Mãos em Serviços de Saúde (2005)
- NR-32 - Segurança e Saúde no Trabalho em Serviços de Saúde

7. REGISTRO DE ALTERAÇÕES
| Versão | Data       | Alteração           | Responsável    |
|--------|------------|---------------------|----------------|
| 01     | ${today} | Emissão inicial     | Mario Cabral   |

8. APROVAÇÃO
Elaborado por: Mario Cabral - Analista de Processos
Revisado por: _________________________
Aprovado por: _________________________`;
};

interface CheckItem {
  label: string;
  ok: boolean;
}

const getChecklist = (): CheckItem[] => [
  { label: "Código de identificação", ok: true },
  { label: "Objetivo definido", ok: true },
  { label: "Âmbito de aplicação", ok: true },
  { label: "Responsabilidades", ok: true },
  { label: "Procedimento detalhado", ok: true },
  { label: "Referências normativas", ok: true },
  { label: "Formatação FGH", ok: true },
  { label: "Aprovação", ok: false },
];

export default function Workspace() {
  const { user } = useAuth();
  const location = useLocation();
  const state = location.state as any;
  const title = state?.title || "POP Higienização das Mãos";
  const sector = state?.sector || "Enfermagem";
  const docType = state?.docType || "POP Padrão";

  const [original, setOriginal] = useState(state?.pastedText || state?.ideaText || defaultOriginal);
  const [standardized, setStandardized] = useState(generateStandardized(title, sector, docType));
  const checklist = getChecklist();
  const completionPct = Math.round((checklist.filter((c) => c.ok).length / checklist.length) * 100);

  if (!user) return <Navigate to="/" />;

  const exportDocx = async () => {
    const lines = standardized.split("\n").filter(Boolean);
    const children = lines.map((line) => {
      if (line.match(/^\d+\.\s[A-ZÁÉÍÓÚÂÊÔÃÕÇ \/]+$/)) {
        return new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: line, bold: true })] });
      }
      if (line.startsWith("PROCEDIMENTO OPERACIONAL")) {
        return new Paragraph({ heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER, children: [new TextRun({ text: line, bold: true })] });
      }
      if (line.startsWith("5.") || line.startsWith("- ")) {
        return new Paragraph({ indent: { left: 360 }, children: [new TextRun(line)] });
      }
      return new Paragraph({ children: [new TextRun(line)] });
    });

    const doc = new Document({
      sections: [{ properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } }, children }],
    });
    const blob = await Packer.toBlob(doc);
    saveAs(blob, `${title.replace(/\s+/g, "_")}.docx`);
  };

  const sendToQuality = () => {
    const code = `POP-${sector?.substring(0, 3).toUpperCase() || "GER"}-001`;
    const subject = encodeURIComponent(`Documento para Revisão - ${title}`);
    const body = encodeURIComponent(
      `Prezado(a) Setor de Qualidade,\n\nSegue para revisão o documento:\n\nTítulo: ${title}\nTipo: ${docType}\nCódigo: ${code}\nVersão: 01\nElaborado por: ${user.name} - ${user.role}\nData: ${today}\n\nO documento foi padronizado através do sistema FGH Padroniza e está pronto para análise final.\n\nAtenciosamente,\n${user.name}\n${user.role}`
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
                    <p className="text-xs text-muted-foreground">Formatado conforme Norma Zero</p>
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
