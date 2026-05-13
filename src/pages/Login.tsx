import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { FileText, Lock, Mail, User, Briefcase, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const translateAuthError = (msg: string) => {
  if (msg.toLowerCase().includes("password is known to be weak")) {
    return "Senha muito fraca e fácil de adivinhar. Escolha uma senha mais forte com letras, números e caracteres especiais.";
  }
  if (msg.toLowerCase().includes("invalid login credentials")) {
    return "Credenciais inválidas";
  }
  if (msg.toLowerCase().includes("user already registered")) {
    return "Usuário já cadastrado. Faça login ou recupere sua senha.";
  }
  return msg;
};

export default function Login() {
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [sector, setSector] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    if (mode === "login") {
      const { error } = await signIn(email, password);
      setLoading(false);
      if (error) return toast.error(translateAuthError(error));
      navigate("/dashboard");
    } else if (mode === "forgot") {
      if (!email.trim()) {
        setLoading(false);
        return toast.error("Informe seu e-mail cadastrado");
      }
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      setLoading(false);
      if (error) return toast.error(translateAuthError(error.message));
      toast.success("Enviamos um link de recuperação para seu e-mail.");
      setMode("login");
    } else {
      if (!name.trim() || !role.trim() || !sector.trim()) {
        setLoading(false);
        return toast.error("Preencha nome, cargo e setor");
      }
      const { error } = await signUp(email, password, { name, role, sector });
      setLoading(false);
      if (error) return toast.error(translateAuthError(error));
      toast.success("Conta criada! Faça login para continuar.");
      setMode("login");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center gradient-primary p-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary-foreground/10 backdrop-blur-sm flex items-center justify-center mx-auto mb-4 border border-primary-foreground/20">
            <FileText className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-primary-foreground">FGH Padroniza</h1>
          <p className="text-primary-foreground/70 mt-1 text-sm">Assistente de Padronização Documental</p>
          <p className="text-primary-foreground/50 text-xs mt-1">Fundação Gestão Hospitalar Martiniano Fernandes</p>
        </div>

        <div className="bg-card rounded-2xl shadow-xl p-8">
          <h2 className="text-lg font-semibold text-foreground mb-6 text-center">
            {mode === "login" ? "Acesso ao Sistema" : mode === "signup" ? "Criar nova conta" : "Recuperar senha"}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="name">Nome completo</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="name" placeholder="Seu nome" value={name} onChange={(e) => setName(e.target.value)} className="pl-10" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="role">Cargo</Label>
                    <div className="relative">
                      <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input id="role" placeholder="Ex: Enfermeiro" value={role} onChange={(e) => setRole(e.target.value)} className="pl-10" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sector">Setor</Label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input id="sector" placeholder="Ex: UTI" value={sector} onChange={(e) => setSector(e.target.value)} className="pl-10" />
                    </div>
                  </div>
                </div>
              </>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="email" type="email" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10" />
              </div>
            </div>
            {mode !== "forgot" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="pass">Senha</Label>
                  {mode === "login" && (
                    <button
                      type="button"
                      onClick={() => setMode("forgot")}
                      className="text-xs text-primary hover:underline font-medium"
                    >
                      Esqueci minha senha
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="pass" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10" />
                </div>
              </div>
            )}
            <Button type="submit" disabled={loading} className="w-full gradient-primary text-primary-foreground font-semibold h-11">
              {loading ? "Processando..." : mode === "login" ? "Entrar" : mode === "signup" ? "Criar conta" : "Enviar link de recuperação"}
            </Button>
          </form>
          <div className="text-center mt-4">
            {mode === "forgot" ? (
              <button
                type="button"
                onClick={() => setMode("login")}
                className="text-sm text-primary hover:underline font-medium"
              >
                Voltar para o login
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setMode(mode === "login" ? "signup" : "login")}
                className="text-sm text-primary hover:underline font-medium"
              >
                {mode === "login" ? "Novo aqui? Crie sua conta!" : "Já tem conta? Entrar"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
