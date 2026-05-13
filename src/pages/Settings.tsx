import { useState } from "react";
import { Navigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User, Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function Settings() {
  const { user, refreshProfile } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [role, setRole] = useState(user?.role || "");
  const [sector, setSector] = useState(user?.sector || "");
  const [saving, setSaving] = useState(false);

  if (!user) return <Navigate to="/" />;

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ name, role, sector })
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
