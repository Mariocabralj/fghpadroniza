import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Camera, ChevronDown, History, RotateCcw } from "lucide-react";
import { toast } from "sonner";

interface DiffEntry {
  type: "added" | "removed" | "modified";
  target: string;
  label: string;
  before?: string;
  after?: string;
}

interface Snapshot {
  id: string;
  label: string;
  description: string | null;
  payload: any;
  diff: DiffEntry[];
  created_at: string;
  created_by: string | null;
}

async function captureCurrentState() {
  const [sp, dirs, fs] = await Promise.all([
    supabase.from("ai_system_prompt").select("content").eq("id", "global").maybeSingle(),
    supabase.from("ai_directives").select("id, content, active, created_at"),
    supabase.from("ai_few_shot_examples").select("id, title, doc_type, input_text, ideal_output, active"),
  ]);
  return {
    system_prompt: sp.data?.content || "",
    directives: dirs.data || [],
    few_shots: fs.data || [],
  };
}

function computeDiff(prev: any, curr: any): DiffEntry[] {
  const diff: DiffEntry[] = [];
  const p = prev || { system_prompt: "", directives: [], few_shots: [] };

  if ((p.system_prompt || "") !== (curr.system_prompt || "")) {
    diff.push({ type: "modified", target: "system_prompt", label: "System Prompt alterado", before: p.system_prompt, after: curr.system_prompt });
  }

  const prevDir = new Map((p.directives || []).map((d: any) => [d.id, d]));
  const currDir = new Map((curr.directives || []).map((d: any) => [d.id, d]));
  for (const [id, d] of currDir) {
    if (!prevDir.has(id)) diff.push({ type: "added", target: "directive", label: `Diretriz adicionada`, after: (d as any).content });
    else {
      const pd = prevDir.get(id) as any;
      if (pd.content !== (d as any).content || pd.active !== (d as any).active) {
        diff.push({ type: "modified", target: "directive", label: `Diretriz alterada${pd.active !== (d as any).active ? ` (${(d as any).active ? "ativada" : "desativada"})` : ""}`, before: pd.content, after: (d as any).content });
      }
    }
  }
  for (const [id, d] of prevDir) if (!currDir.has(id)) diff.push({ type: "removed", target: "directive", label: "Diretriz removida", before: (d as any).content });

  const prevFS = new Map((p.few_shots || []).map((f: any) => [f.id, f]));
  const currFS = new Map((curr.few_shots || []).map((f: any) => [f.id, f]));
  for (const [id, f] of currFS) {
    if (!prevFS.has(id)) diff.push({ type: "added", target: "few_shot", label: `Exemplo adicionado: ${(f as any).title}`, after: (f as any).input_text });
    else {
      const pf = prevFS.get(id) as any;
      if (JSON.stringify(pf) !== JSON.stringify(f)) diff.push({ type: "modified", target: "few_shot", label: `Exemplo alterado: ${(f as any).title}` });
    }
  }
  for (const [id, f] of prevFS) if (!currFS.has(id)) diff.push({ type: "removed", target: "few_shot", label: `Exemplo removido: ${(f as any).title}` });

  return diff;
}

export default function SnapshotsPanel() {
  const { user } = useAuth();
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [reverting, setReverting] = useState<string | null>(null);

  const load = async () => {
    const { data } = await supabase.from("ai_snapshots").select("*").order("created_at", { ascending: false });
    setSnapshots((data as any) || []);
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!label.trim() || !user) return;
    setCreating(true);
    try {
      const current = await captureCurrentState();
      const last = snapshots[0];
      const diff = computeDiff(last?.payload, current);
      const { error } = await supabase.from("ai_snapshots").insert({
        label: label.trim(),
        description: description.trim() || null,
        payload: current as any,
        diff: diff as any,
        created_by: user.user_id,
      });
      if (error) return toast.error(error.message);
      toast.success(`Snapshot criado (${diff.length} mudança${diff.length === 1 ? "" : "s"})`);
      setLabel(""); setDescription("");
      load();
    } finally {
      setCreating(false);
    }
  };

  const revert = async (snap: Snapshot) => {
    setReverting(snap.id);
    try {
      const p = snap.payload || {};
      // Reset system prompt
      await supabase.from("ai_system_prompt").upsert({
        id: "global", content: p.system_prompt || "", updated_by: user?.user_id, updated_at: new Date().toISOString(),
      });
      // Wipe & restore directives
      await supabase.from("ai_directives").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      if (p.directives?.length) {
        await supabase.from("ai_directives").insert(p.directives.map((d: any) => ({
          id: d.id, content: d.content, active: d.active, created_by: user?.user_id,
        })));
      }
      // Wipe & restore few-shots
      await supabase.from("ai_few_shot_examples").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      if (p.few_shots?.length) {
        await supabase.from("ai_few_shot_examples").insert(p.few_shots.map((f: any) => ({
          id: f.id, title: f.title, doc_type: f.doc_type, input_text: f.input_text,
          ideal_output: f.ideal_output, active: f.active, created_by: user?.user_id,
        })));
      }
      toast.success(`Estado revertido para "${snap.label}"`);
    } catch (e: any) {
      toast.error("Falha ao reverter: " + e.message);
    } finally {
      setReverting(null);
    }
  };

  const colorFor = (t: string) =>
    t === "added" ? "text-success border-success/30 bg-success/5"
    : t === "removed" ? "text-destructive border-destructive/30 bg-destructive/5"
    : "text-warning border-warning/30 bg-warning/5";
  const prefixFor = (t: string) => t === "added" ? "+" : t === "removed" ? "-" : "~";

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-xl border shadow-sm">
        <div className="p-4 border-b flex items-center gap-2">
          <Camera className="w-4 h-4 text-primary" />
          <div>
            <h2 className="font-semibold">Novo Snapshot</h2>
            <p className="text-xs text-muted-foreground">Congele o estado atual de aprendizado da IA para auditoria/rollback</p>
          </div>
        </div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <Input placeholder="Rótulo (ex.: v1.2 — pós-treino UTI)" value={label} onChange={(e) => setLabel(e.target.value)} />
          <Input placeholder="Descrição curta (opcional)" value={description} onChange={(e) => setDescription(e.target.value)} className="md:col-span-2" />
          <Button onClick={create} disabled={!label.trim() || creating} className="md:col-span-3 gap-2">
            <Camera className="w-4 h-4" /> Criar snapshot agora
          </Button>
        </div>
      </div>

      <div className="bg-card rounded-xl border shadow-sm">
        <div className="p-4 border-b flex items-center gap-2">
          <History className="w-4 h-4 text-primary" />
          <h2 className="font-semibold">Histórico de Versões</h2>
        </div>
        <div className="p-4 space-y-3">
          {snapshots.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Nenhum snapshot ainda.</p>}
          {snapshots.map((s) => (
            <Collapsible key={s.id} className="border rounded-lg">
              <CollapsibleTrigger className="w-full p-3 flex items-center justify-between gap-2 hover:bg-muted/30 transition-colors group">
                <div className="flex items-center gap-3 min-w-0 flex-1 text-left">
                  <Badge variant="outline" className="font-mono text-[10px] shrink-0">{new Date(s.created_at).toLocaleString("pt-BR")}</Badge>
                  <span className="font-medium truncate">{s.label}</span>
                  <Badge variant="secondary" className="font-mono text-[10px] shrink-0">{s.diff?.length || 0} mudanças</Badge>
                </div>
                <ChevronDown className="w-4 h-4 shrink-0 transition-transform group-data-[state=open]:rotate-180" />
              </CollapsibleTrigger>
              <CollapsibleContent className="px-3 pb-3 space-y-2">
                {s.description && <p className="text-xs text-muted-foreground italic">{s.description}</p>}
                <div className="space-y-1 font-mono text-xs">
                  {(!s.diff || s.diff.length === 0) && <p className="text-muted-foreground">Snapshot inicial — sem comparação anterior.</p>}
                  {s.diff?.map((d, i) => (
                    <div key={i} className={`border rounded px-2 py-1.5 ${colorFor(d.type)}`}>
                      <div className="flex items-start gap-2">
                        <span className="font-bold">{prefixFor(d.type)}</span>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium">[{d.target}] {d.label}</div>
                          {d.before && <div className="text-destructive/80 line-through opacity-70 truncate">- {d.before}</div>}
                          {d.after && <div className="text-success/90 truncate">+ {d.after}</div>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" disabled={reverting === s.id} className="gap-2 mt-2">
                      <RotateCcw className="w-3.5 h-3.5" /> Reverter para este estado
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Reverter para "{s.label}"?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta ação irá substituir o System Prompt, diretrizes e exemplos few-shot atuais pelos valores salvos neste snapshot. As mudanças posteriores serão perdidas (recomenda-se criar um snapshot antes).
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => revert(s)}>Confirmar rollback</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>
      </div>
    </div>
  );
}
