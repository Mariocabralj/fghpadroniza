import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const started = Date.now();
  try {
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ ok: false, status: "missing_key", message: "GEMINI_API_KEY não está configurada nas Secrets." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const resp = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${GEMINI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gemini-2.5-flash",
        messages: [
          { role: "system", content: "Responda apenas com a palavra OK." },
          { role: "user", content: "ping" },
        ],
        max_tokens: 5,
      }),
    });

    const elapsed = Date.now() - started;
    const text = await resp.text();
    let parsed: any = null;
    try { parsed = JSON.parse(text); } catch { /* ignore */ }

    if (!resp.ok) {
      let status: string = "error";
      if (resp.status === 401 || resp.status === 403) status = "invalid_key";
      else if (resp.status === 429) status = "quota_exceeded";
      return new Response(
        JSON.stringify({
          ok: false,
          status,
          httpStatus: resp.status,
          message: parsed?.error?.message || text || `Erro HTTP ${resp.status}`,
          elapsedMs: elapsed,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const reply = parsed?.choices?.[0]?.message?.content || "";
    return new Response(
      JSON.stringify({
        ok: true,
        status: "success",
        model: "gemini-2.5-flash",
        reply: reply.trim(),
        elapsedMs: elapsed,
        message: "Conexão validada com sucesso. A GEMINI_API_KEY está ativa e respondendo sem erros de cota.",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    return new Response(
      JSON.stringify({ ok: false, status: "error", message: e?.message || "Falha desconhecida" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
