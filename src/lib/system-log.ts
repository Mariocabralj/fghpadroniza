import { supabase } from "@/integrations/supabase/client";

export async function logSystemError(source: string, message: string, metadata?: any) {
  try {
    await supabase.from("system_logs").insert({
      level: "error",
      source,
      message,
      metadata: metadata ?? null,
    });
  } catch (_) {
    // ignore
  }
}
