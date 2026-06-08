import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Save, Send, Sparkles } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import ConflictDialog from "./ConflictDialog";
import { useConflictCheck } from "./useConflictCheck";

interface Msg { id: string; role: string; content: string; created_at: string }
interface Directive { id: string; content: string; active: boolean }

export default function ChatPanel() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [directives, setDirectives] = useState<Directive[]>([]);
  const [newDirective, setNewDirective] = useState("");
  const [saving, setSaving] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { check, askUserResolution, dialogProps, checking } = useConflictCheck();

  const loadAll = async () => {
    const [m, d] = await Promise.all([
      supabase.from("ai_training_messages").select("*").order("created_at", { ascending: true }).limit(200),
      supabase.from("ai_directives").select("id, content, active").order("created_at", { ascending: false }),
    ]);
    setMessages(m.data || []);
    setDirectives(d.data || []);
  };

  useEffect(() => { loadAll(); }, []);
  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [messages]);

  const send = async () => {
    if (!input.trim() || !user) return;
    const text = input.trim();
    setInput("");
    setSending(true);
    await supabase.from("ai_training_messages").insert({ user_id: user.user_id, role: "user", content: text });
    setMessages((m) => [...m, { id: crypto.randomUUID(), role: "user", content: text, created_at: new Date().toISOString() }]);
    try {
      const history = [...messages, { role: "user", content: text }].map((m) => ({ role: m.role, content: m.content }));
      const { data, error } = await supabase.functions.invoke("ai-training-chat", { body: { messages: history } });
      if (error) throw error;
      const reply = data?.reply || "Sem resposta.";
      await supabase.from("ai_training_messages").insert({ user_id: user.user_id, role: "assistant", content: reply });
      setMessages((m) => [...m, { id: crypto.randomUUID(), role: "assistant", content: reply, created_at: new Date().toISOString() }]);
    } catch (e: any) {
      toast.error("Erro: " + (e.message || "falha na IA"));
    } finally {
      setSending(false);
    }
  };

  const saveDirective = async () => {
    if (!newDirective.trim() || !user) return;
    setSaving(true);
    try {
      let content = newDirective.trim();
      const existing = directives.filter((d) => d.active).map((d) => ({ id: d.id, content: d.content }));
      const { hasConflict, conflicts } = await check("directive", content, existing);
      if (hasConflict) {
        const action = await askUserResolution(content, conflicts);
        if (action === "cancel") return;
        if (action === "exception") content = `EXCEÇÃO: ${content}`;
        if (action === "overwrite") {
          await supabase.from("ai_directives").update({ active: false }).in("id", conflicts.map((c) => c.id));
        }
      }
      const { error } = await supabase.from("ai_directives").insert({
        content, created_by: user.user_id, active: true,
      });
      if (error) return toast.error(error.message);
      setNewDirective("");
      toast.success("Diretriz adicionada");
      loadAll();
    } finally {
      setSaving(false);
    }
  };

  const toggleDirective = async (d: Directive) => {
    await supabase.from("ai_directives").update({ active: !d.active }).eq("id", d.id);
    loadAll();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-card rounded-xl border shadow-sm flex flex-col h-[600px]">
        <div className="p-4 border-b">
          <h2 className="font-semibold">Chat de Treinamento</h2>
          <p className="text-xs text-muted-foreground">Converse para corrigir interpretações da Norma Zero</p>
        </div>
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && <p className="text-sm text-muted-foreground text-center mt-12">Inicie uma conversa para treinar a IA.</p>}
          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-xl px-4 py-2 text-sm ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                <div className="prose prose-sm max-w-none [&>*]:my-1"><ReactMarkdown>{m.content}</ReactMarkdown></div>
              </div>
            </div>
          ))}
        </div>
        <div className="p-3 border-t flex gap-2">
          <Textarea value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ensine algo novo à IA..." className="resize-none min-h-[60px]"
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} />
          <Button onClick={send} disabled={sending || !input.trim()} className="self-end gap-2">
            <Send className="w-4 h-4" /> Enviar
          </Button>
        </div>
      </div>

      <div className="bg-card rounded-xl border shadow-sm flex flex-col h-[600px]">
        <div className="p-4 border-b flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <div>
            <h2 className="font-semibold">Diretrizes Globais</h2>
            <p className="text-xs text-muted-foreground">Regras aplicadas a TODOS os novos documentos</p>
          </div>
        </div>
        <div className="p-4 border-b space-y-2">
          <Textarea value={newDirective} onChange={(e) => setNewDirective(e.target.value)} placeholder="Ex.: Sempre referenciar a RDC nº 36/2013..." className="min-h-[100px]" />
          <Button onClick={saveDirective} disabled={!newDirective.trim() || saving || checking} className="w-full gap-2">
            <Save className="w-4 h-4" /> {checking ? "Verificando conflitos..." : "Salvar Diretriz"}
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {directives.length === 0 && <p className="text-sm text-muted-foreground text-center mt-8">Nenhuma diretriz cadastrada.</p>}
          {directives.map((d) => (
            <div key={d.id} className={`p-3 rounded-lg border text-sm font-mono ${d.active ? "bg-success/5 border-success/30" : "bg-muted/30 opacity-60"}`}>
              <p className="whitespace-pre-wrap">{d.content}</p>
              <button onClick={() => toggleDirective(d)} className="text-xs text-primary hover:underline mt-2">
                {d.active ? "Desativar" : "Ativar"}
              </button>
            </div>
          ))}
        </div>
      </div>
      <ConflictDialog {...dialogProps} />
    </div>
  );
}
