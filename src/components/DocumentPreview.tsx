import { useMemo } from "react";

interface Props {
  content: string;
  title?: string;
}

type Block =
  | { type: "h1" | "h2" | "h3" | "p"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "table"; rows: string[][] }
  | { type: "image"; id: string }
  | { type: "pagebreak" }
  | { type: "spacer" };

function renderInline(text: string): (string | JSX.Element)[] {
  // bold **text** then italics *text*
  const parts: (string | JSX.Element)[] = [];
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const token = m[0];
    if (token.startsWith("**")) {
      parts.push(<strong key={key++}>{token.slice(2, -2)}</strong>);
    } else {
      parts.push(<em key={key++}>{token.slice(1, -1)}</em>);
    }
    last = m.index + token.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

function parseBlocks(text: string): Block[] {
  const lines = text.split("\n");
  const blocks: Block[] = [];
  let i = 0;

  const isTableLine = (l: string) => l.includes("|") && l.split("|").length >= 3;
  const isDivider = (l: string) => /^[\s|:\-]+$/.test(l) && l.includes("-");

  while (i < lines.length) {
    const raw = lines[i];
    const line = raw.trim();

    if (!line) {
      blocks.push({ type: "spacer" });
      i++;
      continue;
    }

    if (line === "---QUEBRA_DE_PAGINA---") {
      blocks.push({ type: "pagebreak" });
      i++;
      continue;
    }

    const img = line.match(/^\[IMAGEM:([^\]]+)\]$/);
    if (img) {
      blocks.push({ type: "image", id: img[1] });
      i++;
      continue;
    }

    // table
    if (isTableLine(raw)) {
      const tableLines: string[] = [];
      while (i < lines.length && isTableLine(lines[i])) {
        tableLines.push(lines[i]);
        i++;
      }
      const rows = tableLines
        .map((l) =>
          l
            .split("|")
            .map((c) => c.trim())
            .filter((c, idx, arr) => !(idx === 0 && c === "") && !(idx === arr.length - 1 && c === ""))
        )
        .filter((r) => r.length && !r.every(isDivider));
      if (rows.length) blocks.push({ type: "table", rows });
      continue;
    }

    // markdown headings
    const mdH = line.match(/^(#{1,3})\s+(.+)$/);
    if (mdH) {
      const level = mdH[1].length as 1 | 2 | 3;
      blocks.push({ type: `h${level}` as "h1" | "h2" | "h3", text: mdH[2] });
      i++;
      continue;
    }

    // bullets • or - or *
    if (/^[•\-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[•\-*]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[•\-*]\s+/, ""));
        i++;
      }
      blocks.push({ type: "ul", items });
      continue;
    }

    // numbered section "1. TÍTULO" - all caps -> h1
    if (/^\d+\.\s+[A-ZÁÉÍÓÚÂÊÔÃÕÇ\/ ]{3,}$/.test(line)) {
      blocks.push({ type: "h1", text: line });
      i++;
      continue;
    }
    // sub "1.1 ..." -> h2
    if (/^\d+\.\d+(\.\d+)*\.?\s+\S/.test(line)) {
      const depth = (line.match(/^\d+(\.\d+)+/)?.[0].split(".").length || 2);
      const lvl = Math.min(depth, 3) as 2 | 3;
      blocks.push({ type: `h${lvl}` as "h2" | "h3", text: line });
      i++;
      continue;
    }

    // CAPÍTULO ... -> h1
    if (/^CAPÍTULO\s+[IVXLCDM]+/i.test(line)) {
      blocks.push({ type: "h1", text: line });
      i++;
      continue;
    }

    blocks.push({ type: "p", text: line });
    i++;
  }

  return blocks;
}

function splitPages(blocks: Block[]): Block[][] {
  const pages: Block[][] = [[]];
  for (const b of blocks) {
    if (b.type === "pagebreak") {
      pages.push([]);
    } else {
      pages[pages.length - 1].push(b);
    }
  }
  return pages.filter((p) => p.length);
}

function BlockView({ block }: { block: Block }) {
  switch (block.type) {
    case "h1":
      return <h1 className="text-base font-bold uppercase text-[#00377b] mt-4 mb-2 leading-snug">{renderInline(block.text)}</h1>;
    case "h2":
      return <h2 className="text-sm font-bold text-[#00377b] mt-3 mb-1.5 leading-snug">{renderInline(block.text)}</h2>;
    case "h3":
      return <h3 className="text-sm font-semibold text-foreground mt-2 mb-1 leading-snug">{renderInline(block.text)}</h3>;
    case "p":
      return <p className="text-[11pt] text-foreground leading-relaxed text-justify my-1">{renderInline(block.text)}</p>;
    case "ul":
      return (
        <ul className="my-2 pl-6 space-y-1">
          {block.items.map((it, i) => (
            <li key={i} className="text-[11pt] text-foreground leading-relaxed list-disc">
              {renderInline(it)}
            </li>
          ))}
        </ul>
      );
    case "table":
      return (
        <table className="w-full my-3 border-collapse text-[10pt]">
          <tbody>
            {block.rows.map((row, r) => (
              <tr key={r} className={r === 0 ? "bg-[#D9E2F3] font-semibold" : ""}>
                {row.map((cell, c) => (
                  <td key={c} className="border border-black/70 px-2 py-1 align-top">
                    {renderInline(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      );
    case "image":
      return (
        <div className="my-3 text-center text-xs italic text-muted-foreground border border-dashed border-border rounded py-6">
          [Imagem preservada: {block.id}]
        </div>
      );
    case "spacer":
      return <div className="h-2" />;
    default:
      return null;
  }
}

export default function DocumentPreview({ content, title }: Props) {
  const pages = useMemo(() => splitPages(parseBlocks(content || "")), [content]);

  if (!content?.trim()) {
    return (
      <div className="h-full flex items-center justify-center text-sm text-muted-foreground p-8">
        Nenhum conteúdo para visualizar.
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto bg-muted/40 p-6">
      <div className="flex flex-col items-center gap-6">
        {pages.map((page, idx) => (
          <div
            key={idx}
            className="bg-white shadow-card-hover border border-border relative"
            style={{
              width: "210mm",
              minHeight: "297mm",
              padding: "25mm 18mm",
              boxSizing: "border-box",
              fontFamily: "Calibri, 'Segoe UI', Arial, sans-serif",
              color: "#000",
            }}
          >
            {idx === 0 && title && (
              <div className="text-center mb-4 pb-2 border-b border-[#00377b]/30">
                <p className="text-xs uppercase tracking-wider text-[#00377b] font-semibold">FGH</p>
                <h1 className="text-lg font-bold text-[#00377b] mt-1">{title}</h1>
              </div>
            )}
            {page.map((b, i) => (
              <BlockView key={i} block={b} />
            ))}
            <div className="absolute bottom-3 right-4 text-[9pt] text-muted-foreground">
              Página {idx + 1} de {pages.length}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
