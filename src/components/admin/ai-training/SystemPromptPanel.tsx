import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Save, Terminal } from "lucide-react";
import { toast } from "sonner";
import ConflictDialog from "./ConflictDialog";
import { useConflictCheck } from "./useConflictCheck";

export default function SystemPromptPanel() {
  const { user } = useAuth();
  const [content, setContent] = useState("");
  const [original, setOriginal] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const { check, askUserResolution, dialogProps, checking } = useConflictCheck();

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("ai_system_prompt").select("*").eq("id", "global").maybeSingle();
    setContent(data?.content || "");
    setOriginal(data?.content || "");
    setUpdatedAt(data?.updated_at || null);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    try {
      let body = content;
      // Check conflict against active directives
      const { data: dirs } = await supabase.from("ai_directives").select("id, content").eq("active", true);
      const existing = (dirs || []).map((d: any) => ({ id: d.id, content: d.content }));
      if (existing.length > 0 && body.trim()) {
        const { hasConflict, conflicts } = await check("system_prompt", body, existing);
        if (hasConflict) {
          const action = await askUserResolution(body, conflicts);
          if (action === "cancel") return;
          if (action === "exception") body = `${body}\n\nEXCEÇÃO RECONHECIDA: as diretrizes conflitantes (${conflicts.map((c) => c.id).join(", ")}) permanecem válidas em seus contextos específicos.`;
          if (action === "overwrite") {
            await supabase.from("ai_directives").update({ active: false }).in("id", conflicts.map((c) => c.id));
          }
        }
      }
      const { error } = await supabase.from("ai_system_prompt").upsert({
        id: "global", content: body, updated_by: user.user_id, updated_at: new Date().toISOString(),
      });
      if (error) return toast.error(error.message);
      toast.success("System Prompt atualizado");
      setContent(body);
      setOriginal(body);
      load();
    } finally {
      setSaving(false);
    }
  };

  const dirty = content !== original;

  return (
    <div className="bg-card rounded-xl border shadow-sm">
      <div className="p-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-primary" />
          <div>
            <h2 className="font-semibold">System Prompt Institucional</h2>
            <p className="text-xs text-muted-foreground">Tom, persona, escopo e restrições permanentes da IA — prioridade máxima</p>
          </div>
        </div>
        {updatedAt && <span className="text-[10px] font-mono text-muted-foreground">atualizado {new Date(updatedAt).toLocaleString("pt-BR")}</span>}
      </div>
      <div className="p-4 space-y-3">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Ex.: Você é o assistente institucional da FGH. Mantenha tom formal, técnico e impessoal. Nunca cite marcas comerciais..."
          className="min-h-[400px] font-mono text-xs"
          disabled={loading}
        />
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono text-muted-foreground">{content.length} caracteres</span>
          <Button onClick={save} disabled={!dirty || saving || checking} className="gap-2">
            <Save className="w-4 h-4" /> {checking ? "Verificando conflitos..." : "Salvar System Prompt"}
          </Button>
        </div>
      </div>
      <ConflictDialog {...dialogProps} />
    </div>
  );
}
