import { useState, useMemo, useEffect, useRef } from "react";
import { Navigate, useLocation } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Download, Star, Sparkles, CheckCircle2, AlertTriangle, Wand2, Loader2 } from "lucide-react";
import { exportDocx } from "@/lib/docx-export";
import { saveAs } from "file-saver";
import { supabase } from "@/integrations/supabase/client";
import { logSystemError } from "@/lib/system-log";
import { streamProcessDocument } from "@/lib/ai-service";
import { toast } from "sonner";

const today = new Date().toLocaleDateString("pt-BR");

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

export default function Workspace() {
  const { user } = useAuth();
  const location = useLocation();
  const state = location.state as any;
  const title = state?.title || "Documento Padronizado";
  const sector = state?.sector || "";
  const docType = state?.docType || "POP";

  const [original, setOriginal] = useState(
    state?.pastedText || state?.ideaText || state?.fileName || ""
  );
  const [standardized, setStandardized] = useState(state?.standardizedText || "");
  const [refineInstructions, setRefineInstructions] = useState("");
  const [refining, setRefining] = useState(false);

  const checklist = useMemo(() => analyzeChecklist(standardized), [standardized]);
  const completionPct = Math.round((checklist.filter((c) => c.ok).length / checklist.length) * 100);

  const savedRef = useRef(false);
  useEffect(() => {
    if (!user || !standardized || savedRef.current) return;
    savedRef.current = true;
    supabase.from("documents").insert({
      user_id: user.user_id,
      title,
      doc_type: docType,
      sector,
      status: "Pronto",
      original_content: original,
      standardized_content: standardized,
    }).then(({ error }) => {
      if (error) console.error("Save document error:", error);
    });
  }, [user, standardized, title, docType, sector, original]);

  if (!user) return <Navigate to="/" />;

  const handleExportDocx = async () => {
    try {
      const elaboracao = user ? `${user.name}${user.role ? " - " + user.role : ""}` : "[A PREENCHER]";
      let images: Record<string, string> = {};
      let imageTypes: Record<string, string> = {};
      try {
        const raw = sessionStorage.getItem("fgh:lastImages");
        if (raw) {
          const parsed = JSON.parse(raw);
          images = parsed.images || {};
          imageTypes = parsed.imageTypes || {};
        }
      } catch { /* ignore */ }
      const blob = await exportDocx(title, standardized, elaboracao, { images, imageTypes });
      saveAs(blob, `${title.replace(/\s+/g, "_")}_FGH.docx`);
    } catch (e: any) {
      await logSystemError("docx-export", `Falha ao gerar DOCX: ${e?.message || e}`, { title, docType });
      toast.error("Erro ao gerar o arquivo .DOCX. O administrador foi notificado.");
    }
  };

  const evaluateTool = () => {
    window.open("https://forms.cloud.microsoft/r/Y6xHtpLT1j", "_blank");
  };

  const handleRefine = () => {
    const instr = refineInstructions.trim();
    if (!instr) {
      toast.info("Digite as orientações de refinamento.");
      return;
    }
    if (!standardized.trim()) {
      toast.error("Nenhum documento para refinar.");
      return;
    }
    setRefining(true);
    let acc = "";
    setStandardized(""); // limpar para receber streaming
    streamProcessDocument(
      {
        content: standardized,
        docType,
        title,
        sector,
        mode: "refine",
        instructions: instr,
        userId: user?.user_id,
      },
      (delta) => {
        acc += delta;
        setStandardized(acc);
      },
      () => {
        setRefining(false);
        setRefineInstructions("");
        toast.success("Documento refinado.");
      },
      (err) => {
        setRefining(false);
        setStandardized(acc || standardized);
        toast.error(err || "Erro ao refinar.");
      }
    );
  };

  return (
    <AppLayout>
      <div className="p-4 h-[calc(100vh-4rem)] flex flex-col gap-4 animate-fade-in">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-foreground">Workspace</h1>
          <div className="flex gap-2">
            <Button onClick={handleExportDocx} className="bg-success text-success-foreground font-semibold gap-2 hover:bg-success/90">
              <Download className="w-4 h-4" /> Exportar .DOCX
            </Button>
            <Button variant="outline" onClick={evaluateTool} className="gap-2">
              <Star className="w-4 h-4" /> Avaliar Ferramenta
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

            {/* Refinamento por IA */}
            <div className="bg-card rounded-xl border shadow-card p-4 shrink-0">
              <div className="flex items-center gap-2 mb-2">
                <Wand2 className="w-4 h-4 text-primary" />
                <h3 className="font-semibold text-foreground text-sm">Deseja refinar este documento?</h3>
              </div>
              <p className="text-xs text-muted-foreground mb-2">Digite novas orientações para a IA (ex.: "deixe mais conciso", "detalhe melhor as competências").</p>
              <div className="flex gap-2">
                <Textarea
                  value={refineInstructions}
                  onChange={(e) => setRefineInstructions(e.target.value)}
                  placeholder="Suas instruções de refinamento..."
                  className="min-h-[60px] text-sm flex-1"
                  disabled={refining}
                />
                <Button onClick={handleRefine} disabled={refining || !refineInstructions.trim()} className="gap-2 self-end">
                  {refining ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                  {refining ? "Refinando..." : "Refinar"}
                </Button>
              </div>
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
