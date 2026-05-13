import { useEffect, useState } from "react";
import AppLayout from "@/components/AppLayout";
import AdminGuard from "@/components/AdminGuard";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Users, CheckCircle2, Ban, FileText } from "lucide-react";
import { toast } from "sonner";

interface ProfileRow {
  user_id: string;
  name: string;
  email: string;
  role: string;
  sector: string;
  status: string;
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

export default function UserManagement() {
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [tab, setTab] = useState<"users" | "docs">("users");

  const load = async () => {
    const { data: p } = await supabase
      .from("profiles")
      .select("user_id, name, email, role, sector, status, created_at")
      .order("created_at", { ascending: false });
    setProfiles(p || []);
    const { data: d } = await supabase
      .from("documents")
      .select("id, user_id, title, doc_type, status, created_at")
      .order("created_at", { ascending: false })
      .limit(500);
    setDocs(d || []);
  };

  useEffect(() => { load(); }, []);

  const setStatus = async (userId: string, status: string) => {
    const { error } = await supabase.from("profiles").update({ status }).eq("user_id", userId);
    if (error) return toast.error(error.message);
    toast.success(`Usuário ${status === "approved" ? "aprovado" : "bloqueado"}`);
    load();
  };

  const userMap: Record<string, ProfileRow> = {};
  profiles.forEach((p) => (userMap[p.user_id] = p));

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
                      <Th>Nome</Th><Th>E-mail</Th><Th>Cargo</Th><Th>Setor</Th><Th>Status</Th><Th className="text-right">Ações</Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {profiles.map((p) => (
                      <tr key={p.user_id} className="hover:bg-muted/30">
                        <td className="px-4 py-3 text-sm font-medium">{p.name}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{p.email}</td>
                        <td className="px-4 py-3 text-sm">{p.role || "-"}</td>
                        <td className="px-4 py-3 text-sm">{p.sector || "-"}</td>
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
            </div>
          ) : (
            <div className="bg-card rounded-xl border shadow-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr className="border-b">
                      <Th>Documento</Th><Th>Tipo</Th><Th>Autor</Th><Th>Setor</Th><Th>Status</Th><Th>Data</Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {docs.map((d) => {
                      const u = userMap[d.user_id];
                      return (
                        <tr key={d.id} className="hover:bg-muted/30">
                          <td className="px-4 py-3 text-sm font-medium flex items-center gap-2">
                            <FileText className="w-4 h-4 text-primary" /> {d.title}
                          </td>
                          <td className="px-4 py-3 text-sm">{d.doc_type}</td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">{u?.name || "—"}</td>
                          <td className="px-4 py-3 text-sm">{u?.sector || "—"}</td>
                          <td className="px-4 py-3 text-sm">{d.status}</td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">{new Date(d.created_at).toLocaleDateString("pt-BR")}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </AppLayout>
    </AdminGuard>
  );
}

const Th = ({ children, className = "" }: any) => (
  <th className={`text-left text-xs font-semibold text-muted-foreground px-4 py-3 ${className}`}>{children}</th>
);
