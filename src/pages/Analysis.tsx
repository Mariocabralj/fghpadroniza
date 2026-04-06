import { useEffect, useState } from "react";
import { Navigate, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { CheckCircle2, Loader2 } from "lucide-react";

const steps = [
  "Identificando estrutura",
  "Organizando conteúdo",
  "Aplicando formatação FGH",
  "Validando requisitos",
];

export default function Analysis() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev >= steps.length - 1) {
          clearInterval(interval);
          setTimeout(() => navigate("/workspace", { state: location.state }), 800);
          return prev;
        }
        return prev + 1;
      });
    }, 1200);
    return () => clearInterval(interval);
  }, [navigate, location.state]);

  if (!user) return <Navigate to="/" />;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full text-center animate-fade-in space-y-8">
        <div className="w-20 h-20 rounded-full gradient-primary flex items-center justify-center mx-auto animate-pulse-soft">
          <Loader2 className="w-10 h-10 text-primary-foreground animate-spin" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Analisando e padronizando</h1>
          <p className="text-muted-foreground mt-1">seu documento...</p>
        </div>
        <div className="bg-card rounded-xl border p-6 text-left space-y-3">
          {steps.map((step, i) => (
            <div key={i} className="flex items-center gap-3">
              {i <= currentStep ? (
                <CheckCircle2 className="w-5 h-5 text-success shrink-0" />
              ) : (
                <div className="w-5 h-5 rounded-full border-2 border-border shrink-0" />
              )}
              <span className={`text-sm ${i <= currentStep ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                {step}
              </span>
            </div>
          ))}
        </div>
        <div className="w-full bg-muted rounded-full h-2">
          <div
            className="h-2 rounded-full gradient-primary transition-all duration-500"
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
