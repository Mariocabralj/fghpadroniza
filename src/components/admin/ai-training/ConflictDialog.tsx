import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
} from "@/components/ui/alert-dialog";

export interface ConflictItem {
  id: string;
  reason: string;
  existingPreview?: string;
}

interface Props {
  open: boolean;
  conflicts: ConflictItem[];
  newContent: string;
  onChoose: (action: "overwrite" | "exception" | "cancel") => void;
}

export default function ConflictDialog({ open, conflicts, newContent, onChoose }: Props) {
  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && onChoose("cancel")}>
      <AlertDialogContent className="max-w-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-warning">
            <AlertTriangle className="w-5 h-5" /> Conflito Lógico Detectado
          </AlertDialogTitle>
          <AlertDialogDescription>
            A nova regra parece entrar em conflito com {conflicts.length} regra(s) existente(s).
            Escolha como proceder.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-3 max-h-[40vh] overflow-y-auto font-mono text-xs">
          <div className="rounded border border-primary/30 bg-primary/5 p-3">
            <div className="text-[10px] uppercase tracking-wider text-primary mb-1">Nova regra</div>
            <div className="whitespace-pre-wrap">{newContent}</div>
          </div>
          {conflicts.map((c, i) => (
            <div key={i} className="rounded border border-warning/40 bg-warning/5 p-3">
              <div className="text-[10px] uppercase tracking-wider text-warning mb-1">
                Conflito com #{c.id}
              </div>
              {c.existingPreview && (
                <div className="whitespace-pre-wrap text-muted-foreground mb-2 line-clamp-3">
                  {c.existingPreview}
                </div>
              )}
              <div className="text-foreground">{c.reason}</div>
            </div>
          ))}
        </div>

        <AlertDialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onChoose("cancel")}>
            Cancelar
          </Button>
          <Button variant="secondary" onClick={() => onChoose("exception")}>
            Criar exceção
          </Button>
          <Button variant="destructive" onClick={() => onChoose("overwrite")}>
            Sobrescrever
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
