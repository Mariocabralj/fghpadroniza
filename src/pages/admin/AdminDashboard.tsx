import { useEffect, useState } from "react";
import AppLayout from "@/components/AppLayout";
import AdminGuard from "@/components/AdminGuard";
import { supabase } from "@/integrations/supabase/client";
import { fetchAll } from "@/lib/fetch-all";
import { Clock, FileText, TrendingUp, Layers, Info, PercentCircle, Users, BarChart3, DollarSign, Mail, Activity } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useSortable, SortIcon } from "@/hooks/use-sortable";
import { unitFromEmail, OUTROS_EMAILS, UNIDADES } from "@/lib/unidades";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  PieChart,
  Pie,
  Legend,
} from "recharts";

interface DocRow {
  id: string;
  status: string;
  sector: string | null;
  doc_type: string | null;
  user_id: string;
  standardized_content: string | null;
  updated_at: string;
  created_at: string;
}

interface ProfileRow {
  user_id: string;
  name: string;
  sector: string | null;
  salary: number | null;
  email: string | null;
  created_at: string;
}

// Quantitativo consolidado manualmente pela administração (corrige erros de
// digitação nos domínios). A partir de 06/08/2026 a contagem passa a ser
// automática, somando os novos cadastros a esta base.
const EMAIL_BASELINE_DATE = new Date("2026-08-06T00:00:00-03:00");
const EMAIL_BASELINE: Record<string, number> = {
  [OUTROS_EMAILS]: 62,
  "Hospital Dom Hélder": 46,
  UPAEs: 27,
  "Hospital Miguel Arraes": 17,
  "Hospital Alfa": 16,
  "Hospital da Criança": 12,
  NGC: 15,
  "Hospital Pelópidas Silveira": 15,
  "Hospital Eduardo Campos": 14,
  UPAs: 7,
};

const PIE_COLORS = [
  "hsl(var(--primary))", "hsl(var(--info))", "hsl(var(--success))", "hsl(var(--warning))",
  "hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))",
  "hsl(var(--chart-4))", "hsl(var(--chart-5))", "hsl(var(--chart-6))",
];


const SECTOR_COLORS = ["hsl(var(--primary))", "hsl(var(--info))", "hsl(var(--success))", "hsl(var(--warning))", "hsl(var(--chart-1))"];

const TIME_WEIGHTS: Record<string, number> = {
  POP: 120, PRS: 120,
  "Protocolo Clínico": 30, Protocolo: 30,
  Manual: 60, Plano: 240,
  Política: 120, Politica: 120,
  "Regimento Interno": 120, Regimento: 120,
};

const CATEGORIES = ["POP", "Protocolo Clínico", "Manual", "Plano", "Política", "Regimento Interno"];
const COST_FACTOR = 1.4508; // encargos
const MONTHLY_HOURS = 200;

const matchCategory = (docType: string | null): string | null => {
  if (!docType) return null;
  const t = docType.toLowerCase();
  if (t.includes("pop") || t.includes("prs")) return "POP";
  const code = t.trim();
  if (code === "man") return "Manual";
  if (code === "pla") return "Plano";
  if (code === "pol") return "Política";
  if (code === "reg") return "Regimento Interno";
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

const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 });

export default function AdminDashboard() {
  const PERIOD_OPTIONS: { label: string; days: number | null }[] = [
    { label: "7 dias", days: 7 },
    { label: "30 dias", days: 30 },
    { label: "90 dias", days: 90 },
    { label: "1 ano", days: 365 },
    { label: "Todo o período", days: null },
  ];
  const [periodDays, setPeriodDays] = useState<number | null>(30);
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileRow>>({});

  const loadDocs = async () => {
    const data = await fetchAll<DocRow>(
      "documents",
      "id, status, sector, doc_type, user_id, standardized_content, updated_at, created_at",
      { column: "created_at", ascending: false }
    );
    setDocs(data);
  };

  const loadProfiles = async () => {
    const data = await fetchAll<ProfileRow>(
      "profiles",
      "user_id, name, sector, salary, email, created_at",
      { column: "created_at", ascending: false }
    );
    const map: Record<string, ProfileRow> = {};
    data.forEach((p: any) => { map[p.user_id] = p; });
    setProfiles(map);
  };


  useEffect(() => {
    loadDocs();
    loadProfiles();

    const channel = supabase
      .channel("admin-documents-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "documents" }, () => loadDocs())
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => loadProfiles())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const DAY = 86400000;
  const nowMs = Date.now();
  const periodMs = periodDays === null ? 0 : nowMs - periodDays * DAY;
  const inPeriod = (value: string | null | undefined) => {
    if (!value) return false;
    const t = new Date(value).getTime();
    return periodDays === null ? t >= 0 : t >= periodMs;
  };
  const docsFiltrados = docs.filter((d) => inPeriod(d.created_at || d.updated_at));

  const iniciados = docsFiltrados.length;
  const exportados = docsFiltrados.filter(isExported);
  const taxaFinalizacao = iniciados > 0 ? ((exportados.length / iniciados) * 100).toFixed(1) : "0.0";

  const minutosEconomizados = exportados.reduce((acc, d) => acc + minutesForDoc(d.doc_type), 0);
  const horasEconomizadas = (minutosEconomizados / 60).toFixed(1);

  // Custo de oportunidade poupado
  const custoOportunidade = exportados.reduce((acc, d) => {
    const sal = profiles[d.user_id]?.salary;
    if (!sal || sal <= 0) return acc;
    const hours = minutesForDoc(d.doc_type) / 60;
    const hourlyCost = (sal / MONTHLY_HOURS) * COST_FACTOR;
    return acc + hourlyCost * hours;
  }, 0);

  const now = new Date();
  const exportadosMes = exportados.filter((d) => {
    const dt = new Date(d.updated_at);
    return dt.getFullYear() === now.getFullYear() && dt.getMonth() === now.getMonth();
  });
  const categoriasUsadas = new Set(
    exportadosMes.map((d) => matchCategory(d.doc_type)).filter(Boolean) as string[]
  );
  const diversidade = categoriasUsadas.size;

  // Ranking por setor — FIEL ao setor cadastrado no perfil do autor
  const sectorMap: Record<string, { count: number; minutes: number }> = {};
  docsFiltrados.forEach((d) => {
    const profSector = profiles[d.user_id]?.sector?.trim();
    const s = profSector && profSector.length > 0 ? profSector : "Não informado";
    if (!sectorMap[s]) sectorMap[s] = { count: 0, minutes: 0 };
    sectorMap[s].count += 1;
    if (isExported(d)) sectorMap[s].minutes += minutesForDoc(d.doc_type);
  });
  const sectorDataAll = Object.entries(sectorMap)
    .map(([sector, v]) => ({ sector, count: v.count, hours: +(v.minutes / 60).toFixed(1) }));
  const { sorted: sectorSorted, sortKey: sKey, sortDir: sDir, toggle: sToggle } =
    useSortable<{ sector: string; count: number; hours: number }>(sectorDataAll, "count", "desc");
  const sectorData = sectorSorted.slice(0, 8);

  // Ranking por usuário (puxa setor do perfil — mesma fonte do ranking por setor)
  const userMap: Record<string, number> = {};
  docsFiltrados.forEach((d) => {
    userMap[d.user_id] = (userMap[d.user_id] || 0) + 1;
  });
  const userDataAll = Object.entries(userMap)
    .map(([uid, count]) => ({
      name: profiles[uid]?.name || "Usuário",
      sector: profiles[uid]?.sector || "—",
      count,
    }));
  const { sorted: userSorted, sortKey: uKey, sortDir: uDir, toggle: uToggle } =
    useSortable<{ name: string; sector: string; count: number }>(userDataAll, "count", "desc");
  const userData = userSorted.slice(0, 10);

  // Ranking por tipo (mesma fonte: docs)
  const typeDataAll = CATEGORIES.map((cat) => ({
    type: cat,
    count: docsFiltrados.filter((d) => matchCategory(d.doc_type) === cat).length,
  }));
  const { sorted: typeSorted, sortKey: tKey, sortDir: tDir, toggle: tToggle } =
    useSortable<{ type: string; count: number }>(typeDataAll, "count", "desc");

  // Classificação de e-mails por unidade — base consolidada + novos cadastros
  const emailCounts: Record<string, number> = { ...EMAIL_BASELINE };
  Object.values(profiles).forEach((p) => {
    if (!p.created_at) return;
    if (new Date(p.created_at) < EMAIL_BASELINE_DATE) return;
    const unit = unitFromEmail(p.email);
    emailCounts[unit] = (emailCounts[unit] || 0) + 1;
  });
  const emailOrder = [...UNIDADES.filter((u) => u !== "Outra unidade"), OUTROS_EMAILS];
  const emailData = emailOrder
    .map((name) => ({ name, value: emailCounts[name] || 0 }))
    .filter((d) => d.value > 0);
  const emailTotal = emailData.reduce((a, b) => a + b.value, 0);

  // Uso do aplicativo — respeita o filtro de período global
  const activeInPeriod = new Set(docsFiltrados.map((d) => d.user_id)).size;
  const totalUsuarios = Object.keys(profiles).length;
  const novosNoPeriodo = Object.values(profiles).filter((p) => p.created_at && inPeriod(p.created_at)).length;
  const periodLabel = PERIOD_OPTIONS.find((o) => o.days === periodDays)?.label ?? "";

  const dayKey = (dt: Date) => dt.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  const monthKey = (dt: Date) => dt.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });

  // Buckets do gráfico: por dia até 90 dias, por mês acima disso
  const useMonthlyBuckets = periodDays === null || periodDays > 90;
  const buckets: { label: string; documentos: number; cadastros: number }[] = [];
  if (useMonthlyBuckets) {
    const stamps = docsFiltrados
      .map((d) => new Date(d.created_at || d.updated_at).getTime())
      .filter(Number.isFinite);
    const earliest = stamps.length ? Math.min(...stamps) : nowMs;
    const cursor = new Date(earliest);
    cursor.setDate(1); cursor.setHours(0, 0, 0, 0);
    const last = new Date(nowMs);
    last.setDate(1); last.setHours(0, 0, 0, 0);
    while (cursor <= last) {
      buckets.push({ label: monthKey(cursor), documentos: 0, cadastros: 0 });
      cursor.setMonth(cursor.getMonth() + 1);
    }
  } else {
    for (let i = (periodDays as number) - 1; i >= 0; i--) {
      buckets.push({ label: dayKey(new Date(nowMs - i * DAY)), documentos: 0, cadastros: 0 });
    }
  }
  const bucketKeyOf = (dt: Date) => (useMonthlyBuckets ? monthKey(dt) : dayKey(dt));
  const bucketIdx: Record<string, number> = {};
  buckets.forEach((b, i) => { bucketIdx[b.label] = i; });
  docsFiltrados.forEach((d) => {
    const i = bucketIdx[bucketKeyOf(new Date(d.created_at || d.updated_at))];
    if (i !== undefined) buckets[i].documentos += 1;
  });
  Object.values(profiles).forEach((p) => {
    if (!p.created_at || !inPeriod(p.created_at)) return;
    const i = bucketIdx[bucketKeyOf(new Date(p.created_at))];
    if (i !== undefined) buckets[i].cadastros += 1;
  });
  const usersWithDocs = new Set(docs.map((d) => d.user_id)).size;
  const adesao = totalUsuarios ? ((usersWithDocs / totalUsuarios) * 100).toFixed(1) : "0.0";


  return (
    <AdminGuard>
      <AppLayout>
        <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-in">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Dashboard Admin</h1>
            <p className="text-muted-foreground text-sm">Métricas globais e analytics da plataforma</p>
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <span className="text-xs text-muted-foreground mr-1">Período:</span>
              {PERIOD_OPTIONS.map((opt) => (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => setPeriodDays(opt.days)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                    periodDays === opt.days
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card text-muted-foreground border-border hover:text-foreground"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
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
                <p className="text-xs opacity-80 mt-1">{minutosEconomizados} min · {exportados.length} documentos exportados · {periodLabel}</p>
              </div>
              <Clock className="w-12 h-12 opacity-80" />
            </div>
          </div>

          {/* Custo de Oportunidade Poupado */}
          <div className="bg-gradient-to-br from-success to-success/70 rounded-xl p-6 shadow-card text-primary-foreground">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm opacity-90">Custo de Oportunidade Poupado (R$)</p>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button type="button" className="rounded-full p-1 hover:bg-primary-foreground/10 transition" aria-label="Ver fórmula">
                        <Info className="w-4 h-4 opacity-90" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-80">
                      <div className="space-y-2 text-xs text-muted-foreground">
                        <p className="font-semibold text-sm text-foreground">Fórmula por documento exportado</p>
                        <p>(Salário do autor ÷ 200) × 1,4508 × horas economizadas pelo documento.</p>
                        <p>Usuários sem salário informado computam R$ 0,00.</p>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
                <p className="text-4xl font-bold mt-2">{fmtBRL(custoOportunidade)}</p>
                <p className="text-xs opacity-80 mt-1">com base nos salários informados · {periodLabel}</p>
              </div>
              <DollarSign className="w-12 h-12 opacity-80" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <MetricCard icon={FileText} label="Engajamento Total" value={iniciados} hint={`documentos iniciados · ${periodLabel}`} color="border-l-info text-info" />
            <MetricCard icon={PercentCircle} label="Taxa de Finalização" value={`${taxaFinalizacao}%`} hint={`${exportados.length} de ${iniciados} exportados · ${periodLabel}`} color="border-l-success text-success" />
            <MetricCard icon={Layers} label="Índice de Diversidade" value={`${diversidade} de 6`} hint="categorias padronizadas no mês atual" color="border-l-primary text-primary" />
          </div>

          {/* Uso do Aplicativo */}
          <div className="bg-card rounded-xl border p-6 shadow-card">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="w-5 h-5 text-primary" />
              <h2 className="font-semibold text-foreground">Uso do Aplicativo</h2>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              Atividade de {periodDays === null ? "todo o período" : `últimos ${periodDays} dias`} ({periodLabel}) · atualiza em tempo real
            </p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
              <UsageStat label={`Usuários ativos (${periodLabel})`} value={activeInPeriod} />
              <UsageStat label="Documentos criados" value={docsFiltrados.length} hint={`no período selecionado`} />
              <UsageStat label="Novos cadastros" value={novosNoPeriodo} hint={`no período selecionado`} />
              <UsageStat label="Adesão" value={`${adesao}%`} hint={`${usersWithDocs} de ${totalUsuarios} já criaram documento`} />
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={buckets}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={10} interval={useMonthlyBuckets ? 0 : 2} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="documentos" name="Documentos criados" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="cadastros" name="Novos cadastros" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>



          {/* Classificação de E-mails por Unidade */}
          <div className="bg-card rounded-xl border p-6 shadow-card">
            <div className="flex items-center gap-2 mb-1">
              <Mail className="w-5 h-5 text-primary" />
              <h2 className="font-semibold text-foreground">Classificação de E-mails dos Usuários</h2>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              Distribuição por domínio institucional · {emailTotal} usuários
            </p>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-center">
              <ResponsiveContainer width="100%" height={320}>
                <PieChart>
                  <Pie
                    data={emailData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={110}
                    label={(e: any) => `${e.value}`}
                  >
                    {emailData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                  <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1">
                {emailData.map((row, i) => (
                  <div key={row.name} className="flex items-center justify-between text-sm py-1.5 border-b last:border-b-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="text-foreground truncate">{row.name}</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-foreground font-semibold">{row.value}</span>
                      <span className="text-xs text-muted-foreground w-12 text-right">
                        {emailTotal ? ((row.value / emailTotal) * 100).toFixed(1) : "0.0"}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
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
                <div className="grid grid-cols-12 text-xs font-medium text-muted-foreground border-b pb-2 mb-2 select-none">
                  <button type="button" onClick={() => sToggle("sector")} className="col-span-5 text-left hover:text-foreground">
                    Setor <SortIcon active={sKey === "sector"} dir={sDir} />
                  </button>
                  <button type="button" onClick={() => sToggle("count")} className="col-span-4 text-right hover:text-foreground">
                    Total de Documentos <SortIcon active={sKey === "count"} dir={sDir} />
                  </button>
                  <button type="button" onClick={() => sToggle("hours")} className="col-span-3 text-right hover:text-foreground">
                    Horas Economizadas <SortIcon active={sKey === "hours"} dir={sDir} />
                  </button>
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
                <div className="grid grid-cols-12 text-xs font-medium text-muted-foreground border-b pb-2 mb-2 select-none">
                  <div className="col-span-1">#</div>
                  <button type="button" onClick={() => uToggle("name")} className="col-span-6 text-left hover:text-foreground">
                    Usuário <SortIcon active={uKey === "name"} dir={uDir} />
                  </button>
                  <button type="button" onClick={() => uToggle("sector")} className="col-span-3 text-left hover:text-foreground">
                    Setor <SortIcon active={uKey === "sector"} dir={uDir} />
                  </button>
                  <button type="button" onClick={() => uToggle("count")} className="col-span-2 text-right hover:text-foreground">
                    Documentos <SortIcon active={uKey === "count"} dir={uDir} />
                  </button>
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
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" />
                <h2 className="font-semibold text-foreground">Tipos de Documentos Mais Criados</h2>
              </div>
              <div className="flex gap-2 text-xs">
                <button onClick={() => tToggle("type")} className="text-muted-foreground hover:text-foreground">
                  Tipo <SortIcon active={tKey === "type"} dir={tDir} />
                </button>
                <button onClick={() => tToggle("count")} className="text-muted-foreground hover:text-foreground">
                  Qtd <SortIcon active={tKey === "count"} dir={tDir} />
                </button>
              </div>
            </div>
            {typeSorted.every((t) => t.count === 0) ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Nenhum documento criado ainda.</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={typeSorted}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="type" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                  <Bar dataKey="count" name="Documentos" radius={[6, 6, 0, 0]}>
                    {typeSorted.map((_, i) => (
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

function UsageStat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-lg border bg-muted/40 p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
      {hint && <p className="text-[11px] text-muted-foreground mt-1">{hint}</p>}
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, hint, color }: any) {
  return (
    <div className={`bg-card rounded-xl border border-l-4 p-5 shadow-card ${color}`}>
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-3xl font-bold text-foreground mt-1">{value}</p>
          {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
        </div>
        <Icon className="w-8 h-8 shrink-0" />
      </div>
    </div>
  );
}
