import { Navigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Target, Wrench, Hospital, ShieldCheck, FileCheck2, History } from "lucide-react";

const INSTITUTIONAL_BLUE = "#00377b";

export default function About() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/" />;

  return (
    <AppLayout>
      <div className="p-8 max-w-4xl mx-auto animate-fade-in" style={{ fontFamily: "Arial, sans-serif" }}>
        <header className="mb-10">
          <h1 className="text-3xl font-bold mb-2" style={{ color: INSTITUTIONAL_BLUE }}>
            Sobre o FGH Padroniza
          </h1>
          <p className="text-muted-foreground text-sm">
            Ferramenta oficial de apoio à Norma Zero e à qualidade hospitalar.
          </p>
        </header>

        <section className="mb-8 bg-card rounded-xl border p-6 shadow-card">
          <div className="flex items-center gap-3 mb-3">
            <Target className="w-6 h-6" style={{ color: INSTITUTIONAL_BLUE }} />
            <h2 className="text-xl font-bold" style={{ color: INSTITUTIONAL_BLUE }}>O Propósito</h2>
          </div>
          <p className="text-foreground leading-relaxed">
            O <strong>FGH Padroniza</strong> é uma solução digital estratégica desenvolvida para a
            <strong> Fundação Gestão Hospitalar Martiniano Fernandes</strong>. Nosso objetivo é simplificar
            a gestão documental para líderes de setores, permitindo que o foco permaneça na excelência
            da assistência ao paciente, enquanto a tecnologia cuida da padronização técnica.
          </p>
        </section>

        <section className="mb-8 bg-card rounded-xl border p-6 shadow-card">
          <div className="flex items-center gap-3 mb-3">
            <Wrench className="w-6 h-6" style={{ color: INSTITUTIONAL_BLUE }} />
            <h2 className="text-xl font-bold" style={{ color: INSTITUTIONAL_BLUE }}>O que fazemos</h2>
          </div>
          <p className="text-foreground leading-relaxed mb-4">
            A ferramenta utiliza Inteligência Artificial avançada para processar rascunhos e ideias,
            transformando-os em documentos oficiais estruturados. O sistema garante que cada arquivo
            exportado esteja em total conformidade com:
          </p>
          <div className="space-y-3">
            <div className="flex gap-3">
              <ShieldCheck className="w-5 h-5 mt-0.5 shrink-0" style={{ color: INSTITUTIONAL_BLUE }} />
              <div>
                <p className="font-semibold text-foreground">Norma Zero (NORM.QUAL-001)</p>
                <p className="text-sm text-muted-foreground">
                  Padronização visual rigorosa, incluindo cabeçalhos, rodapés e a identidade institucional.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <FileCheck2 className="w-5 h-5 mt-0.5 shrink-0" style={{ color: INSTITUTIONAL_BLUE }} />
              <div>
                <p className="font-semibold text-foreground">Modelos Específicos</p>
                <p className="text-sm text-muted-foreground">
                  Estruturas diferenciadas para POPs, Protocolos e Planos de Cuidado.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <History className="w-5 h-5 mt-0.5 shrink-0" style={{ color: INSTITUTIONAL_BLUE }} />
              <div>
                <p className="font-semibold text-foreground">Rastreabilidade</p>
                <p className="text-sm text-muted-foreground">
                  Inclusão automática da tabela de Histórico de Revisões para controle de versões.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-card rounded-xl border p-6 shadow-card">
          <div className="flex items-center gap-3 mb-3">
            <Hospital className="w-6 h-6" style={{ color: INSTITUTIONAL_BLUE }} />
            <h2 className="text-xl font-bold" style={{ color: INSTITUTIONAL_BLUE }}>Apoio à Acreditação ONA</h2>
          </div>
          <p className="text-foreground leading-relaxed">
            Desenvolvido com foco nos requisitos de segurança e qualidade, o app é um aliado fundamental
            para a manutenção dos padrões exigidos pela <strong>Organização Nacional de Acreditação (ONA)</strong>.
            Ele assegura que a documentação de processos seja uniforme, legível e tecnicamente robusta em
            todas as unidades da fundação.
          </p>
        </section>
      </div>
    </AppLayout>
  );
}
