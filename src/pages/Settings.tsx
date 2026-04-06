import { Navigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User, Bell, FileText } from "lucide-react";

export default function Settings() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/" />;

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
            <div className="space-y-2"><Label>Nome</Label><Input defaultValue={user.name} /></div>
            <div className="space-y-2"><Label>Cargo</Label><Input defaultValue={user.role} /></div>
            <div className="space-y-2"><Label>Email</Label><Input defaultValue={user.email} /></div>
            <div className="space-y-2"><Label>Setor</Label><Input defaultValue={user.sector} /></div>
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

        <div className="bg-card rounded-xl border shadow-card p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-foreground">Padrões de Documentos</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Modelo padrão</Label>
              <Select defaultValue="pop"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="pop">POP Padrão</SelectItem><SelectItem value="it">Instrução de Trabalho</SelectItem><SelectItem value="proto">Protocolo</SelectItem></SelectContent></Select>
            </div>
            <div className="space-y-2">
              <Label>Prazo de revisão</Label>
              <Select defaultValue="12"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="6">6 meses</SelectItem><SelectItem value="12">12 meses</SelectItem><SelectItem value="24">24 meses</SelectItem></SelectContent></Select>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div><p className="text-sm font-medium text-foreground">Numeração automática</p><p className="text-xs text-muted-foreground">Gerar código automaticamente</p></div>
            <Switch defaultChecked />
          </div>
        </div>

        <Button className="gradient-primary text-primary-foreground font-semibold w-full h-11">Salvar Alterações</Button>
      </div>
    </AppLayout>
  );
}
