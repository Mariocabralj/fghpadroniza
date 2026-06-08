import { useState } from "react";
import AppLayout from "@/components/AppLayout";
import AdminGuard from "@/components/AdminGuard";
import { Button } from "@/components/ui/button";
import { Plug, CheckCircle2, XCircle, Loader2, Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function AdminSettings() {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<null | { ok: boolean; message: string; elapsedMs?: number; reply?: string }>(null);

  const handleTestGemini = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("test-gemini", { body: {} });
      if (error) throw error;
      setTestResult({ ok: !!data?.ok, message: data?.message || "Sem mensagem", elapsedMs: data?.elapsedMs, reply: data?.reply });
      if (data?.ok) toast.success("Conexão com Gemini OK");
      else toast.error("Falha: " + (data?.message || "erro"));
    } catch (e: any) {
      setTestResult({ ok: false, message: e?.message || "Erro de rede" });
      toast.error(e?.message || "Erro ao testar");
    } finally {
      setTesting(false);
    }
  };

  return (
    <AdminGuard>
      <AppLayout>
        <div className="p-6 max-w-4xl mx-auto space-y-6 animate-fade-in">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Configurações da Administração</h1>
            <p className="text-muted-foreground text-sm">Ferramentas e validações exclusivas do administrador</p>
          </div>

          <div className="bg-card rounded-xl border shadow-card p-6 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Plug className="w-5 h-5 text-primary" />
              <h2 className="font-semibold text-foreground">Conexão com a IA (Google Gemini)</h2>
            </div>
            <p className="text-xs text-muted-foreground">
              Valida se a chave GEMINI_API_KEY está ativa, respondendo e sem erros de cota. Útil antes de iniciar a geração de documentos.
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={handleTestGemini}
              disabled={testing}
              className="gap-2"
            >
              {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plug className="w-4 h-4" />}
              {testing ? "Testando..." : "Testar conexão"}
            </Button>

            {testResult && (
              <div
                className={`flex items-start gap-2 rounded-lg border p-3 text-sm ${
                  testResult.ok
                    ? "border-success/30 bg-success/5 text-foreground"
                    : "border-destructive/30 bg-destructive/5 text-foreground"
                }`}
              >
                {testResult.ok ? (
                  <CheckCircle2 className="w-4 h-4 text-success mt-0.5 shrink-0" />
                ) : (
                  <XCircle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                )}
                <div className="space-y-1">
                  <p className="font-medium">{testResult.ok ? "Conexão OK" : "Falha na conexão"}</p>
                  <p className="text-xs text-muted-foreground">{testResult.message}</p>
                  {testResult.ok && (
                    <p className="text-xs text-muted-foreground">
                      Latência: {testResult.elapsedMs} ms{testResult.reply ? ` · Resposta do modelo: "${testResult.reply}"` : ""}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </AppLayout>
    </AdminGuard>
  );
}
