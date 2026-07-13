import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GROQ_MODEL = "llama-3.3-70b-versatile";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const started = Date.now();
  try {
    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
    if (!GROQ_API_KEY) {
      return new Response(
        JSON.stringify({ ok: false, status: "missing_key", message: "GROQ_API_KEY não está configurada nas Secrets." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${GROQ_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: GROQ_MODEL,
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
        model: GROQ_MODEL,
        reply: reply.trim(),
        elapsedMs: elapsed,
        message: "Conexão validada com sucesso. A GROQ_API_KEY está ativa e respondendo sem erros de cota.",
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
