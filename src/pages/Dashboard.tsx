import { useEffect, useState } from "react";
import AppLayout from "@/components/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate, useNavigate } from "react-router-dom";
import { FileText, AlertTriangle, CheckCircle2, Archive, Plus, Upload, ClipboardPaste } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const steps = [
  { icon: Upload, title: "Envie seu conteúdo", desc: "Upload, cole texto ou descreva sua ideia" },
  { icon: ClipboardPaste, title: "Padronização automática", desc: "O sistema organiza no padrão FGH" },
  { icon: CheckCircle2, title: "Documento pronto", desc: "Exporte em .DOCX ou avalie a ferramenta" },
];

interface Doc {
  id: string;
  title: string;
  doc_type: string;
  status: string;
  created_at: string;
}

const statusColor = (s: string) =>
  s === "Pronto" ? "bg-success/10 text-success" :
  s === "Pendência" ? "bg-warning/10 text-warning" :
  s === "Finalizado" ? "bg-muted text-muted-foreground" :
  "bg-info/10 text-info";

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [docs, setDocs] = useState<Doc[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("documents")
      .select("id, title, doc_type, status, created_at")
      .eq("user_id", user.user_id)
      .order("created_at", { ascending: false })
      .then(({ data }) => setDocs(data || []));
  }, [user]);

  if (!user) return <Navigate to="/" />;

  const counts = {
    rascunhos: docs.filter((d) => d.status === "Rascunho").length,
    pendencias: docs.filter((d) => d.status === "Pendência").length,
    prontos: docs.filter((d) => d.status === "Pronto").length,
    finalizados: docs.filter((d) => d.status === "Finalizado").length,
  };

  const statusCards = [
    { label: "Rascunhos", count: counts.rascunhos, icon: FileText, color: "text-info", border: "border-l-4 border-l-info" },
    { label: "Com Pendências", count: counts.pendencias, icon: AlertTriangle, color: "text-warning", border: "border-l-4 border-l-warning" },
    { label: "Prontos para Envio", count: counts.prontos, icon: CheckCircle2, color: "text-success", border: "border-l-4 border-l-success" },
    { label: "Finalizados", count: counts.finalizados, icon: Archive, color: "text-muted-foreground", border: "border-l-4 border-l-muted-foreground" },
  ];

  const recentDocs = docs.slice(0, 5);

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-8 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Bem-vindo, {user.name.split(" ")[0]}!</h1>
            <p className="text-muted-foreground text-sm">Gerencie seus documentos padronizados</p>
          </div>
          <Button onClick={() => navigate("/novo-documento")} className="gradient-primary text-primary-foreground font-semibold gap-2">
            <Plus className="w-4 h-4" /> Novo Documento
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statusCards.map((c) => (
            <div key={c.label} className={`bg-card rounded-xl border ${c.border} p-5 shadow-card hover:shadow-card-hover transition-shadow`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{c.label}</p>
                  <p className="text-3xl font-bold text-foreground mt-1">{c.count}</p>
                </div>
                <div className={`w-12 h-12 rounded-xl ${c.color} flex items-center justify-center`}>
                  <c.icon className="w-6 h-6" />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-card rounded-xl border p-6 shadow-card">
          <h2 className="text-lg font-semibold text-foreground mb-4">Como funciona o FGH Padroniza?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {steps.map((s, i) => (
              <div key={i} className="flex flex-col items-center text-center p-4">
                <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center mb-3">
                  <s.icon className="w-6 h-6 text-primary-foreground" />
                </div>
                <span className="text-xs font-semibold text-primary mb-1">PASSO {i + 1}</span>
                <h3 className="font-semibold text-foreground">{s.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card rounded-xl border shadow-card">
          <div className="p-5 border-b">
            <h2 className="text-lg font-semibold text-foreground">Documentos Recentes</h2>
          </div>
          <div className="divide-y">
            {recentDocs.length === 0 && (
              <div className="p-10 flex flex-col items-center text-center gap-3">
                <FileText className="w-12 h-12 text-muted-foreground/60" />
                <p className="text-sm text-muted-foreground">Você ainda não criou nenhum documento.</p>
                <Button onClick={() => navigate("/novo-documento")} variant="outline" className="gap-2">
                  <Plus className="w-4 h-4" /> Criar meu primeiro documento
                </Button>
              </div>
            )}
            {recentDocs.map((d) => (
              <div key={d.id} className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-primary" />
                  <div>
                    <p className="font-medium text-foreground text-sm">{d.title}</p>
                    <p className="text-xs text-muted-foreground">{d.doc_type}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColor(d.status)}`}>{d.status}</span>
                  <span className="text-xs text-muted-foreground">{new Date(d.created_at).toLocaleDateString("pt-BR")}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
