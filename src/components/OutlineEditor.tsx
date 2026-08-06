import { useMemo } from "react";
import { Trash2, ChevronUp, ChevronDown, IndentIncrease, IndentDecrease, Plus, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { computeNumbers, makeBlock, OutlineBlock } from "@/lib/doc-outline";

interface Props {
  blocks: OutlineBlock[];
  onChange: (blocks: OutlineBlock[]) => void;
}

export default function OutlineEditor({ blocks, onChange }: Props) {
  const numbers = useMemo(() => computeNumbers(blocks), [blocks]);

  const update = (id: string, patch: Partial<OutlineBlock>) =>
    onChange(blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)));

  const remove = (id: string) => onChange(blocks.filter((b) => b.id !== id));

  const move = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= blocks.length) return;
    const copy = [...blocks];
    [copy[index], copy[target]] = [copy[target], copy[index]];
    onChange(copy);
  };

  const indent = (index: number, delta: -1 | 1) => {
    const b = blocks[index];
    const level = Math.min(3, Math.max(1, b.level + delta)) as 1 | 2 | 3;
    update(b.id, { level });
  };

  const insertBelow = (index: number) => {
    const copy = [...blocks];
    copy.splice(index + 1, 0, makeBlock({ level: blocks[index]?.level ?? 1, kind: "heading" }));
    onChange(copy);
  };

  if (blocks.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <Button variant="outline" size="sm" onClick={() => onChange([makeBlock()])} className="gap-2">
          <Plus className="w-4 h-4" /> Adicionar primeiro tópico
        </Button>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 overflow-auto p-3 space-y-1.5">
      {blocks.map((b, i) => (
        <div
          key={b.id}
          className="group flex items-start gap-2 rounded-md hover:bg-muted/50 px-1 py-1"
          style={{ marginLeft: `${(b.level - 1) * 18}px` }}
        >
          <span className="mt-2 min-w-[3rem] shrink-0 text-xs font-semibold tabular-nums text-primary select-none">
            {b.kind === "heading" ? `${numbers[i]}.` : b.kind === "image" ? <ImageIcon className="w-3.5 h-3.5" /> : ""}
          </span>

          {b.kind === "image" ? (
            <span className="flex-1 mt-1.5 text-xs font-mono text-muted-foreground">{b.text}</span>
          ) : (
            <Textarea
              value={b.text}
              onChange={(e) => update(b.id, { text: e.target.value })}
              rows={1}
              className={`flex-1 min-h-[36px] resize-none text-sm ${b.kind === "heading" ? "font-semibold" : ""}`}
              placeholder={b.kind === "heading" ? "Título do tópico" : "Texto"}
            />
          )}

          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="icon" className="h-7 w-7" title="Subir" onClick={() => move(i, -1)}>
              <ChevronUp className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" title="Descer" onClick={() => move(i, 1)}>
              <ChevronDown className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" title="Diminuir nível" onClick={() => indent(i, -1)} disabled={b.kind !== "heading" || b.level === 1}>
              <IndentDecrease className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" title="Aumentar nível" onClick={() => indent(i, 1)} disabled={b.kind !== "heading" || b.level === 3}>
              <IndentIncrease className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" title="Inserir abaixo" onClick={() => insertBelow(i)}>
              <Plus className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" title="Excluir" onClick={() => remove(b.id)} disabled={b.kind === "image"}>
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
