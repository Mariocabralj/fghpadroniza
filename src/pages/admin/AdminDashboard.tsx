import { useEffect, useState } from "react";
import AppLayout from "@/components/AppLayout";
import AdminGuard from "@/components/AdminGuard";
import { supabase } from "@/integrations/supabase/client";
import { Clock, FileText, Sparkles, Download, TrendingUp } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  FunnelChart,
  Funnel,
  LabelList,
  Cell,
} from "recharts";

interface DocRow {
  id: string;
  status: string;
  sector: string | null;
  standardized_content: string | null;
}

const SECTOR_COLORS = ["hsl(var(--primary))", "hsl(var(--info))", "hsl(var(--success))", "hsl(var(--warning))", "hsl(var(--accent-foreground))"];

export default function AdminDashboard() {
  const [docs, setDocs] = useState<DocRow[]>([]);

  useEffect(() => {
    supabase
      .from("documents")
      .select("id, status, sector, standardized_content")
      .then(({ data }) => setDocs(data || []));
  }, []);

  const iniciados = docs.length;
  const processados = docs.filter((d) => !!d.standardized_content).length;
  // Heuristic: any standardized doc is exportable; use status Pronto/Finalizado as exported proxy
  const exportados = docs.filter((d) => d.status === "Pronto" || d.status === "Finalizado").length;

  const funnelData = [
    { name: "Iniciados", value: Math.max(iniciados, 1), fill: "hsl(var(--info))" },
    { name: "Processados pela IA", value: Math.max(processados, 1), fill: "hsl(var(--primary))" },
    { name: "Exportados em DOCX", value: Math.max(exportados, 1), fill: "hsl(var(--success))" },
  ];

  const minutosEconomizados = exportados * 30;
  const horasEconomizadas = (minutosEconomizados / 60).toFixed(1);

  const sectorMap: Record<string, number> = {};
  docs.forEach((d) => {
    const s = (d.sector || "Não informado").trim() || "Não informado";
    sectorMap[s] = (sectorMap[s] || 0) + 1;
  });
  const sectorData = Object.entries(sectorMap)
    .map(([sector, count]) => ({ sector, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  return (
    <AdminGuard>
      <AppLayout>
        <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-in">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Dashboard Admin</h1>
            <p className="text-muted-foreground text-sm">Métricas globais e analytics da plataforma</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard icon={FileText} label="Documentos Iniciados" value={iniciados} color="bg-info/10 text-info" />
            <MetricCard icon={Sparkles} label="Processados pela IA" value={processados} color="bg-primary/10 text-primary" />
            <MetricCard icon={Download} label="Exportados em DOCX" value={exportados} color="bg-success/10 text-success" />
            <div className="bg-gradient-to-br from-primary to-primary/70 rounded-xl p-5 shadow-card text-primary-foreground">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90">Economia de Tempo Total</p>
                  <p className="text-3xl font-bold mt-1">{horasEconomizadas}h</p>
                  <p className="text-xs opacity-80 mt-1">{minutosEconomizados} min · 30 min/doc</p>
                </div>
                <Clock className="w-10 h-10 opacity-80" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-card rounded-xl border p-6 shadow-card">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-primary" />
                <h2 className="font-semibold text-foreground">Funil de Conversão</h2>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <FunnelChart>
                  <Tooltip />
                  <Funnel dataKey="value" data={funnelData} isAnimationActive>
                    <LabelList position="right" fill="hsl(var(--foreground))" stroke="none" dataKey="name" />
                    <LabelList position="center" fill="white" stroke="none" dataKey="value" className="font-bold" />
                  </Funnel>
                </FunnelChart>
              </ResponsiveContainer>
              <p className="text-xs text-muted-foreground mt-2">
                Identifique em qual etapa os usuários estão desistindo do fluxo de padronização.
              </p>
            </div>

            <div className="bg-card rounded-xl border p-6 shadow-card">
              <h2 className="font-semibold text-foreground mb-4">Ranking de Atividade por Setor</h2>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={sectorData} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis dataKey="sector" type="category" stroke="hsl(var(--muted-foreground))" fontSize={12} width={120} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                  <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                    {sectorData.map((_, i) => (
                      <Cell key={i} fill={SECTOR_COLORS[i % SECTOR_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </AppLayout>
    </AdminGuard>
  );
}

function MetricCard({ icon: Icon, label, value, color }: any) {
  return (
    <div className="bg-card rounded-xl border p-5 shadow-card">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-3xl font-bold text-foreground mt-1">{value}</p>
        </div>
        <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}
