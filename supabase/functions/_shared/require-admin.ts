import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

/**
 * Valida o token Bearer e confirma que o usuário é admin via public.has_role.
 * Retorna null quando autorizado, ou uma Response 403 quando não.
 */
export async function requireAdmin(req: Request, corsHeaders: Record<string, string>): Promise<Response | null> {
  const deny = () =>
    new Response(JSON.stringify({ error: "Acesso restrito a administradores." }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (!token) return deny();

  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  const { data: userData, error } = await admin.auth.getUser(token);
  if (error || !userData?.user) return deny();

  const { data: isAdmin, error: roleError } = await admin.rpc("has_role", {
    _user_id: userData.user.id,
    _role: "admin",
  });
  if (roleError || !isAdmin) return deny();

  return null;
}
