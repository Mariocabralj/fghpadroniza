import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function logError(supa: any, message: string, metadata: any, userId?: string | null) {
  try {
    await supa.from("system_logs").insert({
      level: "error",
      source: "process-document",
      message,
      metadata,
      user_id: userId ?? null,
    });
  } catch (_) { /* ignore */ }
}

async function loadActiveDirectives(supa: any): Promise<string> {
  const { data } = await supa.from("ai_directives").select("content").eq("active", true).order("created_at", { ascending: true });
  if (!data || data.length === 0) return "";
  return "\n\nDIRETRIZES INSTITUCIONAIS GLOBAIS (definidas pelo Admin — aplicar SEMPRE):\n" +
    data.map((d: any, i: number) => `${i + 1}. ${d.content}`).join("\n");
}

// =============================================================================
// NÍVEL ESPECÍFICO — Estrutura exata extraída dos modelos da Biblioteca FGH
// (public/templates/MODELO_*.docx). Cada bloco reflete o layout oficial do
// arquivo correspondente. A IA deve seguir rigorosamente essas seções.
// =============================================================================
const TEMPLATE_SECTIONS: Record<string, string> = {
  "POP": `Estrutura oficial (MODELO_POP_PRS.docx) — 10 seções numeradas:
SUMÁRIO (com hiperlinks)
1. APRESENTAÇÃO — introdução curta e direta sobre o procedimento operacional
2. OBJETIVOS — finalidade do procedimento (o porquê de existir)
3. ABRANGÊNCIA — áreas/setores onde o POP se aplica (seja específico)
4. COMPETÊNCIAS — quem executa o quê (imperativo, sem rodeios)
5. FLUXOGRAMAS — descrição textual do fluxo do processo (etapas, decisões SIM/NÃO)
6. DISPOSIÇÕES GERAIS — passo a passo OPERACIONAL detalhado com subitens 6.1, 6.2, 6.1.1...
7. INFORMAÇÕES ADICIONAIS — informações complementares relevantes
8. HISTÓRICO DE REVISÕES — tabela obrigatória (5 colunas — ver REGRA TABELA)
9. REFERÊNCIA BIBLIOGRÁFICA — fontes reais
10. ANEXOS — listar documentos anexos (ou "Não se aplica")`,

  "PRS": `Estrutura oficial (MODELO_POP_PRS.docx) — 10 seções numeradas (uso sistêmico/transversal):
SUMÁRIO (com hiperlinks)
1. APRESENTAÇÃO — contexto do processo sistêmico e setores conectados
2. OBJETIVOS — finalidade do procedimento transversal
3. ABRANGÊNCIA — listar TODOS os setores/unidades envolvidos no fluxo
4. COMPETÊNCIAS — responsabilidades de CADA setor envolvido na cadeia
5. FLUXOGRAMAS — descrição textual do fluxo intersetorial, com transições e handoffs
6. DISPOSIÇÕES GERAIS — critérios, regras de transição, impedimentos, com subitens 6.1, 6.2...
7. INFORMAÇÕES ADICIONAIS
8. HISTÓRICO DE REVISÕES — tabela obrigatória (5 colunas)
9. REFERÊNCIA BIBLIOGRÁFICA
10. ANEXOS`,

  // alias compatível com documentos antigos
  "POP/PRS": `Estrutura oficial (MODELO_POP_PRS.docx) — 10 seções numeradas:
SUMÁRIO (com hiperlinks)
1. APRESENTAÇÃO — introdução sobre o tema
2. OBJETIVOS — finalidade do procedimento (o porquê de existir)
3. ABRANGÊNCIA — específica ao escopo
4. COMPETÊNCIAS — atuações de cada profissional envolvido
5. FLUXOGRAMAS — descrição textual do fluxo do processo (etapas, decisões SIM/NÃO)
6. DISPOSIÇÕES GERAIS — etapas detalhadas do processo, com subitens 6.1, 6.2, 6.1.1...
7. INFORMAÇÕES ADICIONAIS — informações complementares relevantes
8. HISTÓRICO DE REVISÕES — tabela obrigatória (5 colunas — ver REGRA TABELA)
9. REFERÊNCIA BIBLIOGRÁFICA — fontes reais (ANVISA, OMS, MS, ONA, etc.)
10. ANEXOS — listar documentos anexos (ou "Não se aplica")`,

  "Protocolo Clínico": `Estrutura oficial (MODELO_PROTOCOLO_CLINICO.docx) — 12 seções numeradas:
SUMÁRIO (com hiperlinks)
1. APRESENTAÇÃO — introdução sobre o tema clínico
2. OBJETIVOS — finalidade do protocolo
3. ABRANGÊNCIA — fixo: "Todas as áreas assistenciais e administrativas das unidades FGH"
4. CRITÉRIOS DE INCLUSÃO/EXCLUSÃO — pacientes/condições em que se aplica ou não
5. COMPETÊNCIAS — atuações de cada profissional
6. FLUXOGRAMAS — descrição textual do fluxo clínico
7. DISPOSIÇÕES GERAIS — conduta clínica detalhada com subitens 7.1, 7.2...
8. RESULTADOS ESPERADOS — indicadores com metas definidas (um indicador por resultado)
9. INFORMAÇÕES ADICIONAIS
10. HISTÓRICO DE REVISÕES — tabela obrigatória (5 colunas — ver REGRA TABELA)
11. REFERÊNCIA BIBLIOGRÁFICA
12. ANEXOS`,

  "Manual": `Estrutura oficial (MODELO_MANUAL.docx) — 7 seções numeradas:
1. OBJETIVOS — finalidade do manual
2. ABRANGÊNCIA — fixo: "Todas as áreas assistenciais e administrativas das unidades FGH"
3. SIGLÁRIO — alinhamento de linguagem, definição de termos e abreviações
4. COMPETÊNCIA — papel e responsabilidades dos envolvidos
5. DISPOSIÇÕES GERAIS — itens detalhados do manual em questão (com subitens)
6. HISTÓRICO DE REVISÕES — tabela obrigatória (5 colunas — ver REGRA TABELA)
7. REFERÊNCIA BIBLIOGRÁFICA`,

  "Plano": `Estrutura oficial (MODELO_PLANO.docx) — 7 seções numeradas:
SUMÁRIO (com hiperlinks)
1. OBJETIVO — critérios e diretrizes do plano
2. ABRANGÊNCIA — fixo: "Todas as áreas assistenciais e administrativas das unidades FGH"
3. RESPONSABILIDADES — listar por papel/cargo
4. PROCEDIMENTOS/ATIVIDADES — detalhados com subitens 4.1, 4.2, 4.1.1...
   (incluir Material Necessário e Definições quando aplicável dentro deste bloco)
5. GESTÃO DE RISCOS — riscos identificados e medidas de mitigação
6. HISTÓRICO DE REVISÕES — tabela obrigatória (5 colunas — ver REGRA TABELA)
7. REFERÊNCIA BIBLIOGRÁFICA`,

  "Política Interna": `Estrutura oficial (MODELO_POLITICA_INTERNA.docx) — 7 seções numeradas:
1. APRESENTAÇÃO — conceito e introdução do assunto da política
2. OBJETIVO — finalidade da política
3. SIGLÁRIO — alinhamento de linguagem, termos e abreviações
4. DISPOSIÇÕES GERAIS — detalhamento do processo
5. INFORMAÇÕES ADICIONAIS — informações complementares
6. HISTÓRICO DE REVISÕES — tabela obrigatória (5 colunas — ver REGRA TABELA)
7. REFERÊNCIAS`,

  "Regimento Interno": `Estrutura oficial (MODELO_REGIMENTO_INTERNO.docx) — Capítulos romanos:
ÍNDICE
CAPÍTULO I - DA NATUREZA E COMPETÊNCIAS — finalidade, definições e termos técnicos
CAPÍTULO II - DA COMPOSIÇÃO — membros da comissão e hierarquização
CAPÍTULO III - DAS ATRIBUIÇÕES — competência, papéis e responsabilidades de cada membro
CAPÍTULO IV - DO FUNCIONAMENTO — regras e políticas de funcionamento da comissão
CAPÍTULO V - ACOMPANHAMENTO DE RESULTADO — resultados/entregas periódicas, indicadores
CAPÍTULO VI - ANEXOS — documentos anexos (ato constitutivo, cronograma anual, atas...)
CAPÍTULO VII - REFERÊNCIAS — legislações aplicáveis à comissão
HISTÓRICO DE REVISÕES — tabela obrigatória (5 colunas — ver REGRA TABELA)`,

  "Fluxograma": `Estrutura oficial (MODELO_FLUXOGRAMA.docx) — fluxo descrito textualmente:
1. APRESENTAÇÃO
2. OBJETIVO — finalidade do fluxo
3. ABRANGÊNCIA — fixo: "Todas as áreas assistenciais e administrativas das unidades FGH"
4. COMPETÊNCIA — responsáveis pelo processo
5. SIGLÁRIO
6. FLUXOGRAMA — descrição textual passo a passo, com pontos de decisão SIM/NÃO,
   responsável de cada etapa e conexões entre as etapas
7. DISPOSIÇÕES GERAIS
8. HISTÓRICO DE REVISÕES — tabela obrigatória (5 colunas — ver REGRA TABELA)
9. REFERÊNCIAS BIBLIOGRÁFICAS`,

  "Carta de Anuência": `Estrutura oficial (MODELO_CARTA_ANUENCIA.docx):
1. OBJETIVOS — finalidade da carta de anuência (citando Resolução 466/2012 ou 510/2016)
2. ABRANGÊNCIA — pesquisadores externos/internos, alunos, profissionais
3. SIGLÁRIO — FGH, CEP e outras siglas pertinentes
4. COMPETÊNCIA — Diretor e Coordenador do setor
5. DISPOSIÇÕES GERAIS — corpo da carta com TÍTULO "CARTA DE ANUÊNCIA DO RESPONSÁVEL PELO SETOR"
   contendo campos para preenchimento entre colchetes [nome do setor], [título do projeto],
   [pesquisador responsável], [equipe], [objetivo], [Resolução 466/12 ou 510/16],
   declaração de sigilo e cláusula de retirada
6. HISTÓRICO DE REVISÕES — tabela obrigatória (5 colunas — ver REGRA TABELA)
7. REFERÊNCIA BIBLIOGRÁFICA`,

  "Ata de Reunião": `Estrutura oficial (MODELO_ATA_REUNIAO):
ATA DE REUNIÃO
Principal Pauta: [...]
Setor/Comissão: [...]   Data: [...]   Hora: [...]
PAUTA — itens numerados
PENDÊNCIAS DA REUNIÃO ANTERIOR — tabela: DESCRIÇÃO | RESPONSÁVEL | PRAZO | STATUS
ASSUNTOS ABORDADOS — itens numerados
DELIBERAÇÕES — tabela: DESCRIÇÃO | RESPONSÁVEL | PRAZO | STATUS
JUSTIFICATIVA DE FALTAS
PARTICIPANTES — tabela: NOME | INSTITUIÇÃO/MATRÍCULA | SETOR/CARGO | ASSINATURA
HISTÓRICO DE REVISÕES — tabela obrigatória (5 colunas — ver REGRA TABELA)`,

  "Panfleto": `Estrutura oficial (MODELO_PANFLETO.docx) — folder institucional:
TÍTULO DO FOLDER (chamativo)
Subsessões (3 a 6 blocos), cada uma contendo:
- Título da subsessão
- 3 a 5 bullets curtos com orientações práticas e linguagem acessível ao público
Informações Institucionais — identificação FGH/HPS, contato
Observação: panfleto NÃO leva tabela de Histórico de Revisões.`,

  "Portaria": `Estrutura oficial (MODELO_PORTARIA.docx) — minimalista:
1. DELIBERAÇÕES — artigos numerados (Art. 1º, Art. 2º...) com a determinação institucional
2. PARTICIPANTES — listar membros executores (nome, cargo, setor)
HISTÓRICO DE REVISÕES — tabela obrigatória (5 colunas — ver REGRA TABELA)`,

  "Ementa de Treinamento": `Estrutura oficial (MODELO_EMENTA):
DADOS DO TREINAMENTO:
- Tema, Instrutor, Carga Horária, Data
- Público-alvo
- Descrição do Treinamento
- Objetivos Principais
- Conteúdo Programático (em tópicos)
- Metodologia de Ensino
- Metodologia de Avaliação
- Resultados Esperados
- Setor Responsável
- Certificação`,

  "Papel Timbrado": `Estrutura oficial (MODELO_PAPEL_TIMBRADO.docx) — corpo livre institucional.
Use o título descrito pelo usuário como cabeçalho do conteúdo (ex.: "ATA DE OITIVA – APURAÇÃO INTERNA")
e organize o corpo com seções numeradas curtas conforme o tema (Identificação, Descrição do Fato,
Relato, Considerações Finais, Assinaturas). Inclua local, data e linhas de assinatura ao final.
Observação: papel timbrado NÃO leva tabela de Histórico de Revisões.`,

  "Norma Zero": `Estrutura oficial (MODELO_NORMA_ZERO.docx) — 8 seções numeradas:
SUMÁRIO (com hiperlinks)
1. APRESENTAÇÃO
2. OBJETIVO
3. ABRANGÊNCIA — fixo: "Todas as áreas assistenciais e administrativas das unidades FGH"
4. COMPETÊNCIA
5. SIGLÁRIO
6. DISPOSIÇÕES GERAIS E INFORMAÇÕES ADICIONAIS
7. ALTERAÇÕES DE VERSÕES — tabela obrigatória (5 colunas — ver REGRA TABELA)
8. REFERÊNCIAS BIBLIOGRÁFICAS`,
};

// =============================================================================
// NÍVEL GLOBAL — System Prompt da Norma Zero (NORM.QUAL-001)
// Aplica-se a TODOS os documentos, independentemente do tipo selecionado.
// =============================================================================
const SYSTEM_PROMPT = `Você é um Especialista em Processos Hospitalares da Fundação Gestão Hospitalar Martiniano Fernandes (FGH). Sua função é transformar rascunhos, textos brutos ou descrições de ideias em documentos padronizados conforme uma HIERARQUIA DE DOIS NÍVEIS:

═══════════════════════════════════════════════════════════════════════
NÍVEL 1 — GLOBAL (NORM.QUAL-001 / Norma Zero FGH)
Aplica-se a TODO documento gerado, independentemente do tipo.
═══════════════════════════════════════════════════════════════════════
1. SEM CAPA. O conteúdo do corpo do documento começa diretamente na primeira seção numerada (ex.: "1. APRESENTAÇÃO" ou "CAPÍTULO I - ..."). NÃO inclua título do documento no corpo — o título já consta no cabeçalho gerado pelo sistema.
2. NÃO repita os metadados (Codificação, Emissão, Versão, Título, Elaboração, Aprovação, Revisão) no corpo — esses dados são renderizados automaticamente no Header pelo motor de exportação.
3. Linguagem técnica hospitalar, formal, objetiva e justificada.
4. ABRANGÊNCIA: NÃO use mais o texto fixo "Todas as áreas assistenciais e administrativas...". Em vez disso, analise o conteúdo enviado e LISTE APENAS as áreas, setores, comissões e profissionais EFETIVAMENTE envolvidos no documento em questão (ex.: "Equipe de Enfermagem do Centro Cirúrgico, Médicos plantonistas e CCIH"). Seja específico, nunca genérico.
5. SEMPRE inclua REFERÊNCIAS BIBLIOGRÁFICAS reais (ANVISA, OMS, MS, ONA, CFM, COFEN, RDC, Resoluções, Portarias do MS, etc.) — nunca invente fontes.
6. Seja DETALHISTA nos procedimentos/disposições.
7. SIGLÁRIO: SEMPRE inclua uma seção de Siglário quando o tipo de documento previr (Manual, Política Interna, Fluxograma, Carta de Anuência, Norma Zero) e também sempre que aparecerem 2 ou mais siglas/abreviações no corpo do texto, mesmo em tipos que não listam Siglário (ex.: POP/PRS). Liste as siglas em ordem alfabética no formato "SIGLA — Significado".

REGRA DE HIERARQUIA NUMÉRICA (OBRIGATÓRIA):
- A numeração de subitens pode ter NO MÁXIMO 3 níveis (ex.: 1, 1.1, 1.1.1).
- PROIBIDO usar 4º ou 5º nível (NUNCA escreva 1.1.1.1, 1.1.1.2.3, etc.).
- Se precisar de muitos itens no mesmo nível, expanda HORIZONTALMENTE (1.1.1 até 1.1.99) — nunca verticalmente.
- Se o conteúdo original tiver hierarquia mais profunda, SIMPLIFIQUE para caber em 3 níveis.

REGRA ABSOLUTA DE NEGRITO — STRICT BOLD WHITELIST (OBRIGATÓRIA):
- O negrito é permitido APENAS nos itens principais do SUMÁRIO/ÍNDICE e nos títulos de seção/capítulo correspondentes chamados novamente no corpo do documento (ex.: "1. APRESENTAÇÃO", "2. OBJETIVOS", "CAPÍTULO I - ...").
- PROIBIDO usar negrito em subtópicos (4.1, 6.2.1 etc.), parágrafos, listas, textos descritivos, rótulos como "Objetivo:"/"Responsável:" e cabeçalhos de tabela.
- Não use **, <b>, <strong> ou qualquer marcação de negrito no conteúdo gerado. O frontend aplicará negrito somente à whitelist do Sumário e títulos equivalentes.

REGRA DE FLUXOGRAMA (CONDICIONAL):
- Se o conteúdo do usuário JÁ contiver um marcador [IMAGEM:id] dentro (ou imediatamente após) o título da seção "FLUXOGRAMA(S)", PRESERVE esse marcador exatamente como está — NÃO escreva "[INSERIR IMAGEM DO BIZAGI AQUI]".
- Se NÃO houver nenhum marcador de imagem na seção de fluxograma (o sistema vai informar via flag hasFlowchartImage=false), escreva em linha própria, ANTES de qualquer texto descritivo, a string literal: [INSERIR IMAGEM DO BIZAGI AQUI]. Só então descreva o fluxo textualmente.

REGRA DE PRESERVAÇÃO DE MÍDIA E FORMATAÇÃO ORIGINAL (CRÍTICO):
- Quando o usuário enviar um documento, PRESERVE qualquer tabela em formato pipe ("|") do conteúdo original.
- Marcadores [IMAGEM:id] (ex.: [IMAGEM:img_1], [IMAGEM:img_2]…) representam IMAGENS REAIS extraídas do upload. Você DEVE mantê-los exatamente como vieram, em linha própria, na MESMA seção/tópico em que apareciam no documento original. NUNCA remova, renomeie ou agrupe esses marcadores — o motor de exportação substitui cada marcador pela imagem original. Se uma seção do modelo recebe imagens do upload, intercale o marcador entre os parágrafos correspondentes.
- Marcadores antigos como "[IMAGEM: ...]", "[FIGURA n]", "[FLUXO BIZAGI]" também devem ser preservados quando vierem do texto.
- Tags de cor inline no formato [COR:#hex]texto[/COR] representam destaques de cor aplicados pelo usuário no documento original. PRESERVE-as EXATAMENTE como vieram (mesmo hex, mesmo trecho de texto entre as tags) — o motor de exportação aplica essa cor no DOCX final.
- Tags de marca-texto no formato [MARCA:#hex]texto[/MARCA] representam background-color/highlight aplicado pelo usuário. PRESERVE-as EXATAMENTE como vieram.
- Se você reescrever ou melhorar uma frase marcada por [COR] ou [MARCA], a frase nova que substitui aquele trecho DEVE permanecer dentro das mesmas tags e com o mesmo hex. Nunca remova, altere ou espalhe essas tags para fora do trecho correspondente.

REGRA TABELA — HISTÓRICO DE REVISÕES (OBRIGATÓRIA em quase todos os tipos):
Use SEMPRE este formato exato, com 5 colunas:
| HISTÓRICO DE REVISÕES |
| VERSÃO | DATA DA REVISÃO | CONTROLE DAS ALTERAÇÕES | ELABORAÇÃO | APROVAÇÃO |
| 01 | [Data Atual] | Emissão Inicial | [a preencher] | [a preencher] |

Exceções (NÃO incluir tabela de Histórico de Revisões):
- Panfleto
- Papel Timbrado

═══════════════════════════════════════════════════════════════════════
NÍVEL 2 — ESPECÍFICO (Biblioteca de Modelos)
Cada tipo de documento tem uma estrutura própria, extraída do arquivo
oficial da biblioteca FGH. Siga RIGOROSAMENTE a estrutura informada
no prompt do usuário (campo "ESTRUTURA OBRIGATÓRIA").
═══════════════════════════════════════════════════════════════════════
- Respeite a numeração exata, a ordem das seções e os títulos em CAIXA ALTA do modelo.
- Para Regimento Interno, use "CAPÍTULO I - ...", "CAPÍTULO II - ...", em algarismos romanos.
- Se o modelo pede subitens (ex.: 6.1, 6.2), use-os — respeitando o limite de 3 níveis.
- Se o usuário enviar um rascunho desorganizado, MAPEIE/TRANSPONHA cada parágrafo para a seção correta do modelo. Não descarte conteúdo relevante.

═══════════════════════════════════════════════════════════════════════
INTELIGÊNCIA DE MAPEAMENTO (rascunhos do usuário)
═══════════════════════════════════════════════════════════════════════
- Cruze o conteúdo enviado com as seções obrigatórias do modelo selecionado.
- Quando uma seção obrigatória não tiver conteúdo no rascunho, GERE conteúdo adequado com base em boas práticas hospitalares e no contexto fornecido.
- Quando faltar dado factual indispensável (responsáveis, datas específicas, indicadores), insira o marcador "[a preencher]" para a unidade complementar.
- O campo "Elaboração" (tanto no corpo quanto na tabela de Histórico de Revisões) deve ficar literalmente como "[a preencher]" — não escreva nome de pessoa.
- A codificação do documento é sempre "[A PREENCHER PELA QUALIDADE]" (já vai no header).

═══════════════════════════════════════════════════════════════════════
REGRAS DE FORMATAÇÃO (interpretadas pelo frontend → DOCX)
═══════════════════════════════════════════════════════════════════════
1. Títulos de seção NUMERADOS em CAIXA ALTA, em linha própria (ex.: "1. APRESENTAÇÃO"). Nada de texto corrido na mesma linha do título.
2. Subitens com numeração decimal própria em linha (ex.: "6.1 Identificação"). Coloque o título curto da subseção e, em linhas seguintes, o corpo do texto.
3. NÃO use marcações Markdown (sem **, sem ##, sem ---). Texto puro.
4. CRITÉRIO DE FORMATAÇÃO DE CONTEÚDO — escolha consciente entre três formas:
   (a) SUBSEÇÕES NUMERADAS (6.1, 6.2, 6.2.1...): use quando o item é um BLOCO COM TÍTULO PRÓPRIO + corpo explicativo (ex.: "6.1 Identificação", "6.2 Critérios de Inclusão"). Cada subseção tem um nome curto e parágrafos descritivos abaixo. Nunca use subseção numerada para um item de uma única linha.
   (b) BULLETS COM "• ": use quando há uma LISTA HOMOGÊNEA DE ITENS CURTOS (palavras, frases curtas, enumerações paralelas) que NÃO precisam de título próprio nem de parágrafo explicativo — ex.: lista de materiais, EPIs, documentos exigidos, competências curtas, etapas rápidas, público-alvo, indicadores listados. Cada bullet em linha própria começando por "• " (U+2022). NUNCA use "- ", "* " ou números soltos.
   (c) TEXTO CORRIDO (parágrafo): use quando o conteúdo é EXPLICAÇÃO/JUSTIFICATIVA/CONTEXTO, ou quando há 1-2 ideias que fluem melhor em prosa que em lista. Seções como "Apresentação", "Objetivo Geral", "Justificativa", introduções de capítulo, descrições de processo geralmente são texto corrido.
   REGRA DE OURO: não fragmente prosa em bullets só para "organizar", e não force subseções numeradas para listas simples. Leia o conteúdo, decida se cada item merece título+corpo (numerado), se é lista paralela curta (bullet), ou se é prosa (parágrafo). Misturar as três formas dentro de uma mesma seção é normal e esperado.
5. Tabelas em texto, com "|" como separador de colunas; sempre inclua a linha de cabeçalho da tabela.
6. NÃO escreva o título do documento (capa) no corpo. NÃO escreva "SUMÁRIO" se o tipo for Panfleto, Papel Timbrado ou Portaria.
7. NÃO insira a linha "---QUEBRA_DE_PAGINA---".
`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supaAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const { content, docType, title, sector, mode, hasImages, instructions } = await req.json();

    if (!content || !docType) {
      await logError(supaAdmin, "Requisição inválida (content/docType ausente)", { docType, mode });
      return new Response(
        JSON.stringify({ error: "content and docType are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const templateStructure = TEMPLATE_SECTIONS[docType] || TEMPLATE_SECTIONS["Norma Zero"];
    const globalDirectives = await loadActiveDirectives(supaAdmin);

    const flowchartFlag = `\n[Sinal do extrator] hasFlowchartImage=${hasImages ? "true" : "false"}. Use esse sinal para decidir se deve ou não inserir a linha "[INSERIR IMAGEM DO BIZAGI AQUI]" na seção FLUXOGRAMA(S), conforme a REGRA DE FLUXOGRAMA (CONDICIONAL).`;

    let userPrompt = "";
    if (mode === "refine") {
      userPrompt = `O gestor já recebeu um documento padronizado FGH e agora deseja REFINÁ-LO com novas orientações. NÃO recomece do zero — apenas aplique as alterações pedidas mantendo a ESTRUTURA OBRIGATÓRIA do tipo "${docType}", a Norma Zero e todos os marcadores especiais ([IMAGEM:id], [COR:#hex], [MARCA:#hex], tabelas em pipe).

Título: ${title || "A definir"}
Setor: ${sector || "A definir"}
Tipo de documento: ${docType}

DOCUMENTO ATUAL (refine este conteúdo):
${content}

NOVAS ORIENTAÇÕES DO GESTOR:
${instructions || "(sem orientações específicas — apenas revise o documento atual)"}

ESTRUTURA OBRIGATÓRIA PARA ${docType}:
${templateStructure}

Devolva o documento COMPLETO já refinado, começando DIRETAMENTE pela primeira seção numerada (sem capa, sem repetir título, sem repetir metadados). Preserve numeração, marcadores e tabelas.`;
    } else if (mode === "upload-format") {
      userPrompt = `O gestor enviou o documento abaixo para ser apenas FORMATADO institucionalmente (Norma Zero / papel timbrado FGH). NÃO altere o conteúdo nem o estilo de escrita — apenas TRANSPONHA o texto original para a ESTRUTURA OBRIGATÓRIA do tipo "${docType}", preservando ao máximo as palavras do autor.

REGRAS DE FORMATAÇÃO ESTRITA:
- Não reescreva, não resuma, não enriqueça e não acrescente conteúdo novo.
- Apenas reorganize o texto enviado nas seções obrigatórias do modelo.
- Se faltar conteúdo para uma seção obrigatória, insira "[A PREENCHER PELA UNIDADE]".
- A codificação é sempre "[A PREENCHER PELA QUALIDADE]" (já no cabeçalho).

Título: ${title || "A definir"}
Setor: ${sector || "A definir"}
Tipo de documento: ${docType}

CONTEÚDO ORIGINAL DO ARQUIVO (preserve a redação):
${content}

ESTRUTURA OBRIGATÓRIA PARA ${docType} (extraída do modelo oficial da biblioteca FGH):
${templateStructure}

Gere o documento padronizado começando DIRETAMENTE pela primeira seção numerada (sem capa, sem repetir título, sem repetir metadados).${flowchartFlag}`;
    } else if (mode === "upload" || mode === "upload-improve") {
      userPrompt = `O gestor enviou o seguinte documento/rascunho para ser CORRIGIDO, APRIMORADO e padronizado conforme a hierarquia FGH (Nível Global Norma Zero + Nível Específico do tipo selecionado).

REGRA ESPECIAL DE UPLOAD: Faça o MAPEAMENTO INTELIGENTE — identifique cada parágrafo/seção do texto original e transponha para a seção correspondente da ESTRUTURA OBRIGATÓRIA abaixo. Aprimore a clareza, a redação técnica e complete seções faltantes com base em boas práticas hospitalares. Se faltar dado factual da unidade, insira "[A PREENCHER PELA UNIDADE]". A codificação é sempre "[A PREENCHER PELA QUALIDADE]" (já no cabeçalho).

Título: ${title || "A definir"}
Setor: ${sector || "A definir"}
Tipo de documento: ${docType}

CONTEÚDO DO ARQUIVO:
${content}

ESTRUTURA OBRIGATÓRIA PARA ${docType} (extraída do modelo oficial da biblioteca FGH):
${templateStructure}

Gere o documento completo padronizado. Comece DIRETAMENTE pela primeira seção numerada (sem capa, sem repetir título, sem repetir metadados).${flowchartFlag}`;
    } else if (mode === "paste") {
      userPrompt = `O gestor colou o seguinte texto para ser transformado em documento padronizado FGH, seguindo a hierarquia: Nível Global Norma Zero + Nível Específico do modelo "${docType}".

Título: ${title || "A definir"}
Setor: ${sector || "A definir"}
Tipo de documento: ${docType}

TEXTO COLADO:
${content}

ESTRUTURA OBRIGATÓRIA PARA ${docType} (extraída do modelo oficial da biblioteca FGH):
${templateStructure}

Faça o MAPEAMENTO INTELIGENTE do texto colado para as seções da estrutura. Preencha as seções faltantes com conteúdo profissional e detalhado. Comece DIRETAMENTE pela primeira seção numerada.`;
    } else {
      userPrompt = `O gestor descreveu uma ideia para criação de um novo documento, seguindo a hierarquia FGH: Nível Global Norma Zero + Nível Específico do modelo "${docType}".

Título: ${title || "A definir"}
Setor: ${sector || "A definir"}
Tipo de documento: ${docType}

DESCRIÇÃO DA IDEIA:
${content}

ESTRUTURA OBRIGATÓRIA PARA ${docType} (extraída do modelo oficial da biblioteca FGH):
${templateStructure}

Crie o documento COMPLETO padronizado, preenchendo TODAS as seções com conteúdo profissional, técnico e detalhado. Comece DIRETAMENTE pela primeira seção numerada (sem capa, sem repetir título, sem repetir metadados).`;
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
            { role: "system", content: SYSTEM_PROMPT + globalDirectives },
            { role: "user", content: userPrompt },
          ],
          stream: true,
        }),
      }
    );

    if (!response.ok) {
      const t = await response.text();
      await logError(supaAdmin, `AI gateway ${response.status}`, { status: response.status, body: t.slice(0, 500), docType, mode });
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
    await logError(supaAdmin, `Falha geral: ${errorMessage}`, { stack: e instanceof Error ? e.stack?.slice(0, 500) : null });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
