import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM = `Você é um auditor de governança de IA do FGH Padroniza. Sua única tarefa é detectar CONFLITOS LÓGICOS entre uma NOVA regra/instrução e regras já existentes.

Considere conflito quando:
- Duas regras dão instruções contraditórias sobre o mesmo tópico (ex.: "sempre usar voz ativa" vs "preferir voz passiva").
- Uma regra invalida ou contradiz parte de outra (escopo, obrigatoriedade, formato).
- Há sobreposição com instrução incompatível (mesmo tema, regra divergente).

NÃO considere conflito:
- Regras complementares sobre temas diferentes.
- Regras mais específicas que detalham regras gerais sem contradizê-las.

Responda EXCLUSIVAMENTE em JSON válido no formato:
{"hasConflict": boolean, "conflicts": [{"id": "string-do-existente", "reason": "explicação curta em pt-BR"}]}`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not configured");

    const { kind, content, existing } = await req.json();
    if (!kind || !content) {
      return new Response(JSON.stringify({ error: "kind and content required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const user = `TIPO DA NOVA REGRA: ${kind}\n\nNOVA REGRA:\n"""\n${content}\n"""\n\nREGRAS EXISTENTES (cada uma com id):\n${JSON.stringify(existing || [], null, 2)}`;

    const resp = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${GEMINI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gemini-2.5-flash-lite",
        messages: [{ role: "system", content: SYSTEM }, { role: "user", content: user }],
        response_format: { type: "json_object" },
      }),
    });

    if (!resp.ok) {
      const t = await resp.text();
      return new Response(JSON.stringify({ error: t }), {
        status: resp.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const raw = data?.choices?.[0]?.message?.content || '{"hasConflict":false,"conflicts":[]}';
    let parsed: any = { hasConflict: false, conflicts: [] };
    try { parsed = JSON.parse(raw); } catch { /* fallback */ }
    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
