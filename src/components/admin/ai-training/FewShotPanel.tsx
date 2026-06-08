import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

const DOC_TYPES = ["", "POP", "PRS", "Protocolo Clínico", "PLA", "MAN", "POL", "REG"];

interface Example {
  id: string;
  title: string;
  doc_type: string | null;
  input_text: string;
  ideal_output: string;
  active: boolean;
  created_at: string;
}

export default function FewShotPanel() {
  const { user } = useAuth();
  const [items, setItems] = useState<Example[]>([]);
  const [title, setTitle] = useState("");
  const [docType, setDocType] = useState<string>("");
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("ai_few_shot_examples").select("*").order("created_at", { ascending: false });
    setItems(data || []);
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!title.trim() || !input.trim() || !output.trim() || !user) return;
    setSaving(true);
    const { error } = await supabase.from("ai_few_shot_examples").insert({
      title: title.trim(),
      doc_type: docType || null,
      input_text: input,
      ideal_output: output,
      active: true,
      created_by: user.user_id,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Exemplo cadastrado");
    setTitle(""); setDocType(""); setInput(""); setOutput("");
    load();
  };

  const toggle = async (e: Example) => {
    await supabase.from("ai_few_shot_examples").update({ active: !e.active }).eq("id", e.id);
    load();
  };

  const del = async (id: string) => {
    if (!confirm("Excluir este exemplo?")) return;
    await supabase.from("ai_few_shot_examples").delete().eq("id", id);
    load();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-card rounded-xl border shadow-sm">
        <div className="p-4 border-b flex items-center gap-2">
          <GraduationCap className="w-4 h-4 text-primary" />
          <div>
            <h2 className="font-semibold">Novo Gold Standard</h2>
            <p className="text-xs text-muted-foreground">Cadastre um par Entrada → Saída Ideal</p>
          </div>
        </div>
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-mono uppercase text-muted-foreground">Título</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: POP de higienização UTI" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-mono uppercase text-muted-foreground">Tipo de documento</label>
              <Select value={docType || "__any__"} onValueChange={(v) => setDocType(v === "__any__" ? "" : v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__any__">Qualquer tipo</SelectItem>
                  {DOC_TYPES.filter(Boolean).map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-mono uppercase text-muted-foreground">Entrada (rascunho)</label>
            <Textarea value={input} onChange={(e) => setInput(e.target.value)} className="min-h-[150px] font-mono text-xs" placeholder="Cole aqui o rascunho/texto bruto que serviria de entrada..." />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-mono uppercase text-muted-foreground">Saída Ideal (padrão FGH)</label>
            <Textarea value={output} onChange={(e) => setOutput(e.target.value)} className="min-h-[200px] font-mono text-xs" placeholder="Cole aqui o documento padronizado correto que a IA deveria ter gerado..." />
          </div>
          <Button onClick={save} disabled={saving || !title.trim() || !input.trim() || !output.trim()} className="w-full gap-2">
            <Plus className="w-4 h-4" /> Cadastrar exemplo
          </Button>
        </div>
      </div>

      <div className="bg-card rounded-xl border shadow-sm">
        <div className="p-4 border-b">
          <h2 className="font-semibold">Exemplos cadastrados</h2>
          <p className="text-xs text-muted-foreground">A IA usa os ativos como referência ao gerar documentos do tipo correspondente</p>
        </div>
        <div className="p-4 space-y-2 max-h-[700px] overflow-y-auto">
          {items.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Nenhum exemplo cadastrado.</p>}
          {items.map((e) => (
            <div key={e.id} className={`p-3 rounded-lg border ${e.active ? "bg-success/5 border-success/30" : "bg-muted/30 opacity-60"}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm truncate">{e.title}</span>
                    {e.doc_type && <Badge variant="secondary" className="font-mono text-[10px]">{e.doc_type}</Badge>}
                  </div>
                  <p className="text-xs font-mono text-muted-foreground line-clamp-2">{e.input_text}</p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => toggle(e)} className="text-xs text-primary hover:underline whitespace-nowrap">
                    {e.active ? "Desativar" : "Ativar"}
                  </button>
                  <button onClick={() => del(e.id)} className="text-destructive hover:text-destructive/80"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
