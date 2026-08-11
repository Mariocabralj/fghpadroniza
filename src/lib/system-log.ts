import { supabase } from "@/integrations/supabase/client";

export async function logSystemError(source: string, message: string, metadata?: any, userId?: string | null) {
  try {
    await supabase.functions.invoke("log-client-error", {
      body: {
        source,
        message,
        metadata: metadata ?? null,
        userId: userId ?? null,
      },
    });
  } catch (_) {
    // ignore
  }
}
