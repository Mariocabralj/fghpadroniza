import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { User, Bell, DollarSign, Info, Plug, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function Settings() {
  const { user, refreshProfile } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [role, setRole] = useState(user?.role || "");
  const [sector, setSector] = useState(user?.sector || "");
  const [salary, setSalary] = useState<string>("");
  const [saving, setSaving] = useState(false);
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

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("salary, salary_opt_out")
        .eq("user_id", user.user_id)
        .maybeSingle();
      // Se o usuário pediu "prefiro não dizer", mantemos o campo limpo
      // mesmo se um admin tiver preenchido o salário internamente.
      if (data?.salary_opt_out) setSalary("");
      else if (data?.salary != null) setSalary(String(data.salary));
      else setSalary("");
    })();
  }, [user?.user_id]);

  if (!user) return <Navigate to="/" />;

  const handleSave = async () => {
    setSaving(true);
    const salaryNum = salary.trim() === "" ? null : Number(salary.replace(",", "."));
    if (salaryNum !== null && (isNaN(salaryNum) || salaryNum < 0)) {
      setSaving(false);
      return toast.error("Salário inválido");
    }
    const updates: any = { name, role, sector, salary: salaryNum };
    // Se o usuário digitou um salário, deixa de ser "prefiro não dizer"
    if (salaryNum !== null) updates.salary_opt_out = false;
    const { error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("user_id", user.user_id);
    setSaving(false);
    if (error) return toast.error(error.message);
    await refreshProfile();
    toast.success("Dados atualizados");
  };

  return (
    <AppLayout>
      <div className="p-6 max-w-3xl mx-auto space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
          <p className="text-muted-foreground text-sm">Gerencie suas preferências</p>
        </div>

        <div className="bg-card rounded-xl border shadow-card p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <User className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-foreground">Dados Pessoais</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Nome</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div className="space-y-2"><Label>Cargo</Label><Input value={role} onChange={(e) => setRole(e.target.value)} /></div>
            <div className="space-y-2"><Label>Email</Label><Input value={user.email} disabled /></div>
            <div className="space-y-2"><Label>Setor</Label><Input value={sector} onChange={(e) => setSector(e.target.value)} /></div>
            <div className="space-y-2 md:col-span-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="salary">Salário Base Mensal (opcional)</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button type="button" className="text-muted-foreground hover:text-foreground" aria-label="Por que pedimos isso?">
                        <Info className="w-3.5 h-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs text-xs">
                      Usamos essa informação de forma confidencial para calcular o retorno financeiro das horas economizadas no hospital.
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="salary"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Ex: 4500"
                  value={salary}
                  onChange={(e) => setSalary(e.target.value)}
                  className="pl-10"
                />
              </div>
              <p className="text-xs text-muted-foreground">Deixe em branco se preferir não informar.</p>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl border shadow-card p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Bell className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-foreground">Preferências do Sistema</h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div><p className="text-sm font-medium text-foreground">Notificações</p><p className="text-xs text-muted-foreground">Receber alertas sobre documentos</p></div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div><p className="text-sm font-medium text-foreground">Idioma</p><p className="text-xs text-muted-foreground">Idioma da interface</p></div>
              <Select defaultValue="pt"><SelectTrigger className="w-40"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="pt">Português</SelectItem><SelectItem value="en">English</SelectItem></SelectContent></Select>
            </div>
          </div>
        </div>

        <Button onClick={handleSave} disabled={saving} className="gradient-primary text-primary-foreground font-semibold w-full h-11">
          {saving ? "Salvando..." : "Salvar Alterações"}
        </Button>
      </div>
    </AppLayout>
  );
}
