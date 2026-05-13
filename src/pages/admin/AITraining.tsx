import { useEffect, useRef, useState } from "react";
import AppLayout from "@/components/AppLayout";
import AdminGuard from "@/components/AdminGuard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Brain, Send, Save, Sparkles } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

interface Msg {
  id: string;
  role: string;
  content: string;
  created_at: string;
}

interface Directive {
  id: string;
  content: string;
  active: boolean;
}

export default function AITraining() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [directives, setDirectives] = useState<Directive[]>([]);
  const [newDirective, setNewDirective] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadMessages = async () => {
    const { data } = await supabase
      .from("ai_training_messages")
      .select("*")
      .order("created_at", { ascending: true })
      .limit(200);
    setMessages(data || []);
  };

  const loadDirectives = async () => {
    const { data } = await supabase
      .from("ai_directives")
      .select("id, content, active")
      .order("created_at", { ascending: false });
    setDirectives(data || []);
  };

  useEffect(() => {
    loadMessages();
    loadDirectives();
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    if (!input.trim() || !user) return;
    const text = input.trim();
    setInput("");
    setSending(true);

    await supabase.from("ai_training_messages").insert({ user_id: user.user_id, role: "user", content: text });
    setMessages((m) => [...m, { id: crypto.randomUUID(), role: "user", content: text, created_at: new Date().toISOString() }]);

    try {
      const history = [...messages, { role: "user", content: text }].map((m) => ({ role: m.role, content: m.content }));
      const { data, error } = await supabase.functions.invoke("ai-training-chat", {
        body: { messages: history },
      });
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
    const { error } = await supabase.from("ai_directives").insert({
      content: newDirective.trim(),
      created_by: user.user_id,
      active: true,
    });
    if (error) return toast.error(error.message);
    setNewDirective("");
    toast.success("Diretriz adicionada e ativa para próximos documentos");
    loadDirectives();
  };

  const toggleDirective = async (d: Directive) => {
    await supabase.from("ai_directives").update({ active: !d.active }).eq("id", d.id);
    loadDirectives();
  };

  return (
    <AdminGuard>
      <AppLayout>
        <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-in">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Brain className="w-6 h-6 text-primary" /> Treinamento de IA
            </h1>
            <p className="text-muted-foreground text-sm">Alimente a IA com novos contextos e diretrizes institucionais</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-card rounded-xl border shadow-card flex flex-col h-[600px]">
              <div className="p-4 border-b">
                <h2 className="font-semibold text-foreground">Chat de Treinamento</h2>
                <p className="text-xs text-muted-foreground">Converse para corrigir interpretações da Norma Zero</p>
              </div>
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center mt-12">
                    Inicie uma conversa para treinar a IA.
                  </p>
                )}
                {messages.map((m) => (
                  <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] rounded-xl px-4 py-2 text-sm ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
                      <div className="prose prose-sm max-w-none [&>*]:my-1">
                        <ReactMarkdown>{m.content}</ReactMarkdown>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-3 border-t flex gap-2">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ensine algo novo à IA sobre a Norma Zero..."
                  className="resize-none min-h-[60px]"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                />
                <Button onClick={send} disabled={sending || !input.trim()} className="self-end gap-2">
                  <Send className="w-4 h-4" /> Enviar
                </Button>
              </div>
            </div>

            <div className="bg-card rounded-xl border shadow-card flex flex-col h-[600px]">
              <div className="p-4 border-b flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <div>
                  <h2 className="font-semibold text-foreground">Diretrizes Globais</h2>
                  <p className="text-xs text-muted-foreground">Regras institucionais aplicadas a TODOS os novos documentos</p>
                </div>
              </div>
              <div className="p-4 border-b space-y-2">
                <Textarea
                  value={newDirective}
                  onChange={(e) => setNewDirective(e.target.value)}
                  placeholder="Ex.: Sempre referenciar a RDC nº 36/2013 em documentos de segurança do paciente..."
                  className="min-h-[100px]"
                />
                <Button onClick={saveDirective} disabled={!newDirective.trim()} className="w-full gap-2">
                  <Save className="w-4 h-4" /> Salvar Diretriz
                </Button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {directives.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center mt-8">Nenhuma diretriz cadastrada.</p>
                )}
                {directives.map((d) => (
                  <div key={d.id} className={`p-3 rounded-lg border text-sm ${d.active ? "bg-success/5 border-success/20" : "bg-muted/30 border-border opacity-60"}`}>
                    <p className="text-foreground whitespace-pre-wrap">{d.content}</p>
                    <button
                      onClick={() => toggleDirective(d)}
                      className="text-xs text-primary hover:underline mt-2"
                    >
                      {d.active ? "Desativar" : "Ativar"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </AppLayout>
    </AdminGuard>
  );
}
