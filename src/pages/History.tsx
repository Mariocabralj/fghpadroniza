import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Eye, Pencil, Download, Trash2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface DocRow {
  id: string;
  title: string;
  doc_type: string;
  status: string;
  created_at: string;
  updated_at: string;
}

const statusColor = (s: string) =>
  s === "Pronto" ? "bg-success/10 text-success" :
  s === "Pendência" ? "bg-warning/10 text-warning" :
  s === "Finalizado" ? "bg-muted text-muted-foreground" :
  "bg-info/10 text-info";

export default function History() {
  const { user } = useAuth();
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [search, setSearch] = useState("");

  const load = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("documents")
      .select("id, title, doc_type, status, created_at, updated_at")
      .eq("user_id", user.user_id)
      .order("created_at", { ascending: false });
    if (error) return toast.error(error.message);
    setDocs(data || []);
  };

  useEffect(() => { load(); }, [user]);

  if (!user) return <Navigate to="/" />;

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("documents").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setDocs((d) => d.filter((x) => x.id !== id));
  };

  const fmt = (iso: string) => new Date(iso).toLocaleDateString("pt-BR");
  const filtered = docs.filter((d) => d.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Histórico</h1>
            <p className="text-muted-foreground text-sm">Seus documentos</p>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar documentos..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
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
                {filtered.length === 0 && (
                  <tr><td colSpan={6} className="text-center text-sm text-muted-foreground p-8">Nenhum documento encontrado.</td></tr>
                )}
                {filtered.map((d) => (
                  <tr key={d.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-foreground">{d.title}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{d.doc_type}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColor(d.status)}`}>{d.status}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{fmt(d.created_at)}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{fmt(d.updated_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8"><Eye className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8"><Pencil className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8"><Download className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(d.id)}><Trash2 className="w-4 h-4" /></Button>
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
