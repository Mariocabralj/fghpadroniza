import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { ConflictItem } from "./ConflictDialog";

interface ExistingRule { id: string; content: string }

export function useConflictCheck() {
  const [open, setOpen] = useState(false);
  const [conflicts, setConflicts] = useState<ConflictItem[]>([]);
  const [pendingContent, setPendingContent] = useState("");
  const [checking, setChecking] = useState(false);
  const [resolver, setResolver] = useState<((a: "overwrite" | "exception" | "cancel") => void) | null>(null);

  const check = async (kind: string, content: string, existing: ExistingRule[]) => {
    setChecking(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-detect-conflict", {
        body: { kind, content, existing },
      });
      if (error) return { hasConflict: false, conflicts: [] };
      const raw = data?.conflicts || [];
      const enriched: ConflictItem[] = raw.map((c: any) => ({
        id: c.id,
        reason: c.reason,
        existingPreview: existing.find((e) => e.id === c.id)?.content,
      }));
      return { hasConflict: !!data?.hasConflict && enriched.length > 0, conflicts: enriched };
    } finally {
      setChecking(false);
    }
  };

  const askUserResolution = (content: string, conflicts: ConflictItem[]) => {
    return new Promise<"overwrite" | "exception" | "cancel">((resolve) => {
      setPendingContent(content);
      setConflicts(conflicts);
      setOpen(true);
      setResolver(() => (a: "overwrite" | "exception" | "cancel") => {
        setOpen(false);
        resolve(a);
      });
    });
  };

  const dialogProps = {
    open,
    conflicts,
    newContent: pendingContent,
    onChoose: (a: "overwrite" | "exception" | "cancel") => resolver?.(a),
  };

  return { check, askUserResolution, dialogProps, checking };
}
