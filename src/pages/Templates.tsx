import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { FileText, ArrowRight, BookOpen, ClipboardList, ScrollText, FileCheck, LayoutList, Scale, Users, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";

const templates = [
  {
    title: "POP / PRS",
    desc: "Procedimento Operacional Padrão com 10 seções: Apresentação, Objetivos, Abrangência, Competências, Fluxogramas, Disposições Gerais, Informações Adicionais, Histórico, Referências e Anexos.",
    category: "POP",
    color: "bg-primary/10 text-primary",
    icon: ClipboardList,
    docType: "POP/PRS",
    sections: ["Apresentação", "Objetivos", "Abrangência", "Competências", "Fluxogramas", "Disposições Gerais", "Informações Adicionais", "Histórico de Revisões", "Referência Bibliográfica", "Anexos"],
  },
  {
    title: "Protocolo Clínico",
    desc: "Protocolo para condutas clínicas com 12 seções incluindo critérios de inclusão/exclusão e resultados esperados com indicadores.",
    category: "Protocolo",
    color: "bg-success/10 text-success",
    icon: FileCheck,
    docType: "Protocolo Clínico",
    sections: ["Apresentação", "Objetivos", "Abrangência", "Critérios de Inclusão/Exclusão", "Competências", "Fluxogramas", "Disposições Gerais", "Resultados Esperados", "Informações Adicionais", "Histórico de Revisões", "Referência Bibliográfica", "Anexos"],
  },
  {
    title: "Manual",
    desc: "Modelo de manual institucional com 7 seções: Objetivos, Abrangência, Siglário, Competência, Disposições Gerais, Histórico e Referências.",
    category: "Manual",
    color: "bg-info/10 text-info",
    icon: BookOpen,
    docType: "Manual",
    sections: ["Objetivos", "Abrangência", "Siglário", "Competência", "Disposições Gerais", "Histórico de Revisões", "Referência Bibliográfica"],
  },
  {
    title: "Plano",
    desc: "Modelo para planos operacionais com Objetivo, Abrangência, Responsabilidades, Procedimentos, Gestão de Riscos e mais.",
    category: "Plano",
    color: "bg-warning/10 text-warning",
    icon: LayoutList,
    docType: "Plano",
    sections: ["Objetivo", "Abrangência", "Material Necessário", "Responsabilidades", "Definições", "Procedimentos/Atividades", "Gestão de Riscos", "Histórico de Revisões", "Referência Bibliográfica"],
  },
  {
    title: "Política Interna",
    desc: "Modelo para políticas institucionais com Apresentação, Objetivo, Siglário, Disposições Gerais e Informações Adicionais.",
    category: "Política",
    color: "bg-primary/10 text-primary",
    icon: Scale,
    docType: "Política Interna",
    sections: ["Apresentação", "Objetivo", "Siglário", "Disposições Gerais", "Informações Adicionais", "Histórico de Revisões", "Referências"],
  },
  {
    title: "Regimento Interno",
    desc: "Estrutura em capítulos: Natureza e Competências, Composição, Atribuições, Funcionamento, Resultados, Anexos e Referências.",
    category: "Regimento",
    color: "bg-muted text-muted-foreground",
    icon: ScrollText,
    docType: "Regimento Interno",
    sections: ["Cap. I - Natureza e Competências", "Cap. II - Composição", "Cap. III - Atribuições", "Cap. IV - Funcionamento", "Cap. V - Resultados", "Cap. VI - Anexos", "Cap. VII - Referências"],
  },
  {
    title: "Fluxograma",
    desc: "Modelo para representação visual de processos com etapas, decisões e responsáveis.",
    category: "Fluxograma",
    color: "bg-info/10 text-info",
    icon: FileText,
    docType: "Fluxograma",
    sections: ["Representação visual do processo", "Etapas numeradas", "Pontos de decisão", "Responsáveis"],
  },
  {
    title: "Carta de Anuência",
    desc: "Modelo para formalizar consentimento do responsável pelo setor para projetos de pesquisa.",
    category: "Carta",
    color: "bg-success/10 text-success",
    icon: FileText,
    docType: "Carta de Anuência",
    sections: ["Objetivos", "Abrangência", "Siglário", "Competência", "Disposições Gerais", "Histórico de Revisões", "Referência Bibliográfica"],
  },
  {
    title: "Ata de Reunião",
    desc: "Modelo para registro de reuniões com pauta, pendências, assuntos abordados, deliberações e participantes.",
    category: "Ata",
    color: "bg-warning/10 text-warning",
    icon: Users,
    docType: "Ata de Reunião",
    sections: ["Pauta", "Pendências Anteriores", "Assuntos Abordados", "Deliberações", "Participantes"],
  },
  {
    title: "Norma Zero",
    desc: "Documento base institucional com 8 seções padronizadas: Apresentação, Objetivo, Abrangência, Competência, Siglário, Disposições Gerais, Alterações e Referências.",
    category: "Norma",
    color: "bg-primary/10 text-primary",
    icon: FileSpreadsheet,
    docType: "Norma Zero",
    sections: ["Apresentação", "Objetivo", "Abrangência", "Competência", "Siglário", "Disposições Gerais e Informações Adicionais", "Alterações de Versões", "Referências Bibliográficas"],
  },
];

export default function Templates() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<string | null>(null);

  if (!user) return <Navigate to="/" />;

  const categories = [...new Set(templates.map((t) => t.category))];
  const filtered = filter ? templates.filter((t) => t.category === filter) : templates;

  const handleUseTemplate = (docType: string) => {
    navigate("/novo-documento");
    // The user will select the docType in the form
  };

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Biblioteca de Modelos</h1>
          <p className="text-muted-foreground text-sm">Modelos oficiais da Norma Zero FGH — clique para usar como base</p>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Button
            variant={filter === null ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(null)}
          >
            Todos
          </Button>
          {categories.map((cat) => (
            <Button
              key={cat}
              variant={filter === cat ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(cat)}
            >
              {cat}
            </Button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((t, i) => {
            const Icon = t.icon;
            return (
              <div key={i} className="bg-card rounded-xl border shadow-card hover:shadow-card-hover transition-all p-6 flex flex-col">
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-10 h-10 rounded-lg ${t.color} flex items-center justify-center`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${t.color}`}>{t.category}</span>
                </div>
                <h3 className="font-semibold text-foreground mb-1">{t.title}</h3>
                <p className="text-sm text-muted-foreground mb-3">{t.desc}</p>
                <div className="flex-1 mb-4">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Seções:</p>
                  <div className="flex flex-wrap gap-1">
                    {t.sections.slice(0, 5).map((s, j) => (
                      <span key={j} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{s}</span>
                    ))}
                    {t.sections.length > 5 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">+{t.sections.length - 5}</span>
                    )}
                  </div>
                </div>
                <Button variant="outline" className="gap-2 w-full" onClick={() => handleUseTemplate(t.docType)}>
                  Usar este modelo <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
}
