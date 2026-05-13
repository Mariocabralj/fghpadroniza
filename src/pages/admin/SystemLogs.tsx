import { useEffect, useState } from "react";
import AppLayout from "@/components/AppLayout";
import AdminGuard from "@/components/AdminGuard";
import { supabase } from "@/integrations/supabase/client";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LogRow {
  id: string;
  level: string;
  source: string;
  message: string;
  metadata: any;
  created_at: string;
  user_id: string | null;
}

export default function SystemLogs() {
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("system_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(300);
    setLogs(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const levelColor = (l: string) =>
    l === "error" ? "bg-destructive/10 text-destructive" :
    l === "warning" ? "bg-warning/10 text-warning" :
    "bg-info/10 text-info";

  return (
    <AdminGuard>
      <AppLayout>
        <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-in">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <AlertCircle className="w-6 h-6 text-primary" /> Logs do Sistema
              </h1>
              <p className="text-muted-foreground text-sm">Falhas em processamento de PDF/TXT e geração de DOCX</p>
            </div>
            <Button variant="outline" onClick={load} className="gap-2">
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Atualizar
            </Button>
          </div>

          <div className="bg-card rounded-xl border shadow-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr className="border-b">
                    <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Data/Hora</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Nível</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Origem</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Mensagem</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Metadados</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {logs.length === 0 && (
                    <tr><td colSpan={5} className="text-center text-sm text-muted-foreground p-8">Nenhum log registrado.</td></tr>
                  )}
                  {logs.map((l) => (
                    <tr key={l.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(l.created_at).toLocaleString("pt-BR")}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${levelColor(l.level)}`}>{l.level}</span>
                      </td>
                      <td className="px-4 py-3 text-sm font-mono">{l.source}</td>
                      <td className="px-4 py-3 text-sm max-w-md break-words">{l.message}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground font-mono max-w-xs truncate">
                        {l.metadata ? JSON.stringify(l.metadata) : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </AppLayout>
    </AdminGuard>
  );
}
