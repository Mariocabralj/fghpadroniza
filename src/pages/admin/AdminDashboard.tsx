import { useEffect, useState } from "react";
import AppLayout from "@/components/AppLayout";
import AdminGuard from "@/components/AdminGuard";
import { supabase } from "@/integrations/supabase/client";
import { Clock, FileText, TrendingUp, Layers, Info, PercentCircle, Users, BarChart3 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from "recharts";

interface DocRow {
  id: string;
  status: string;
  sector: string | null;
  doc_type: string | null;
  user_id: string;
  standardized_content: string | null;
  updated_at: string;
}

interface ProfileRow {
  user_id: string;
  name: string;
  sector: string | null;
}

const SECTOR_COLORS = ["hsl(var(--primary))", "hsl(var(--info))", "hsl(var(--success))", "hsl(var(--warning))", "hsl(var(--accent-foreground))"];

const TIME_WEIGHTS: Record<string, number> = {
  POP: 120, PRS: 120,
  "Protocolo Clínico": 30, Protocolo: 30,
  Manual: 60, Plano: 240,
  Política: 120, Politica: 120,
  "Regimento Interno": 120, Regimento: 120,
};

const CATEGORIES = ["POP", "Protocolo Clínico", "Manual", "Plano", "Política", "Regimento Interno"];

const matchCategory = (docType: string | null): string | null => {
  if (!docType) return null;
  const t = docType.toLowerCase();
  if (t.includes("pop") || t.includes("prs")) return "POP";
  if (t.includes("protocolo")) return "Protocolo Clínico";
  if (t.includes("manual")) return "Manual";
  if (t.includes("plano")) return "Plano";
  if (t.includes("política") || t.includes("politica")) return "Política";
  if (t.includes("regimento")) return "Regimento Interno";
  return null;
};

const minutesForDoc = (docType: string | null): number => {
  const cat = matchCategory(docType);
  return cat ? TIME_WEIGHTS[cat] || 0 : 0;
};

const isExported = (d: DocRow) => d.status === "Pronto" || d.status === "Finalizado";

export default function AdminDashboard() {
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileRow>>({});

  const loadDocs = async () => {
    const { data } = await supabase
      .from("documents")
      .select("id, status, sector, doc_type, user_id, standardized_content, updated_at");
    setDocs((data as DocRow[]) || []);
  };

  const loadProfiles = async () => {
    const { data } = await supabase.from("profiles").select("user_id, name, sector");
    const map: Record<string, ProfileRow> = {};
    (data || []).forEach((p: any) => { map[p.user_id] = p; });
    setProfiles(map);
  };

  useEffect(() => {
    loadDocs();
    loadProfiles();

    const channel = supabase
      .channel("admin-documents-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "documents" }, () => {
        loadDocs();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => {
        loadProfiles();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const iniciados = docs.length;
  const exportados = docs.filter(isExported);
  const taxaFinalizacao = iniciados > 0 ? ((exportados.length / iniciados) * 100).toFixed(1) : "0.0";

  const minutosEconomizados = exportados.reduce((acc, d) => acc + minutesForDoc(d.doc_type), 0);
  const horasEconomizadas = (minutosEconomizados / 60).toFixed(1);

  const now = new Date();
  const exportadosMes = exportados.filter((d) => {
    const dt = new Date(d.updated_at);
    return dt.getFullYear() === now.getFullYear() && dt.getMonth() === now.getMonth();
  });
  const categoriasUsadas = new Set(
    exportadosMes.map((d) => matchCategory(d.doc_type)).filter(Boolean) as string[]
  );
  const diversidade = categoriasUsadas.size;

  // Ranking por setor — usa setor do documento OU do profile do autor
  const sectorMap: Record<string, { count: number; minutes: number }> = {};
  docs.forEach((d) => {
    const s = ((d.sector || profiles[d.user_id]?.sector || "Não informado").trim() || "Não informado");
    if (!sectorMap[s]) sectorMap[s] = { count: 0, minutes: 0 };
    sectorMap[s].count += 1;
    if (isExported(d)) sectorMap[s].minutes += minutesForDoc(d.doc_type);
  });
  const sectorData = Object.entries(sectorMap)
    .map(([sector, v]) => ({ sector, count: v.count, hours: +(v.minutes / 60).toFixed(1) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  // Ranking por usuário/gestor
  const userMap: Record<string, number> = {};
  docs.forEach((d) => {
    userMap[d.user_id] = (userMap[d.user_id] || 0) + 1;
  });
  const userData = Object.entries(userMap)
    .map(([uid, count]) => ({
      name: profiles[uid]?.name || "Usuário",
      sector: profiles[uid]?.sector || "—",
      count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Ranking por tipo de documento (6 categorias)
  const typeData = CATEGORIES.map((cat) => ({
    type: cat,
    count: docs.filter((d) => matchCategory(d.doc_type) === cat).length,
  })).sort((a, b) => b.count - a.count);

  return (
    <AdminGuard>
      <AppLayout>
        <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-in">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Dashboard Admin</h1>
            <p className="text-muted-foreground text-sm">Métricas globais e analytics da plataforma</p>
          </div>

          <div className="bg-gradient-to-br from-primary to-primary/70 rounded-xl p-6 shadow-card text-primary-foreground">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm opacity-90">Economia de Tempo Total</p>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button type="button" className="rounded-full p-1 hover:bg-primary-foreground/10 transition" aria-label="Ver legenda de pesos">
                        <Info className="w-4 h-4 opacity-90" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-72">
                      <div className="space-y-2">
                        <p className="font-semibold text-sm text-foreground">Pesos por tipo (minutos economizados)</p>
                        <ul className="text-xs text-muted-foreground space-y-1">
                          <li className="flex justify-between"><span>POP / PRS</span><span className="font-medium text-foreground">+120 min</span></li>
                          <li className="flex justify-between"><span>Protocolo Clínico</span><span className="font-medium text-foreground">+30 min</span></li>
                          <li className="flex justify-between"><span>Manual</span><span className="font-medium text-foreground">+60 min</span></li>
                          <li className="flex justify-between"><span>Plano</span><span className="font-medium text-foreground">+240 min</span></li>
                          <li className="flex justify-between"><span>Política / Regimento Interno</span><span className="font-medium text-foreground">+120 min</span></li>
                        </ul>
                        <p className="text-[11px] text-muted-foreground pt-2 border-t">Soma aplicada apenas a documentos exportados.</p>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
                <p className="text-4xl font-bold mt-2">{horasEconomizadas}h</p>
                <p className="text-xs opacity-80 mt-1">{minutosEconomizados} min · {exportados.length} documentos exportados</p>
              </div>
              <Clock className="w-12 h-12 opacity-80" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <MetricCard icon={FileText} label="Engajamento Total" value={iniciados} hint="documentos iniciados" color="bg-info/10 text-info" />
            <MetricCard icon={PercentCircle} label="Taxa de Finalização" value={`${taxaFinalizacao}%`} hint={`${exportados.length} de ${iniciados} exportados`} color="bg-success/10 text-success" />
            <MetricCard icon={Layers} label="Índice de Diversidade" value={`${diversidade} de 6`} hint="categorias padronizadas no mês atual" color="bg-primary/10 text-primary" />
          </div>

          {/* Ranking por Setor */}
          <div className="bg-card rounded-xl border p-6 shadow-card">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-primary" />
              <h2 className="font-semibold text-foreground">Ranking de Atividade por Setor</h2>
            </div>

            {sectorData.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Nenhum dado disponível ainda.</p>
            ) : (
              <>
                <div className="grid grid-cols-12 text-xs font-medium text-muted-foreground border-b pb-2 mb-2">
                  <div className="col-span-5">Setor</div>
                  <div className="col-span-4 text-right">Total de Documentos</div>
                  <div className="col-span-3 text-right">Horas Economizadas</div>
                </div>
                <div className="space-y-1 mb-6">
                  {sectorData.map((row, i) => (
                    <div key={row.sector} className="grid grid-cols-12 items-center py-2 text-sm border-b last:border-b-0">
                      <div className="col-span-5 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: SECTOR_COLORS[i % SECTOR_COLORS.length] }} />
                        <span className="text-foreground font-medium truncate">{row.sector}</span>
                      </div>
                      <div className="col-span-4 text-right text-foreground">{row.count}</div>
                      <div className="col-span-3 text-right text-foreground font-semibold">{row.hours}h</div>
                    </div>
                  ))}
                </div>

                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={sectorData} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis dataKey="sector" type="category" stroke="hsl(var(--muted-foreground))" fontSize={12} width={120} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                    <Bar dataKey="count" name="Documentos" radius={[0, 6, 6, 0]}>
                      {sectorData.map((_, i) => (
                        <Cell key={i} fill={SECTOR_COLORS[i % SECTOR_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </>
            )}
          </div>

          {/* Ranking por Usuário */}
          <div className="bg-card rounded-xl border p-6 shadow-card">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-primary" />
              <h2 className="font-semibold text-foreground">Ranking de Gestores / Usuários</h2>
            </div>
            {userData.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Nenhum dado disponível ainda.</p>
            ) : (
              <div className="space-y-1">
                <div className="grid grid-cols-12 text-xs font-medium text-muted-foreground border-b pb-2 mb-2">
                  <div className="col-span-1">#</div>
                  <div className="col-span-6">Usuário</div>
                  <div className="col-span-3">Setor</div>
                  <div className="col-span-2 text-right">Documentos</div>
                </div>
                {userData.map((row, i) => (
                  <div key={row.name + i} className="grid grid-cols-12 items-center py-2 text-sm border-b last:border-b-0">
                    <div className="col-span-1 text-muted-foreground font-semibold">{i + 1}</div>
                    <div className="col-span-6 text-foreground font-medium truncate">{row.name}</div>
                    <div className="col-span-3 text-muted-foreground truncate">{row.sector}</div>
                    <div className="col-span-2 text-right text-foreground font-semibold">{row.count}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Ranking por Tipo */}
          <div className="bg-card rounded-xl border p-6 shadow-card">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-5 h-5 text-primary" />
              <h2 className="font-semibold text-foreground">Tipos de Documentos Mais Criados</h2>
            </div>
            {typeData.every((t) => t.count === 0) ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Nenhum documento criado ainda.</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={typeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="type" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                  <Bar dataKey="count" name="Documentos" radius={[6, 6, 0, 0]}>
                    {typeData.map((_, i) => (
                      <Cell key={i} fill={SECTOR_COLORS[i % SECTOR_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </AppLayout>
    </AdminGuard>
  );
}

function MetricCard({ icon: Icon, label, value, hint, color }: any) {
  return (
    <div className="bg-card rounded-xl border p-5 shadow-card">
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-3xl font-bold text-foreground mt-1">{value}</p>
          {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
        </div>
        <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center shrink-0`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}
