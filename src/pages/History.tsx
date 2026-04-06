import { Navigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Eye, Pencil, Download, Trash2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const docs = [
  { title: "POP Higienização das Mãos", type: "POP", status: "Pronto", created: "05/04/2026", modified: "05/04/2026", statusColor: "bg-success/10 text-success" },
  { title: "IT Coleta de Exames Laboratoriais", type: "IT", status: "Rascunho", created: "04/04/2026", modified: "04/04/2026", statusColor: "bg-info/10 text-info" },
  { title: "Protocolo Sepse Pediátrica", type: "Protocolo", status: "Pendência", created: "03/04/2026", modified: "04/04/2026", statusColor: "bg-warning/10 text-warning" },
  { title: "Checklist Cirurgia Segura", type: "Checklist", status: "Finalizado", created: "01/04/2026", modified: "02/04/2026", statusColor: "bg-muted text-muted-foreground" },
  { title: "POP Administração de Medicamentos", type: "POP", status: "Finalizado", created: "28/03/2026", modified: "30/03/2026", statusColor: "bg-muted text-muted-foreground" },
  { title: "IT Manutenção de Equipamentos", type: "IT", status: "Pronto", created: "25/03/2026", modified: "27/03/2026", statusColor: "bg-success/10 text-success" },
];

export default function History() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/" />;

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Histórico</h1>
            <p className="text-muted-foreground text-sm">Todos os seus documentos</p>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar documentos..." className="pl-10" />
          </div>
        </div>

        <div className="bg-card rounded-xl border shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Título</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Tipo</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Status</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Elaborado em</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Última modificação</th>
                  <th className="text-right text-xs font-semibold text-muted-foreground px-4 py-3">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {docs.map((d, i) => (
                  <tr key={i} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-foreground">{d.title}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{d.type}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${d.statusColor}`}>{d.status}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{d.created}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{d.modified}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8"><Eye className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8"><Pencil className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8"><Download className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
