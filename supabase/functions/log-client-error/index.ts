const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    if (req.method !== "POST") return json({ error: "Método não permitido." }, 405);

    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
    if (!token) return json({ error: "Autenticação obrigatória." }, 401);

    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

    const { data: userData, error: authError } = await admin.auth.getUser(token);
    if (authError || !userData?.user) return json({ error: "Autenticação obrigatória." }, 401);

    const body = await req.json().catch(() => ({}));
    const source = typeof body?.source === "string" ? body.source.slice(0, 120) : "";
    const message = typeof body?.message === "string" ? body.message.slice(0, 4000) : "";
    if (!source || !message) return json({ error: "source e message são obrigatórios." }, 400);

    const metadata = body?.metadata ?? null;
    // Só aceitamos o userId informado se for o próprio usuário autenticado
    const userId =
      typeof body?.userId === "string" && body.userId === userData.user.id
        ? body.userId
        : userData.user.id;

    const { error } = await admin.from("system_logs").insert({
      level: "error",
      source,
      message,
      metadata,
      user_id: userId,
    });
    if (error) return json({ error: error.message }, 500);

    return json({ ok: true });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Erro desconhecido" }, 500);
  }
});
