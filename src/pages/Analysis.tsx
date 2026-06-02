import { useEffect, useState, useRef } from "react";
import { Navigate, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { streamProcessDocument } from "@/lib/ai-service";
import { extractDocumentFromFile } from "@/lib/file-extractors";
import { logSystemError } from "@/lib/system-log";
import { Button } from "@/components/ui/button";

const steps = [
  "Identificando estrutura do conteúdo",
  "Processando com IA especialista",
  "Aplicando formatação Norma Zero FGH",
  "Validando requisitos e conformidade",
];

export default function Analysis() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as any;
  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState("");
  const resultRef = useRef("");
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current || !state) return;
    startedRef.current = true;

    const processDocument = async () => {
      let content = "";
      let images: Record<string, string> = {};
      let imageTypes: Record<string, string> = {};
      let mode: "upload" | "upload-improve" | "upload-format" | "paste" | "idea" = "idea";

      if (state.file) {
        try {
          const extracted = await extractDocumentFromFile(state.file);
          content = extracted.text;
          images = extracted.images;
          imageTypes = extracted.imageTypes;
          mode = state.aiMode || "upload";
          if (!content.trim()) {
            await logSystemError("file-extractor", "Arquivo sem texto extraível", { name: state.file?.name, type: state.file?.type, size: state.file?.size }, user?.user_id);
            setError(
              "Não foi possível extrair texto do arquivo. Verifique se o documento não é apenas uma imagem digitalizada."
            );
            return;
          }
        } catch (e: any) {
          console.error("Erro ao extrair texto:", e);
          await logSystemError("file-extractor", `Erro ao ler arquivo: ${e?.message || e}`, { name: state.file?.name, type: state.file?.type }, user?.user_id);
          setError("Erro ao ler o arquivo enviado. Tente outro formato (.pdf, .docx ou .txt).");
          return;
        }
      } else if (state.pastedText) {
        content = state.pastedText;
        mode = "paste";
      } else if (state.ideaText) {
        content = state.ideaText;
        mode = "idea";
      } else {
        content = state.title || "Documento sem conteúdo";
        mode = "idea";
      }

      setCurrentStep(0);
      const stepTimer = setInterval(() => {
        setCurrentStep((prev) => Math.min(prev + 1, steps.length - 2));
      }, 2000);

      const hasImages = Object.keys(images).length > 0;

      streamProcessDocument(
        {
          content,
          docType: state.docType || "POP",
          title: state.title || "",
          sector: state.sector || "",
          mode,
          hasImages,
          userId: user?.user_id,
        },
        (delta) => {
          resultRef.current += delta;
        },
        () => {
          clearInterval(stepTimer);
          setCurrentStep(steps.length - 1);
          setTimeout(() => {
            // imagens vão por sessionStorage (location.state não serializa bem dados grandes)
            try {
              sessionStorage.setItem("fgh:lastImages", JSON.stringify({ images, imageTypes }));
            } catch { /* quota */ }
            navigate("/workspace", {
              state: {
                ...state,
                standardizedText: resultRef.current,
                hasImages,
              },
            });
          }, 800);
        },
        (err) => {
          clearInterval(stepTimer);
          setError(err);
        }
      );
    };

    processDocument();
  }, [state, navigate]);

  if (!user) return <Navigate to="/" />;

  if (!state) return <Navigate to="/novo-documento" />;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full text-center animate-fade-in space-y-8">
        {error ? (
          <>
            <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
              <AlertCircle className="w-10 h-10 text-destructive" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Erro no processamento</h1>
              <p className="text-muted-foreground mt-2">{error}</p>
            </div>
            <Button onClick={() => navigate("/novo-documento")} className="gap-2">
              Tentar novamente
            </Button>
          </>
        ) : (
          <>
            <div className="w-20 h-20 rounded-full gradient-primary flex items-center justify-center mx-auto animate-pulse-soft">
              <Loader2 className="w-10 h-10 text-primary-foreground animate-spin" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Analisando e padronizando</h1>
              <p className="text-muted-foreground mt-1">seu documento com IA...</p>
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
          </>
        )}
      </div>
    </div>
  );
}
