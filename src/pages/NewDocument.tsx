import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Upload, ClipboardPaste, Lightbulb, Wand2, FileStack, Info } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

// 7 tipos institucionais — cada um com tom/densidade próprios na IA
const docTypes = [
  { value: "POP", label: "Procedimento Operacional Padrão" },
  { value: "PRS", label: "Procedimento Sistêmico" },
  { value: "Protocolo Clínico", label: "Protocolo Clínico" },
  { value: "PLA", label: "Plano" },
  { value: "MAN", label: "Manual" },
  { value: "POL", label: "Política Interna" },
  { value: "REG", label: "Regimento Interno" },
];

type Mode = "improve" | "format" | "paste" | "idea";

const cards: { id: Mode; title: string; desc: string; icon: any; accent: string }[] = [
  {
    id: "improve",
    title: "Melhore seu Documento",
    desc: "Envie um rascunho e a IA vai aprimorar a escrita técnica, a clareza e a estrutura, completando seções faltantes conforme a Norma Zero.",
    icon: Wand2,
    accent: "bg-primary/10 text-primary border-primary/20",
  },
  {
    id: "format",
    title: "Padronize seu Documento",
    desc: "Envie um documento já escrito — a IA apenas formata para o papel timbrado FGH (tarja azul, marca d'água, cabeçalho), sem alterar substancialmente o texto.",
    icon: FileStack,
    accent: "bg-success/10 text-success border-success/20",
  },
  {
    id: "paste",
    title: "Colar Texto",
    desc: "Cole um texto livre e a IA organiza no padrão Norma Zero, mapeando cada trecho para a seção correta.",
    icon: ClipboardPaste,
    accent: "bg-info/10 text-info border-info/20",
  },
  {
    id: "idea",
    title: "Descrever Ideia",
    desc: "Descreva a ideia em poucas linhas e a IA gera o documento completo, técnico e padronizado.",
    icon: Lightbulb,
    accent: "bg-warning/10 text-warning border-warning/20",
  },
];

const textSuggestions = [
  "Objetivo: Para que serve o documento",
  "Quem faz: Profissionais/setores responsáveis",
  "Quando fazer: Frequência ou situações de uso",
  "Materiais: Equipamentos e insumos necessários",
  "Passo a passo: Etapas do procedimento",
];

const ideaSuggestions = [
  "O que precisa ser feito e por quê",
  "Quais profissionais ou setores estão envolvidos",
  "Etapas principais do processo",
  "Materiais ou recursos necessários",
];

export default function NewDocument() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode | null>(null);
  const [title, setTitle] = useState("");
  const [docType, setDocType] = useState("");
  const [sector, setSector] = useState(user?.sector || "");
  const [pastedText, setPastedText] = useState("");
  const [ideaText, setIdeaText] = useState("");
  const [file, setFile] = useState<File | null>(null);

  if (!user) return <Navigate to="/" />;

  const handleStart = () => {
    if (!title.trim()) return toast.error("Preencha o título do documento");
    if (!docType) return toast.error("Selecione o tipo de documento");
    if (!sector.trim()) return toast.error("Preencha o setor responsável");

    const isUpload = mode === "improve" || mode === "format";
    const hasContent =
      (isUpload && file) ||
      (mode === "paste" && pastedText.trim()) ||
      (mode === "idea" && ideaText.trim());
    if (!hasContent) return toast.error("Forneça o conteúdo do documento");

    const aiMode =
      mode === "improve" ? "upload-improve" :
      mode === "format" ? "upload-format" :
      mode === "paste" ? "paste" : "idea";

    navigate("/analise", {
      state: {
        title,
        docType,
        sector,
        pastedText: mode === "paste" ? pastedText : undefined,
        ideaText: mode === "idea" ? ideaText : undefined,
        file: isUpload ? file : undefined,
        fileName: file?.name,
        aiMode,
      },
    });
  };

  return (
    <AppLayout>
      <div className="p-6 max-w-5xl mx-auto space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Novo Documento</h1>
          <p className="text-muted-foreground text-sm">
            Escolha como deseja começar — a IA vai padronizá-lo conforme a Norma Zero FGH
          </p>
        </div>

        {!mode ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {cards.map((c) => {
              const Icon = c.icon;
              return (
                <button
                  key={c.id}
                  onClick={() => setMode(c.id)}
                  className={`text-left bg-card rounded-xl border-2 ${c.accent} p-6 hover:shadow-card-hover transition-all`}
                >
                  <div className={`w-12 h-12 rounded-xl ${c.accent} flex items-center justify-center mb-4 border`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="font-semibold text-foreground text-lg mb-2">{c.title}</h3>
                  <p className="text-sm text-muted-foreground">{c.desc}</p>
                </button>
              );
            })}
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">Modo selecionado:</span>
                <span className="font-semibold text-foreground">{cards.find((c) => c.id === mode)?.title}</span>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setMode(null)}>Trocar modo</Button>
            </div>

            {(mode === "improve" || mode === "format") && (
              <div
                className="border-2 border-dashed rounded-xl p-12 text-center hover:border-primary/50 hover:bg-primary/5 transition-colors cursor-pointer"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (e.dataTransfer.files[0]) setFile(e.dataTransfer.files[0]);
                }}
                onClick={() => document.getElementById("file-input")?.click()}
              >
                <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="font-medium text-foreground">{file ? file.name : "Arraste arquivos ou clique para selecionar"}</p>
                <p className="text-sm text-muted-foreground mt-1">Aceita .docx, .pdf, .txt</p>
                <input
                  id="file-input"
                  type="file"
                  accept=".docx,.pdf,.txt"
                  className="hidden"
                  onChange={(e) => { if (e.target.files?.[0]) setFile(e.target.files[0]); }}
                />
              </div>
            )}

            {mode === "paste" && (
              <div className="space-y-4">
                <div className="bg-info/5 border border-info/20 rounded-xl p-4">
                  <div className="flex items-start gap-2">
                    <Info className="w-5 h-5 text-info shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-foreground text-sm mb-2">Para um melhor resultado, inclua:</p>
                      <ul className="space-y-1">
                        {textSuggestions.map((s, i) => (
                          <li key={i} className="text-sm text-muted-foreground">• {s}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
                <Textarea
                  placeholder={"Ex: Procedimento de Higienização das Mãos..."}
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  className="min-h-[250px] resize-y"
                />
                <p className="text-xs text-muted-foreground text-right">{pastedText.length} caracteres</p>
              </div>
            )}

            {mode === "idea" && (
              <div className="space-y-4">
                <div className="bg-warning/5 border border-warning/20 rounded-xl p-4">
                  <div className="flex items-start gap-2">
                    <Lightbulb className="w-5 h-5 text-warning shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-foreground text-sm mb-2">Descreva sua ideia incluindo:</p>
                      <ul className="space-y-1">
                        {ideaSuggestions.map((s, i) => (
                          <li key={i} className="text-sm text-muted-foreground">• {s}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
                <Textarea
                  placeholder={"Ex: Preciso criar um documento sobre limpeza terminal de leitos na UTI..."}
                  value={ideaText}
                  onChange={(e) => setIdeaText(e.target.value)}
                  className="min-h-[250px] resize-y"
                />
                <p className="text-xs text-muted-foreground text-right">{ideaText.length} caracteres</p>
              </div>
            )}

            <div className="bg-card rounded-xl border p-6 shadow-card space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Título do documento</Label>
                  <Input placeholder="Ex: POP Higienização das Mãos" value={title} onChange={(e) => setTitle(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Tipo de documento</Label>
                  <Select value={docType} onValueChange={setDocType}>
                    <SelectTrigger><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
                    <SelectContent>
                      {docTypes.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Setor responsável</Label>
                  <Input placeholder="Ex: Enfermagem" value={sector} onChange={(e) => setSector(e.target.value)} />
                </div>
              </div>
              <Button onClick={handleStart} className="w-full bg-ai-accent hover:bg-ai-accent/90 text-ai-accent-foreground font-semibold gap-2 h-12">
                <Sparkles className="w-5 h-5" /> Iniciar Padronização com IA
              </Button>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
