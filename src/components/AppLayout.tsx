import { ReactNode } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { useAuth } from "@/contexts/AuthContext";
import logoFgh from "@/assets/logo-fgh-padroniza.png";

export default function AppLayout({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-16 flex items-center justify-between border-b bg-card px-4 shrink-0">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center shrink-0">
                  <img src={logoFgh} alt="FGH Padroniza" className="w-full h-full object-cover" />
                </div>
                <div className="hidden sm:block">
                  <h1 className="text-sm font-bold text-foreground leading-tight">FGH Padroniza</h1>
                  <p className="text-xs text-muted-foreground leading-tight">Assistente de Padronização Documental</p>
                </div>
              </div>
            </div>
            {user && (
              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-medium text-foreground">{user.name}</p>
                  <p className="text-xs text-muted-foreground">{user.role}</p>
                </div>
                <div className="w-9 h-9 rounded-full gradient-primary flex items-center justify-center text-sm font-semibold text-primary-foreground">
                  {user.initials}
                </div>
              </div>
            )}
          </header>
          <main className="flex-1 overflow-auto">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
