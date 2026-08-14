import { useEffect, useState, useRef } from "react";
import AppLayout from "@/components/AppLayout";
import AdminGuard from "@/components/AdminGuard";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, CheckCircle2, Ban, FileText, Pencil, Eye, EyeOff, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useSortable, SortIcon } from "@/hooks/use-sortable";
import { usePagination, TablePagination } from "@/hooks/use-pagination";
import { fetchAll } from "@/lib/fetch-all";

interface ProfileRow {
  user_id: string;
  name: string;
  email: string;
  role: string;
  sector: string;
  status: string;
  salary: number | null;
  created_at: string;
}

interface DocRow {
  id: string;
  user_id: string;
  title: string;
  doc_type: string;
  status: string;
  created_at: string;
}

const fmtBRL = (v: number | null | undefined) =>
  v == null
    ? ""
    : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function UserManagement() {
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [tab, setTab] = useState<"users" | "docs">("users");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);
  const [salaryVisible, setSalaryVisible] = useState(false);

  const load = async () => {
    const p = await fetchAll<ProfileRow>(
      "profiles",
      "user_id, name, email, role, sector, status, salary, created_at",
      { column: "created_at", ascending: false }
    );
    setProfiles(p);
    const d = await fetchAll<DocRow>(
      "documents",
      "id, user_id, title, doc_type, status, created_at",
      { column: "created_at", ascending: false }
    );
    setDocs(d);
  };

  useEffect(() => {
    load();
    const channel = supabase
      .channel("user-management-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "documents" }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const setStatus = async (userId: string, status: string) => {
    const { error } = await supabase.from("profiles").update({ status }).eq("user_id", userId);
    if (error) return toast.error(error.message);
    toast.success(`Usuário ${status === "approved" ? "aprovado" : "bloqueado"}`);
  };

  const startEdit = (p: ProfileRow) => {
    setEditingId(p.user_id);
    setEditValue(p.salary == null ? "" : String(p.salary));
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const saveEdit = async (userId: string) => {
    const trimmed = editValue.trim().replace(",", ".");
    const num = trimmed === "" ? null : Number(trimmed);
    if (num !== null && (isNaN(num) || num < 0)) {
      toast.error("Valor inválido");
      return;
    }
    // Admin edits são confidenciais: marcamos salary_opt_out=true para que
    // o valor NÃO apareça em "Configurações" do usuário (ele não pode saber
    // que o salário foi preenchido manualmente pelo admin).
    const { error } = await supabase
      .from("profiles")
      .update({ salary: num, salary_opt_out: true })
      .eq("user_id", userId);
    if (error) toast.error(error.message);
    else toast.success("Custo atualizado (oculto para o usuário)");
    setEditingId(null);
  };

  const deleteDocument = async (id: string, title: string) => {
    const { error } = await supabase.from("documents").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setDocs((prev) => prev.filter((d) => d.id !== id));
    toast.success(`"${title}" excluído. Indicadores serão recalculados.`);
  };

  const userMap: Record<string, ProfileRow> = {};
  profiles.forEach((p) => (userMap[p.user_id] = p));

  const { sorted: sortedProfiles, sortKey: pKey, sortDir: pDir, toggle: pToggle } =
    useSortable<ProfileRow>(profiles);
  const docsWithMeta = docs.map((d) => ({
    ...d,
    author: userMap[d.user_id]?.name || "—",
    authorSector: userMap[d.user_id]?.sector || "—",
  }));
  const { sorted: sortedDocs, sortKey: dKey, sortDir: dDir, toggle: dToggle } =
    useSortable<typeof docsWithMeta[number]>(docsWithMeta);

  const profilesPage = usePagination(sortedProfiles);
  const docsPage = usePagination(sortedDocs);

  return (
    <AdminGuard>
      <AppLayout>
        <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-in">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Users className="w-6 h-6 text-primary" /> Gestão de Usuários
            </h1>
            <p className="text-muted-foreground text-sm">Controle de acesso e governança da plataforma</p>
          </div>

          <div className="flex gap-2 border-b">
            <button
              onClick={() => setTab("users")}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === "users" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            >
              Usuários ({profiles.length})
            </button>
            <button
              onClick={() => setTab("docs")}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === "docs" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            >
              Histórico Global ({docs.length})
            </button>
          </div>

          {tab === "users" ? (
            <div className="bg-card rounded-xl border shadow-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr className="border-b">
                      <SortableTh onClick={() => pToggle("name")} active={pKey === "name"} dir={pDir}>Nome</SortableTh>
                      <SortableTh onClick={() => pToggle("email")} active={pKey === "email"} dir={pDir}>E-mail</SortableTh>
                      <SortableTh onClick={() => pToggle("role")} active={pKey === "role"} dir={pDir}>Cargo</SortableTh>
                      <SortableTh onClick={() => pToggle("sector")} active={pKey === "sector"} dir={pDir}>Setor</SortableTh>
                      <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">
                        <span className="flex items-center gap-1.5 cursor-pointer select-none" onClick={() => pToggle("salary")}>
                          Custo
                          <SortIcon active={pKey === "salary"} dir={pDir} />
                        </span>
                        <button
                          onClick={() => setSalaryVisible((v) => !v)}
                          className="mt-1 inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition"
                          title={salaryVisible ? "Ocultar custos" : "Mostrar custos"}
                        >
                          {salaryVisible ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          {salaryVisible ? "Ocultar" : "Mostrar"}
                        </button>
                      </th>
                      <SortableTh onClick={() => pToggle("status")} active={pKey === "status"} dir={pDir}>Status</SortableTh>
                      <th className="text-right text-xs font-semibold text-muted-foreground px-4 py-3">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {profilesPage.paged.map((p) => (
                      <tr key={p.user_id} className="hover:bg-muted/30">
                        <td className="px-4 py-3 text-sm font-medium">{p.name}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{p.email}</td>
                        <td className="px-4 py-3 text-sm">{p.role || "-"}</td>
                        <td className="px-4 py-3 text-sm">{p.sector || "-"}</td>
                        <td
                          className="px-4 py-3 text-sm cursor-pointer group"
                          onClick={() => editingId !== p.user_id && startEdit(p)}
                          title="Clique para editar"
                        >
                          {editingId === p.user_id ? (
                            <Input
                              ref={inputRef}
                              type="number"
                              step="0.01"
                              min="0"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={() => saveEdit(p.user_id)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") saveEdit(p.user_id);
                                if (e.key === "Escape") setEditingId(null);
                              }}
                              className="h-8 w-32"
                            />
                          ) : (
                            <span className="flex items-center gap-1.5">
                              <span className="text-foreground">
                                {salaryVisible ? fmtBRL(p.salary) : (p.salary == null ? "" : "••••")}
                              </span>
                              <Pencil className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition" />
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${p.status === "approved" ? "bg-success/10 text-success" : p.status === "blocked" ? "bg-destructive/10 text-destructive" : "bg-warning/10 text-warning"}`}>
                            {p.status === "approved" ? "Aprovado" : p.status === "blocked" ? "Bloqueado" : "Pendente"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-1">
                            <Button size="sm" variant="ghost" onClick={() => setStatus(p.user_id, "approved")} className="h-8 gap-1 text-success">
                              <CheckCircle2 className="w-4 h-4" /> Aprovar
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setStatus(p.user_id, "blocked")} className="h-8 gap-1 text-destructive">
                              <Ban className="w-4 h-4" /> Bloquear
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <TablePagination
                page={profilesPage.page}
                pageCount={profilesPage.pageCount}
                pageSize={profilesPage.pageSize}
                total={profilesPage.total}
                onPageChange={profilesPage.setPage}
                onPageSizeChange={profilesPage.setPageSize}
                label="usuários"
              />
            </div>
          ) : (
            <div className="bg-card rounded-xl border shadow-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr className="border-b">
                      <SortableTh onClick={() => dToggle("title")} active={dKey === "title"} dir={dDir}>Documento</SortableTh>
                      <SortableTh onClick={() => dToggle("doc_type")} active={dKey === "doc_type"} dir={dDir}>Tipo</SortableTh>
                      <SortableTh onClick={() => dToggle("author")} active={dKey === "author"} dir={dDir}>Autor</SortableTh>
                      <SortableTh onClick={() => dToggle("authorSector")} active={dKey === "authorSector"} dir={dDir}>Setor</SortableTh>
                      <SortableTh onClick={() => dToggle("status")} active={dKey === "status"} dir={dDir}>Status</SortableTh>
                      <SortableTh onClick={() => dToggle("created_at")} active={dKey === "created_at"} dir={dDir}>Data</SortableTh>
                      <th className="text-right text-xs font-semibold text-muted-foreground px-4 py-3">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {docsPage.paged.map((d) => (
                      <tr key={d.id} className="hover:bg-muted/30">
                        <td className="px-4 py-3 text-sm font-medium flex items-center gap-2">
                          <FileText className="w-4 h-4 text-primary" /> {d.title}
                        </td>
                        <td className="px-4 py-3 text-sm">{d.doc_type}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{d.author}</td>
                        <td className="px-4 py-3 text-sm">{d.authorSector}</td>
                        <td className="px-4 py-3 text-sm">{d.status}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{new Date(d.created_at).toLocaleDateString("pt-BR")}</td>
                        <td className="px-4 py-3 text-right">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="ghost" className="h-8 gap-1 text-destructive hover:text-destructive">
                                <Trash2 className="w-4 h-4" /> Excluir
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir documento?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta ação é irreversível. O documento <strong>"{d.title}"</strong> será removido do Histórico Global e todos os indicadores e dashboards serão recalculados automaticamente.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteDocument(d.id, d.title)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Excluir definitivamente
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <TablePagination
                page={docsPage.page}
                pageCount={docsPage.pageCount}
                pageSize={docsPage.pageSize}
                total={docsPage.total}
                onPageChange={docsPage.setPage}
                onPageSizeChange={docsPage.setPageSize}
                label="documentos"
              />
            </div>
          )}
        </div>
      </AppLayout>
    </AdminGuard>
  );
}

const SortableTh = ({ children, onClick, active, dir }: any) => (
  <th
    onClick={onClick}
    className="text-left text-xs font-semibold text-muted-foreground px-4 py-3 cursor-pointer select-none hover:text-foreground"
  >
    {children}
    <SortIcon active={active} dir={dir} />
  </th>
);
