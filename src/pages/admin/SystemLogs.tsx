import { useEffect, useState } from "react";
import AppLayout from "@/components/AppLayout";
import AdminGuard from "@/components/AdminGuard";
import { supabase } from "@/integrations/supabase/client";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSortable, SortIcon } from "@/hooks/use-sortable";
import { usePagination, TablePagination } from "@/hooks/use-pagination";

interface LogRow {
  id: string;
  level: string;
  source: string;
  message: string;
  metadata: any;
  created_at: string;
  user_id: string | null;
}

interface ProfileMini {
  user_id: string;
  name: string;
  email: string | null;
}

// Tradução de códigos de erro → explicação para o admin
function interpretError(log: LogRow): { code: string; explanation: string } {
  const meta = log.metadata || {};
  const status = meta.status as number | undefined;
  const msg = log.message || "";

  // 1) HTTP status (process-document)
  if (status === 429) return { code: "HTTP 429", explanation: "Limite de requisições da IA excedido — muitos pedidos em pouco tempo." };
  if (status === 402) return { code: "HTTP 402", explanation: "Créditos do gateway de IA esgotados — recarregar workspace." };
  if (status === 401 || status === 403) return { code: `HTTP ${status}`, explanation: "Falha de autenticação/autorização com o serviço de IA." };
  if (status === 400) return { code: "HTTP 400", explanation: "Requisição mal formada enviada ao motor (provavelmente faltou conteúdo ou tipo de documento)." };
  if (status === 500) return { code: "HTTP 500", explanation: "Exceção interna do servidor durante o processamento." };
  if (typeof status === "number") return { code: `HTTP ${status}`, explanation: "Resposta inesperada do gateway de IA." };

  // 2) Extrator de arquivos
  if (log.source === "file-extractor") {
    if (/sem texto/i.test(msg)) return { code: "FILE_EMPTY", explanation: "PDF/DOCX sem texto extraível — provavelmente é uma imagem digitalizada (precisa OCR)." };
    return { code: "FILE_READ", explanation: "Falha ao ler o arquivo enviado (formato corrompido ou não suportado)." };
  }

  // 3) Geral
  if (/falha geral/i.test(msg)) return { code: "RUNTIME", explanation: "Exceção não tratada na função — ver stack nos metadados." };
  return { code: "GENERIC", explanation: "Erro genérico — inspecione mensagem e metadados." };
}

export default function SystemLogs() {
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileMini>>({});
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("system_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(300);
    const rows = (data || []) as LogRow[];
    setLogs(rows);

    // Resolve nomes/emails dos usuários afetados em uma única query
    const ids = Array.from(new Set(rows.map((r) => r.user_id).filter(Boolean))) as string[];
    if (ids.length > 0) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, name, email")
        .in("user_id", ids);
      const map: Record<string, ProfileMini> = {};
      (profs || []).forEach((p: any) => { map[p.user_id] = p; });
      setProfiles(map);
    } else {
      setProfiles({});
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const { sorted, sortKey, sortDir, toggle } = useSortable<LogRow>(logs, "created_at", "desc");
  const { paged, page, setPage, pageSize, setPageSize, pageCount, total } = usePagination(sorted);

  const levelColor = (l: string) =>
    l === "error" ? "bg-destructive/10 text-destructive" :
    l === "warning" ? "bg-warning/10 text-warning" :
    "bg-info/10 text-info";

  const Th = ({ children, k }: any) => (
    <th
      onClick={() => toggle(k)}
      className="text-left text-xs font-semibold text-muted-foreground px-4 py-3 cursor-pointer select-none hover:text-foreground"
    >
      {children}
      <SortIcon active={sortKey === k} dir={sortDir} />
    </th>
  );

  return (
    <AdminGuard>
      <AppLayout>
        <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-in">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <AlertCircle className="w-6 h-6 text-primary" /> Logs do Sistema
              </h1>
              <p className="text-muted-foreground text-sm">Falhas em processamento de PDF/TXT e geração de DOCX — com usuário afetado e interpretação do erro</p>
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
                    <Th k="created_at">Data/Hora</Th>
                    <Th k="level">Nível</Th>
                    <Th k="source">Origem</Th>
                    <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Usuário afetado</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Código</th>
                    <Th k="message">Mensagem</Th>
                    <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Interpretação</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Metadados</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {paged.length === 0 && (
                    <tr><td colSpan={8} className="text-center text-sm text-muted-foreground p-8">Nenhum log registrado.</td></tr>
                  )}
                  {paged.map((l) => {
                    const prof = l.user_id ? profiles[l.user_id] : null;
                    const interp = interpretError(l);
                    return (
                      <tr key={l.id} className="hover:bg-muted/30 align-top">
                        <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(l.created_at).toLocaleString("pt-BR")}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${levelColor(l.level)}`}>{l.level}</span>
                        </td>
                        <td className="px-4 py-3 text-sm font-mono">{l.source}</td>
                        <td className="px-4 py-3 text-sm">
                          {prof ? (
                            <div>
                              <div className="font-medium text-foreground">{prof.name}</div>
                              <div className="text-xs text-muted-foreground">{prof.email}</div>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">— sem usuário —</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-mono px-2 py-1 rounded bg-muted text-foreground">{interp.code}</span>
                        </td>
                        <td className="px-4 py-3 text-sm max-w-xs break-words">{l.message}</td>
                        <td className="px-4 py-3 text-xs text-foreground max-w-xs">{interp.explanation}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground font-mono max-w-[200px] truncate" title={l.metadata ? JSON.stringify(l.metadata) : ""}>
                          {l.metadata ? JSON.stringify(l.metadata) : "-"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <TablePagination
              page={page}
              pageCount={pageCount}
              pageSize={pageSize}
              total={total}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              label="logs"
            />
          </div>
        </div>
      </AppLayout>
    </AdminGuard>
  );
}
