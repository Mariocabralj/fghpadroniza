import { Navigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { FileText, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const templates = [
  { title: "POP Padrão", desc: "Procedimento Operacional Padrão genérico", category: "POP", color: "bg-primary/10 text-primary" },
  { title: "POP Enfermagem", desc: "POP para procedimentos de enfermagem", category: "POP", color: "bg-primary/10 text-primary" },
  { title: "Instrução de Trabalho", desc: "Modelo para instruções de trabalho", category: "IT", color: "bg-info/10 text-info" },
  { title: "Protocolo Clínico", desc: "Protocolo para condutas clínicas", category: "Protocolo", color: "bg-success/10 text-success" },
  { title: "Formulário de Registro", desc: "Formulário para coleta de dados", category: "Formulário", color: "bg-warning/10 text-warning" },
  { title: "Checklist Operacional", desc: "Lista de verificação para processos", category: "Checklist", color: "bg-muted text-muted-foreground" },
];

export default function Templates() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/" />;

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Biblioteca de Modelos</h1>
          <p className="text-muted-foreground text-sm">Modelos pré-definidos para agilizar a criação de documentos</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((t, i) => (
            <div key={i} className="bg-card rounded-xl border shadow-card hover:shadow-card-hover transition-all p-6 flex flex-col">
              <div className="flex items-start justify-between mb-4">
                <div className={`w-10 h-10 rounded-lg ${t.color} flex items-center justify-center`}>
                  <FileText className="w-5 h-5" />
                </div>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${t.color}`}>{t.category}</span>
              </div>
              <h3 className="font-semibold text-foreground mb-1">{t.title}</h3>
              <p className="text-sm text-muted-foreground flex-1">{t.desc}</p>
              <Button variant="outline" className="mt-4 gap-2 w-full">
                Usar este modelo <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
