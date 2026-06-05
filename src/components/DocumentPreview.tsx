import { useEffect, useRef, useState } from "react";
import { renderAsync } from "docx-preview";
import { exportDocx } from "@/lib/docx-export";
import { Loader2 } from "lucide-react";

interface Props {
  content: string;
  title: string;
  elaboracao?: string;
  images?: Record<string, string>;
  imageTypes?: Record<string, string>;
}

export default function DocumentPreview({ content, title, elaboracao, images, imageTypes }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const render = async () => {
      if (!content?.trim() || !containerRef.current) return;
      setLoading(true);
      setError(null);
      try {
        const blob = await exportDocx(title || "Documento", content, elaboracao || "[A PREENCHER]", {
          images: images || {},
          imageTypes: imageTypes || {},
        });
        if (cancelled || !containerRef.current) return;
        containerRef.current.innerHTML = "";
        await renderAsync(blob, containerRef.current, undefined, {
          className: "fgh-docx",
          inWrapper: true,
          ignoreWidth: false,
          ignoreHeight: false,
          ignoreFonts: false,
          breakPages: true,
          experimental: true,
          useBase64URL: true,
          renderHeaders: true,
          renderFooters: true,
          renderFootnotes: true,
        });
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Falha ao renderizar pré-visualização.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    // debounce para edições rápidas
    const t = setTimeout(render, 350);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [content, title, elaboracao, images, imageTypes]);

  if (!content?.trim()) {
    return (
      <div className="h-full flex items-center justify-center text-sm text-muted-foreground p-8">
        Nenhum conteúdo para visualizar.
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto bg-muted/40 relative">
      {loading && (
        <div className="absolute top-3 right-3 z-10 flex items-center gap-2 bg-card border rounded-md px-3 py-1.5 shadow-sm text-xs text-muted-foreground">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Renderizando...
        </div>
      )}
      {error && (
        <div className="m-4 p-3 rounded-md bg-destructive/10 text-destructive text-sm border border-destructive/30">
          {error}
        </div>
      )}
      <div ref={containerRef} className="docx-preview-host py-6 flex justify-center" />
      <style>{`
        .docx-preview-host .docx-wrapper { background: transparent !important; padding: 0 !important; }
        .docx-preview-host .docx-wrapper > section.docx {
          margin: 0 auto 24px auto !important;
          box-shadow: 0 4px 24px rgba(0,55,123,0.15);
          background: #fff;
        }
      `}</style>
    </div>
  );
}
