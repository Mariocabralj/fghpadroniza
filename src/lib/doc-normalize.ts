/**
 * Utilitários de normalização do conteúdo padronizado FGH.
 *
 * 1. reindexNumbering  — reindexa automaticamente seções (1., 2., 3.) e
 *    subseções (1.1, 1.1.1). Se o gestor apagar um item intermediário,
 *    os seguintes sobem e a numeração fica contínua, sem lacunas.
 * 2. ensureImageMarkers — garante que NENHUM marcador [IMAGEM:id] enviado
 *    pelo usuário seja descartado pela IA durante o processamento.
 */

const TOP_LEVEL_RE = /^(\d+)\.?(\s+)(\S.*)$/;
const SUB_LEVEL_RE = /^(\d+(?:\.\d+){1,9})\.?(\s+)(\S.*)$/;

export function reindexNumbering(text: string): string {
  if (!text) return text;
  const lines = text.split("\n");
  const out: string[] = [];

  let topCount = 0;
  let lastTopOriginal = 0;
  // contadores sequenciais por "pai" já reindexado (ex.: "3" → 2 filhos)
  const childCount = new Map<string, number>();
  // último caminho reindexado por profundidade (1-indexado)
  const mappedPath: string[] = [];

  for (const raw of lines) {
    const line = raw.replace(/\s+$/, "");
    const trimmed = line.trim();

    const sub = trimmed.match(SUB_LEVEL_RE);
    if (sub) {
      const parts = sub[1].split(".").map((n) => parseInt(n, 10));
      // limite rígido de 3 níveis (Norma Zero)
      const depth = Math.min(parts.length, 3);
      if (topCount === 0) {
        // subitem antes de qualquer seção — abre a seção 1
        topCount = 1;
        mappedPath[0] = "1";
      }
      // constrói o caminho do pai a partir dos níveis já mapeados
      const parentPath = mappedPath.slice(0, depth - 1).join(".");
      const key = `${depth}|${parentPath}`;
      const next = (childCount.get(key) ?? 0) + 1;
      childCount.set(key, next);
      mappedPath[depth - 1] = String(next);
      mappedPath.length = depth;
      // ao avançar um item, zera os contadores dos níveis mais profundos
      for (const k of Array.from(childCount.keys())) {
        const [d, p] = k.split("|");
        if (Number(d) > depth && p.startsWith(mappedPath.join("."))) childCount.delete(k);
        else if (Number(d) > depth && parentPath && p.startsWith(parentPath)) childCount.delete(k);
      }
      const newNumber = mappedPath.slice(0, depth).join(".");
      out.push(line.replace(trimmed, `${newNumber}${sub[2]}${sub[3]}`));
      continue;
    }

    const top = trimmed.match(TOP_LEVEL_RE);
    if (top) {
      const original = parseInt(top[1], 10);
      // reinício natural (ex.: fim do SUMÁRIO e começo do corpo)
      if (original === 1 && lastTopOriginal > 1) {
        topCount = 0;
        childCount.clear();
      }
      lastTopOriginal = original;
      topCount += 1;
      mappedPath.length = 0;
      mappedPath[0] = String(topCount);
      for (const k of Array.from(childCount.keys())) {
        if (!k.startsWith("1|")) childCount.delete(k);
      }
      out.push(line.replace(trimmed, `${topCount}.${top[2]}${top[3]}`));
      continue;
    }

    out.push(line);
  }

  return out.join("\n");
}

/** Lista os ids de imagem presentes num texto, na ordem em que aparecem. */
export function listImageMarkers(text: string): string[] {
  const ids: string[] = [];
  const re = /\[IMAGEM:([^\]]+)\]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text || "")) !== null) ids.push(m[1].trim());
  return ids;
}

/**
 * Retenção obrigatória de imagens: se a IA apagou algum marcador [IMAGEM:id]
 * que existia no conteúdo original, ele é reinserido — sempre que possível
 * ancorado no mesmo contexto textual em que aparecia no original (a âncora é
 * o trecho de texto imediatamente anterior à imagem). Se não houver âncora
 * reconhecível, o marcador é acrescentado ao final, para nunca se perder.
 */
export function ensureImageMarkers(originalText: string, generatedText: string): string {
  const originalIds = listImageMarkers(originalText);
  if (originalIds.length === 0) return generatedText;

  const present = new Set(listImageMarkers(generatedText));
  const missing = originalIds.filter((id) => !present.has(id));
  if (missing.length === 0) return generatedText;

  const originalLines = originalText.split("\n");
  let result = generatedText;

  for (const id of missing) {
    const idx = originalLines.findIndex((l) => l.includes(`[IMAGEM:${id}]`));
    let anchor = "";
    for (let k = idx - 1; k >= 0 && k >= idx - 6; k--) {
      const candidate = originalLines[k].replace(/\[IMAGEM:[^\]]+\]/g, "").trim();
      if (candidate.length >= 12) { anchor = candidate; break; }
    }

    let inserted = false;
    if (anchor) {
      // procura no gerado uma linha com boa sobreposição de palavras com a âncora
      const anchorWords = anchor.toLowerCase().split(/\W+/).filter((w) => w.length > 3);
      const genLines = result.split("\n");
      let bestIdx = -1;
      let bestScore = 0;
      genLines.forEach((line, i) => {
        const low = line.toLowerCase();
        const score = anchorWords.filter((w) => low.includes(w)).length;
        if (score > bestScore) { bestScore = score; bestIdx = i; }
      });
      if (bestIdx >= 0 && bestScore >= Math.max(2, Math.ceil(anchorWords.length * 0.5))) {
        genLines.splice(bestIdx + 1, 0, "", `[IMAGEM:${id}]`, "");
        result = genLines.join("\n");
        inserted = true;
      }
    }

    if (!inserted) {
      result = `${result.replace(/\s+$/, "")}\n\n[IMAGEM:${id}]\n`;
    }
  }

  return result;
}
