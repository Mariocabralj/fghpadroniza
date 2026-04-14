import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, ClipboardPaste, Lightbulb, Info, Sparkles } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const docTypes = [
  "POP/PRS",
  "Protocolo Clínico",
  "Manual",
  "Plano",
  "Política Interna",
  "Regimento Interno",
  "Fluxograma",
  "Carta de Anuência",
  "Ata de Reunião",
  "Panfleto",
  "Portaria",
  "Ementa de Treinamento",
  "Papel Timbrado",
  "Norma Zero",
];

const textSuggestions = [
  "Objetivo: Para que serve o documento",
  "Quem faz: Profissionais/setores responsáveis",
  "Quando fazer: Frequência ou situações de uso",
  "Materiais: Equipamentos e insumos necessários",
  "Passo a passo: Etapas do procedimento",
  "Cuidados especiais: Contraindicações ou alertas",
  "Referências: Normas, protocolos ou literatura técnica",
];

const ideaSuggestions = [
  "O que precisa ser feito e por quê",
  "Quais profissionais ou setores estão envolvidos",
  "Etapas principais do processo",
  "Materiais ou recursos necessários",
  "Situações especiais ou cuidados importantes",
];

export default function NewDocument() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [docType, setDocType] = useState("");
  const [sector, setSector] = useState("");
  const [pastedText, setPastedText] = useState("");
  const [ideaText, setIdeaText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [activeTab, setActiveTab] = useState("upload");

  if (!user) return <Navigate to="/" />;

  const handleStart = () => {
    if (!docType) {
      toast.error("Selecione o tipo de documento");
      return;
    }

    const hasContent =
      (activeTab === "upload" && file) ||
      (activeTab === "paste" && pastedText.trim()) ||
      (activeTab === "idea" && ideaText.trim());

    if (!hasContent) {
      toast.error("Forneça o conteúdo do documento");
      return;
    }

    navigate("/analise", {
      state: {
        title,
        docType,
        sector,
        pastedText: activeTab === "paste" ? pastedText : undefined,
        ideaText: activeTab === "idea" ? ideaText : undefined,
        file: activeTab === "upload" ? file : undefined,
        fileName: file?.name,
      },
    });
  };

  return (
    <AppLayout>
      <div className="p-6 max-w-4xl mx-auto space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Novo Documento</h1>
          <p className="text-muted-foreground text-sm">
            Escolha como deseja enviar seu conteúdo — a IA vai padronizá-lo conforme a Norma Zero FGH
          </p>
        </div>

        <Tabs defaultValue="upload" value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="upload" className="gap-2"><Upload className="w-4 h-4" />Upload</TabsTrigger>
            <TabsTrigger value="paste" className="gap-2"><ClipboardPaste className="w-4 h-4" />Colar Texto</TabsTrigger>
            <TabsTrigger value="idea" className="gap-2"><Lightbulb className="w-4 h-4" />Descrever Ideia</TabsTrigger>
          </TabsList>

          <TabsContent value="upload">
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
          </TabsContent>

          <TabsContent value="paste" className="space-y-4">
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
              placeholder={"Ex: Procedimento de Higienização das Mãos\n\nObjetivo: Padronizar a técnica de higienização das mãos...\n\nMateriais: Sabonete líquido, papel toalha, álcool gel 70%...\n\nPasso a passo:\n1. Abrir a torneira e molhar as mãos...\n2. Aplicar sabonete líquido..."}
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              className="min-h-[250px] resize-y"
            />
            <p className="text-xs text-muted-foreground text-right">{pastedText.length} caracteres</p>
          </TabsContent>

          <TabsContent value="idea" className="space-y-4">
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
              placeholder={"Ex: Preciso criar um documento sobre como fazer a limpeza terminal de leitos na UTI. Envolve a equipe de higienização e enfermagem. O processo inclui a remoção de roupas, desinfecção de superfícies..."}
              value={ideaText}
              onChange={(e) => setIdeaText(e.target.value)}
              className="min-h-[250px] resize-y"
            />
            <p className="text-xs text-muted-foreground text-right">{ideaText.length} caracteres</p>
          </TabsContent>
        </Tabs>

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
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Setor responsável</Label>
              <Input placeholder="Ex: Enfermagem" value={sector} onChange={(e) => setSector(e.target.value)} />
            </div>
          </div>
          <Button onClick={handleStart} className="w-full gradient-primary text-primary-foreground font-semibold gap-2 h-12">
            <Sparkles className="w-5 h-5" /> Iniciar Padronização com IA
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
