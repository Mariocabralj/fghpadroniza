/**
 * Modelo de tópicos (outline) do documento padronizado FGH.
 *
 * A numeração NUNCA é armazenada como texto: cada bloco guarda apenas o seu
 * nível (1, 2 ou 3) e o texto. Os números (1., 1.1, 1.1.1) são calculados no
 * momento da renderização e da serialização — por isso, ao excluir um item,
 * a lista se reordena instantaneamente, sem lacunas.
 */

export type BlockKind = "heading" | "paragraph" | "image";

export interface OutlineBlock {
  id: string;
  level: 1 | 2 | 3;
  text: string;
  kind: BlockKind;
}

const NUMBER_RE = /^(\d+(?:\.\d+){0,9})\.?\s+(\S.*)$/;
const IMAGE_RE = /^\[IMAGEM:([^\]]+)\]$/;

let seq = 0;
function nextId() {
  seq += 1;
  return `blk_${Date.now().toString(36)}_${seq}`;
}

export function makeBlock(partial: Partial<OutlineBlock> = {}): OutlineBlock {
  return {
    id: nextId(),
    level: partial.level ?? 1,
    text: partial.text ?? "",
    kind: partial.kind ?? "heading",
  };
}

/** Converte o texto padronizado numa lista de blocos, removendo os números. */
export function parseOutline(text: string): OutlineBlock[] {
  const blocks: OutlineBlock[] = [];
  const lines = (text || "").split("\n");

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    const img = line.match(IMAGE_RE);
    if (img) {
      blocks.push(makeBlock({ level: 1, text: line, kind: "image" }));
      continue;
    }

    const num = line.match(NUMBER_RE);
    if (num) {
      const depth = Math.min(num[1].split(".").length, 3) as 1 | 2 | 3;
      blocks.push(makeBlock({ level: depth, text: num[2].trim(), kind: "heading" }));
      continue;
    }

    const last = blocks[blocks.length - 1];
    blocks.push(
      makeBlock({
        level: last && last.kind !== "image" ? last.level : 1,
        text: line,
        kind: "paragraph",
      })
    );
  }

  return blocks;
}

/**
 * Calcula o rótulo numérico de cada bloco (posição na lista).
 * Retorna "" para parágrafos e imagens.
 */
export function computeNumbers(blocks: OutlineBlock[]): string[] {
  const counters = [0, 0, 0];
  return blocks.map((b) => {
    if (b.kind !== "heading") return "";
    const depth = Math.min(Math.max(b.level, 1), 3);
    counters[depth - 1] += 1;
    for (let d = depth; d < 3; d++) counters[d] = 0;
    // um subitem sem pai abre implicitamente o pai
    for (let d = 0; d < depth - 1; d++) if (counters[d] === 0) counters[d] = 1;
    return counters.slice(0, depth).join(".");
  });
}

/** Serializa de volta para texto, já com a numeração correta e contínua. */
export function serializeOutline(blocks: OutlineBlock[]): string {
  const numbers = computeNumbers(blocks);
  const out: string[] = [];
  blocks.forEach((b, i) => {
    if (b.kind === "heading") {
      const text = b.text.trim();
      if (!text) return;
      out.push(`${numbers[i]}. ${text}`);
    } else {
      out.push(b.text);
    }
    out.push("");
  });
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
}
