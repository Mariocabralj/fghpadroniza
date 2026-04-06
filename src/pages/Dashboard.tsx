import AppLayout from "@/components/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate, useNavigate } from "react-router-dom";
import { FileText, AlertTriangle, CheckCircle2, Archive, Plus, Upload, ClipboardPaste, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";

const statusCards = [
  { label: "Rascunhos", count: 8, icon: FileText, color: "bg-info/10 text-info", border: "border-info/20" },
  { label: "Com Pendências", count: 2, icon: AlertTriangle, color: "bg-warning/10 text-warning", border: "border-warning/20" },
  { label: "Prontos para Envio", count: 5, icon: CheckCircle2, color: "bg-success/10 text-success", border: "border-success/20" },
  { label: "Finalizados", count: 24, icon: Archive, color: "bg-muted text-muted-foreground", border: "border-border" },
];

const steps = [
  { icon: Upload, title: "Envie seu conteúdo", desc: "Upload, cole texto ou descreva sua ideia" },
  { icon: ClipboardPaste, title: "Padronização automática", desc: "O sistema organiza no padrão FGH" },
  { icon: CheckCircle2, title: "Documento pronto", desc: "Exporte em .DOCX ou envie à Qualidade" },
];

const recentDocs = [
  { title: "POP Higienização das Mãos", type: "POP", status: "Pronto", date: "05/04/2026", statusColor: "bg-success/10 text-success" },
  { title: "IT Coleta de Exames Laboratoriais", type: "IT", status: "Rascunho", date: "04/04/2026", statusColor: "bg-info/10 text-info" },
  { title: "Protocolo Sepse Pediátrica", type: "Protocolo", status: "Pendência", date: "03/04/2026", statusColor: "bg-warning/10 text-warning" },
  { title: "Checklist Cirurgia Segura", type: "Checklist", status: "Finalizado", date: "01/04/2026", statusColor: "bg-muted text-muted-foreground" },
];

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  if (!user) return <Navigate to="/" />;

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
            {recentDocs.map((d, i) => (
              <div key={i} className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-primary" />
                  <div>
                    <p className="font-medium text-foreground text-sm">{d.title}</p>
                    <p className="text-xs text-muted-foreground">{d.type}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${d.statusColor}`}>{d.status}</span>
                  <span className="text-xs text-muted-foreground">{d.date}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
