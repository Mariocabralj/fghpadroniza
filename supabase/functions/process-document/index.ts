import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TEMPLATE_STRUCTURES: Record<string, string> = {
  "POP/PRS": `Estrutura obrigatória para POP/PRS (Procedimento Operacional Padrão):
CAPA: Código, Emissão, Versão, Título, Elaboração, Aprovação, Revisão
SUMÁRIO
1. APRESENTAÇÃO
2. OBJETIVOS
3. ABRANGÊNCIA
4. COMPETÊNCIAS
5. FLUXOGRAMAS (se aplicável)
6. DISPOSIÇÕES GERAIS (etapas detalhadas do processo)
7. INFORMAÇÕES ADICIONAIS
8. HISTÓRICO DE REVISÕES (tabela com: VERSÃO, DATA DA REVISÃO, CONTROLE DAS ALTERAÇÕES, ELABORAÇÃO, APROVAÇÃO)
9. REFERÊNCIA BIBLIOGRÁFICA
10. ANEXOS`,

  "Protocolo Clínico": `Estrutura obrigatória para Protocolo Clínico:
CAPA: Código, Emissão, Versão, Título, Elaboração, Aprovação, Revisão
SUMÁRIO
1. APRESENTAÇÃO
2. OBJETIVOS
3. ABRANGÊNCIA
4. CRITÉRIOS DE INCLUSÃO/EXCLUSÃO
5. COMPETÊNCIAS
6. FLUXOGRAMAS
7. DISPOSIÇÕES GERAIS (conduta clínica detalhada)
8. RESULTADOS ESPERADOS (indicadores com metas)
9. INFORMAÇÕES ADICIONAIS
10. HISTÓRICO DE REVISÕES (tabela)
11. REFERÊNCIA BIBLIOGRÁFICA
12. ANEXOS`,

  "Manual": `Estrutura obrigatória para Manual:
CAPA: Código, Emissão, Versão, Título, Elaboração, Aprovação, Revisão
1. OBJETIVOS
2. ABRANGÊNCIA
3. SIGLÁRIO
4. COMPETÊNCIA
5. DISPOSIÇÕES GERAIS (itens detalhados do manual)
6. HISTÓRICO DE REVISÕES (tabela)
7. REFERÊNCIA BIBLIOGRÁFICA`,

  "Plano": `Estrutura obrigatória para Plano:
CAPA: Código, Emissão, Versão, Título, Elaboração, Aprovação, Revisão
SUMÁRIO
1. OBJETIVO
2. ABRANGÊNCIA
3. MATERIAL NECESSÁRIO
4. RESPONSABILIDADES
5. DEFINIÇÕES
6. PROCEDIMENTOS/ATIVIDADES (detalhados com subitens)
7. GESTÃO DE RISCOS
8. HISTÓRICO DE REVISÕES (tabela)
9. REFERÊNCIA BIBLIOGRÁFICA`,

  "Política Interna": `Estrutura obrigatória para Política Interna:
CAPA: Código, Emissão, Versão, Título, Elaboração, Aprovação, Revisão
1. APRESENTAÇÃO
2. OBJETIVO
3. SIGLÁRIO
4. DISPOSIÇÕES GERAIS (detalhamento da política)
5. INFORMAÇÕES ADICIONAIS
6. HISTÓRICO DE REVISÕES (tabela)
7. REFERÊNCIAS`,

  "Regimento Interno": `Estrutura obrigatória para Regimento Interno:
CAPA: Código, Emissão, Versão, Título, Elaboração, Aprovação, Revisão
ÍNDICE
CAPÍTULO I - DA NATUREZA E COMPETÊNCIAS
CAPÍTULO II - DA COMPOSIÇÃO
CAPÍTULO III - DAS ATRIBUIÇÕES
CAPÍTULO IV - DO FUNCIONAMENTO
CAPÍTULO V - ACOMPANHAMENTO DE RESULTADO
CAPÍTULO VI - ANEXOS
CAPÍTULO VII - REFERÊNCIAS`,

  "Fluxograma": `Estrutura obrigatória para Fluxograma:
CAPA: Código, Emissão, Versão, Título, Elaboração, Aprovação, Revisão
Representação visual do fluxo do processo com:
- Etapas sequenciais numeradas
- Pontos de decisão (SIM/NÃO)
- Responsáveis por cada etapa
- Início e fim do processo
Descrição textual de cada etapa do fluxograma.`,

  "Carta de Anuência": `Estrutura obrigatória para Carta de Anuência:
CAPA: Código, Emissão, Versão, Título, Elaboração, Aprovação, Revisão
1. OBJETIVOS
2. ABRANGÊNCIA
3. SIGLÁRIO
4. COMPETÊNCIA
5. DISPOSIÇÕES GERAIS (texto da carta com campos para preenchimento)
6. HISTÓRICO DE REVISÕES (tabela)
7. REFERÊNCIA BIBLIOGRÁFICA`,

  "Ata de Reunião": `Estrutura obrigatória para Ata de Reunião:
CAPA: Código, Emissão, Versão, Título, Elaboração, Aprovação, Revisão
- ATA DE REUNIÃO
- Principal Pauta
- Setor/Comissão, Data, Hora
- PAUTA (itens numerados)
- PENDÊNCIAS DA REUNIÃO ANTERIOR (tabela: DESCRIÇÃO, RESPONSÁVEL, PRAZO, STATUS)
- ASSUNTOS ABORDADOS (itens numerados)
- DELIBERAÇÕES (tabela: DESCRIÇÃO, RESPONSÁVEL, PRAZO, STATUS)
- JUSTIFICATIVA DE FALTAS
- PARTICIPANTES (tabela: Nome, Instituição/Matrícula, Setor/Cargo, Assinatura)
- HISTÓRICO DE REVISÕES`,

  "Norma Zero": `Estrutura obrigatória para documento padrão Norma Zero:
CAPA: Código, Emissão, Versão, Título, Elaboração, Aprovação, Revisão
SUMÁRIO
1. APRESENTAÇÃO
2. OBJETIVO
3. ABRANGÊNCIA
4. COMPETÊNCIA
5. SIGLÁRIO
6. DISPOSIÇÕES GERAIS E INFORMAÇÕES ADICIONAIS
7. ALTERAÇÕES DE VERSÕES (tabela: VERSÃO, DATA DA REVISÃO, CONTROLE DAS ALTERAÇÕES, ELABORAÇÃO, APROVAÇÃO)
8. REFERÊNCIAS BIBLIOGRÁFICAS`,
};

const SYSTEM_PROMPT = `Você é um Especialista em Processos Hospitalares da Fundação Gestão Hospitalar Martiniano Fernandes (FGH). Sua função é transformar rascunhos, textos brutos ou descrições de ideias em documentos padronizados conforme a Norma Zero FGH.

REGRAS OBRIGATÓRIAS:
1. SEMPRE gere o documento COMPLETO, preenchendo TODOS os tópicos da estrutura do tipo de documento escolhido.
2. Use linguagem técnica hospitalar, formal e objetiva.
3. Se o conteúdo do usuário não cobrir todos os tópicos, CRIE conteúdo adequado com base no contexto fornecido e em boas práticas hospitalares.
4. O código do documento deve seguir o padrão: [TIPO].[SETOR]-001 (ex: POP.ENF-001, PROT.MED-001, MAN.ADM-001).
5. A data de emissão é hoje. A data de revisão é daqui a 2 anos.
6. SEMPRE inclua a tabela de HISTÓRICO DE REVISÕES com a primeira versão como "Emissão Inicial".
7. Nos rodapés conceituais, use: "Atualizado por: [autor] | Validado por: [a definir] | Aprovado por: [a definir]"
8. Use referências bibliográficas reais e relevantes ao tema (ANVISA, OMS, MS, ONA, CFM, COFEN, etc.).
9. Seja DETALHISTA nos procedimentos/disposições gerais - descreva passo a passo com subitens.
10. Quando o tipo for Protocolo Clínico, inclua critérios de inclusão/exclusão e resultados esperados com indicadores.
11. Retorne APENAS o texto do documento, sem explicações adicionais ou markdown. Use texto puro formatado.
12. TODOS os cabeçalhos de seção devem ser em MAIÚSCULAS e numerados.
13. Use listas com bullets (•) ou numeração para etapas.

FORMATO DO CABEÇALHO (sempre presente):
Código: [código]
Emissão: [data hoje]
Versão: 001
Título: [título do documento]
Elaboração: [setor responsável]
Aprovação: [a definir]
Revisão: [data + 2 anos]`;

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

    const templateStructure = TEMPLATE_STRUCTURES[docType] || TEMPLATE_STRUCTURES["Norma Zero"];

    let userPrompt = "";
    if (mode === "upload") {
      userPrompt = `O gestor enviou o seguinte documento/arquivo para ser padronizado. Leia, analise e reestruture completamente conforme a Norma Zero FGH:

Título: ${title || "A definir"}
Setor: ${sector || "A definir"}
Tipo de documento: ${docType}

CONTEÚDO DO ARQUIVO:
${content}

${templateStructure}

Gere o documento completo padronizado.`;
    } else if (mode === "paste") {
      userPrompt = `O gestor colou o seguinte texto para ser transformado em documento padronizado FGH:

Título: ${title || "A definir"}
Setor: ${sector || "A definir"}
Tipo de documento: ${docType}

TEXTO COLADO:
${content}

${templateStructure}

Analise o texto, extraia as informações relevantes e gere o documento completo padronizado conforme a estrutura acima.`;
    } else {
      userPrompt = `O gestor descreveu uma ideia para criação de um novo documento. Use essa descrição para criar um documento completo e profissional:

Título: ${title || "A definir"}
Setor: ${sector || "A definir"}
Tipo de documento: ${docType}

DESCRIÇÃO DA IDEIA:
${content}

${templateStructure}

Com base na descrição, crie o documento COMPLETO padronizado conforme a estrutura acima, preenchendo TODOS os tópicos com conteúdo profissional e detalhado.`;
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
