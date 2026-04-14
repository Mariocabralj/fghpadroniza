import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TEMPLATE_SECTIONS: Record<string, string> = {
  "POP/PRS": `SUMÁRIO (com hiperlinks)
1. APRESENTAÇÃO
2. OBJETIVO
3. ABRANGÊNCIA (Fixo: "Todas as áreas assistenciais e administrativas das unidades FGH")
4. COMPETÊNCIA
5. SIGLÁRIO
6. FLUXOGRAMA (se aplicável)
7. DISPOSIÇÕES GERAIS (etapas detalhadas com subitens numerados)
8. INFORMAÇÕES ADICIONAIS
9. ALTERAÇÕES DE VERSÕES (tabela: VERSÃO | DATA | CONTROLE DE ALTERAÇÕES | ELABORAÇÃO | APROVAÇÃO)
10. REFERÊNCIAS BIBLIOGRÁFICAS
11. ANEXOS`,

  "Protocolo Clínico": `SUMÁRIO (com hiperlinks)
1. APRESENTAÇÃO
2. OBJETIVO
3. ABRANGÊNCIA (Fixo: "Todas as áreas assistenciais e administrativas das unidades FGH")
4. CRITÉRIOS DE INCLUSÃO/EXCLUSÃO
5. COMPETÊNCIA
6. SIGLÁRIO
7. FLUXOGRAMA
8. DISPOSIÇÕES GERAIS (conduta clínica detalhada)
9. RESULTADOS ESPERADOS (indicadores com metas)
10. INFORMAÇÕES ADICIONAIS
11. ALTERAÇÕES DE VERSÕES (tabela: VERSÃO | DATA | CONTROLE DE ALTERAÇÕES | ELABORAÇÃO | APROVAÇÃO)
12. REFERÊNCIAS BIBLIOGRÁFICAS
13. ANEXOS`,

  "Manual": `SUMÁRIO (com hiperlinks)
1. APRESENTAÇÃO
2. OBJETIVO
3. ABRANGÊNCIA (Fixo: "Todas as áreas assistenciais e administrativas das unidades FGH")
4. SIGLÁRIO
5. COMPETÊNCIA
6. DISPOSIÇÕES GERAIS (itens detalhados do manual)
7. ALTERAÇÕES DE VERSÕES (tabela: VERSÃO | DATA | CONTROLE DE ALTERAÇÕES | ELABORAÇÃO | APROVAÇÃO)
8. REFERÊNCIAS BIBLIOGRÁFICAS`,

  "Plano": `SUMÁRIO (com hiperlinks)
1. APRESENTAÇÃO
2. OBJETIVO
3. ABRANGÊNCIA (Fixo: "Todas as áreas assistenciais e administrativas das unidades FGH")
4. MATERIAL NECESSÁRIO
5. RESPONSABILIDADES
6. DEFINIÇÕES
7. PROCEDIMENTOS/ATIVIDADES (detalhados com subitens)
8. GESTÃO DE RISCOS
9. ALTERAÇÕES DE VERSÕES (tabela: VERSÃO | DATA | CONTROLE DE ALTERAÇÕES | ELABORAÇÃO | APROVAÇÃO)
10. REFERÊNCIAS BIBLIOGRÁFICAS`,

  "Política Interna": `SUMÁRIO (com hiperlinks)
1. APRESENTAÇÃO
2. OBJETIVO
3. ABRANGÊNCIA (Fixo: "Todas as áreas assistenciais e administrativas das unidades FGH")
4. SIGLÁRIO
5. DISPOSIÇÕES GERAIS (detalhamento da política)
6. INFORMAÇÕES ADICIONAIS
7. ALTERAÇÕES DE VERSÕES (tabela: VERSÃO | DATA | CONTROLE DE ALTERAÇÕES | ELABORAÇÃO | APROVAÇÃO)
8. REFERÊNCIAS BIBLIOGRÁFICAS`,

  "Regimento Interno": `ÍNDICE
CAPÍTULO I - DA NATUREZA E COMPETÊNCIAS
CAPÍTULO II - DA COMPOSIÇÃO
CAPÍTULO III - DAS ATRIBUIÇÕES
CAPÍTULO IV - DO FUNCIONAMENTO
CAPÍTULO V - ACOMPANHAMENTO DE RESULTADO
CAPÍTULO VI - ANEXOS
CAPÍTULO VII - REFERÊNCIAS
ALTERAÇÕES DE VERSÕES (tabela: VERSÃO | DATA | CONTROLE DE ALTERAÇÕES | ELABORAÇÃO | APROVAÇÃO)`,

  "Fluxograma": `SUMÁRIO (com hiperlinks)
1. APRESENTAÇÃO
2. OBJETIVO
3. ABRANGÊNCIA (Fixo: "Todas as áreas assistenciais e administrativas das unidades FGH")
4. COMPETÊNCIA
5. SIGLÁRIO
6. FLUXOGRAMA (descrição textual detalhada de cada etapa, com pontos de decisão SIM/NÃO e responsáveis)
7. DISPOSIÇÕES GERAIS
8. ALTERAÇÕES DE VERSÕES (tabela: VERSÃO | DATA | CONTROLE DE ALTERAÇÕES | ELABORAÇÃO | APROVAÇÃO)
9. REFERÊNCIAS BIBLIOGRÁFICAS`,

  "Carta de Anuência": `SUMÁRIO (com hiperlinks)
1. OBJETIVO
2. ABRANGÊNCIA (Fixo: "Todas as áreas assistenciais e administrativas das unidades FGH")
3. SIGLÁRIO
4. COMPETÊNCIA
5. DISPOSIÇÕES GERAIS (texto da carta com campos para preenchimento)
6. ALTERAÇÕES DE VERSÕES (tabela: VERSÃO | DATA | CONTROLE DE ALTERAÇÕES | ELABORAÇÃO | APROVAÇÃO)
7. REFERÊNCIAS BIBLIOGRÁFICAS`,

  "Ata de Reunião": `ATA DE REUNIÃO
Principal Pauta
Setor/Comissão, Data, Hora
PAUTA (itens numerados)
PENDÊNCIAS DA REUNIÃO ANTERIOR (tabela: DESCRIÇÃO | RESPONSÁVEL | PRAZO | STATUS)
ASSUNTOS ABORDADOS (itens numerados)
DELIBERAÇÕES (tabela: DESCRIÇÃO | RESPONSÁVEL | PRAZO | STATUS)
JUSTIFICATIVA DE FALTAS
PARTICIPANTES (tabela: Nome | Instituição/Matrícula | Setor/Cargo | Assinatura)
ALTERAÇÕES DE VERSÕES (tabela: VERSÃO | DATA | CONTROLE DE ALTERAÇÕES | ELABORAÇÃO | APROVAÇÃO)`,

  "Panfleto": `Formato visual e informativo:
- Título chamativo
- Informações resumidas em tópicos
- Linguagem acessível ao público
- Dados de contato e identificação FGH`,

  "Portaria": `SUMÁRIO (com hiperlinks)
1. APRESENTAÇÃO
2. OBJETIVO
3. ABRANGÊNCIA (Fixo: "Todas as áreas assistenciais e administrativas das unidades FGH")
4. COMPETÊNCIA
5. DELIBERAÇÕES (artigos numerados)
6. DISPOSIÇÕES FINAIS
7. ALTERAÇÕES DE VERSÕES (tabela: VERSÃO | DATA | CONTROLE DE ALTERAÇÕES | ELABORAÇÃO | APROVAÇÃO)
8. REFERÊNCIAS BIBLIOGRÁFICAS`,

  "Ementa de Treinamento": `DADOS DO TREINAMENTO:
- Tema, Instrutor, Carga Horária, Data
- Público-alvo
- Objetivo
- Metodologia
- Conteúdo Programático
- Avaliação
- Certificação`,

  "Papel Timbrado": `Modelo de papel timbrado institucional FGH com:
- Cabeçalho com identificação da unidade
- Área para conteúdo
- Rodapé institucional`,

  "Norma Zero": `SUMÁRIO (com hiperlinks)
1. APRESENTAÇÃO
2. OBJETIVO
3. ABRANGÊNCIA (Fixo: "Todas as áreas assistenciais e administrativas das unidades FGH")
4. COMPETÊNCIA
5. SIGLÁRIO
6. DISPOSIÇÕES GERAIS E INFORMAÇÕES ADICIONAIS
7. ALTERAÇÕES DE VERSÕES (tabela: VERSÃO | DATA | CONTROLE DE ALTERAÇÕES | ELABORAÇÃO | APROVAÇÃO)
8. REFERÊNCIAS BIBLIOGRÁFICAS`,
};

const SYSTEM_PROMPT = `Você é um Especialista em Processos Hospitalares da Fundação Gestão Hospitalar Martiniano Fernandes (FGH). Sua função é transformar rascunhos, textos brutos ou descrições de ideias em documentos padronizados conforme a NORM.QUAL-001 (Norma Zero FGH).

REGRAS OBRIGATÓRIAS DE ESTRUTURA:
1. CAPA: Sempre inicie com o título do documento em CAIXA ALTA, centralizado.
2. Logo abaixo da capa inclua os metadados:
   Codificação: [A PREENCHER PELA QUALIDADE]
   Emissão: [data de hoje]
   Versão: 01
   Título: [título do documento em CAIXA ALTA]
   Elaboração: Mario Cabral
   Aprovação: [A PREENCHER]
   Revisão: [data + 2 anos]
3. Após os metadados, insira o SUMÁRIO com todos os títulos das seções numeradas.
4. Depois do sumário, siga a estrutura do modelo selecionado.

REGRAS OBRIGATÓRIAS DE CONTEÚDO:
1. SEMPRE gere o documento COMPLETO, preenchendo TODOS os tópicos da estrutura.
2. Use linguagem técnica hospitalar, formal, objetiva e JUSTIFICADA.
3. Se o conteúdo do usuário não cobrir todos os tópicos, CRIE conteúdo adequado com base no contexto e boas práticas hospitalares.
4. O item ABRANGÊNCIA deve ser SEMPRE: "Todas as áreas assistenciais e administrativas das unidades FGH".
5. SEMPRE inclua o item ALTERAÇÕES DE VERSÕES como tabela com colunas: VERSÃO | DATA | CONTROLE DE ALTERAÇÕES | ELABORAÇÃO | APROVAÇÃO
   - Primeira linha: 01 | [Data Atual] | Emissão Inicial | Mario Cabral | [A PREENCHER]
6. SEMPRE inclua REFERÊNCIAS BIBLIOGRÁFICAS reais (ANVISA, OMS, MS, ONA, CFM, COFEN, etc.).
7. Seja DETALHISTA nos procedimentos/disposições gerais - descreva passo a passo com subitens.
8. Quando o tipo for Protocolo Clínico, inclua critérios de inclusão/exclusão, fluxograma e resultados esperados.
9. Quando o tipo for POP/PRS, inclua fluxograma se aplicável e informações adicionais.

REGRAS OBRIGATÓRIAS DE FORMATAÇÃO (para interpretação do frontend):
1. Títulos de seção devem ser NUMERADOS e em CAIXA ALTA (ex: "1. APRESENTAÇÃO", "2. OBJETIVO").
2. NÃO use marcações Markdown (**, ##, etc.). Use texto puro.
3. Use bullets com "•" para listas.
4. Subitens com numeração decimal (6.1, 6.2, 6.1.1, etc.).
5. Tabelas em formato de texto com "|" como separador de colunas.
6. Separe a CAPA e o SUMÁRIO do corpo com uma linha "---QUEBRA_DE_PAGINA---".

REGRA PARA UPLOAD/CORREÇÃO:
Ao receber um rascunho para padronização, identifique os tópicos correspondentes e transponha-os para o modelo da Norma Zero. Se faltar algum tópico obrigatório (Siglário, Histórico de Revisões, etc.), gere o campo com o marcador "[A PREENCHER PELA UNIDADE]". A codificação deve ser sempre "[A PREENCHER PELA QUALIDADE]".`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const { content, docType, title, sector, mode } = await req.json();

    if (!content || !docType) {
      return new Response(
        JSON.stringify({ error: "content and docType are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const templateStructure = TEMPLATE_SECTIONS[docType] || TEMPLATE_SECTIONS["Norma Zero"];

    let userPrompt = "";
    if (mode === "upload") {
      userPrompt = `O gestor enviou o seguinte documento/rascunho para ser CORRIGIDO e padronizado conforme a Norma Zero FGH.

REGRA ESPECIAL DE UPLOAD: Identifique os tópicos correspondentes no texto original e transponha-os para o modelo da Norma Zero. Se faltar algum tópico obrigatório (como Siglário, Histórico de Revisões, Abrangência, etc.), aponte a falta gerando o campo com "[A PREENCHER PELA UNIDADE]". A codificação deve ser "[A PREENCHER PELA QUALIDADE]".

Título: ${title || "A definir"}
Setor: ${sector || "A definir"}
Tipo de documento: ${docType}

CONTEÚDO DO ARQUIVO:
${content}

ESTRUTURA OBRIGATÓRIA PARA ${docType}:
${templateStructure}

Gere o documento completo padronizado com todas as seções.`;
    } else if (mode === "paste") {
      userPrompt = `O gestor colou o seguinte texto para ser transformado em documento padronizado FGH:

Título: ${title || "A definir"}
Setor: ${sector || "A definir"}
Tipo de documento: ${docType}

TEXTO COLADO:
${content}

ESTRUTURA OBRIGATÓRIA PARA ${docType}:
${templateStructure}

Analise o texto, extraia as informações relevantes e gere o documento completo padronizado.`;
    } else {
      userPrompt = `O gestor descreveu uma ideia para criação de um novo documento:

Título: ${title || "A definir"}
Setor: ${sector || "A definir"}
Tipo de documento: ${docType}

DESCRIÇÃO DA IDEIA:
${content}

ESTRUTURA OBRIGATÓRIA PARA ${docType}:
${templateStructure}

Crie o documento COMPLETO padronizado, preenchendo TODOS os tópicos com conteúdo profissional e detalhado.`;
    }

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userPrompt },
          ],
          stream: true,
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns segundos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes. Adicione créditos ao workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(
        JSON.stringify({ error: "Erro ao processar documento com IA" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("process-document error:", e);
    const errorMessage = e instanceof Error ? e.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
