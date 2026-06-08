import AppLayout from "@/components/AppLayout";
import AdminGuard from "@/components/AdminGuard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Brain, MessageSquare, Terminal, Camera, GraduationCap } from "lucide-react";
import ChatPanel from "@/components/admin/ai-training/ChatPanel";
import SystemPromptPanel from "@/components/admin/ai-training/SystemPromptPanel";
import SnapshotsPanel from "@/components/admin/ai-training/SnapshotsPanel";
import FewShotPanel from "@/components/admin/ai-training/FewShotPanel";

export default function AITraining() {
  return (
    <AdminGuard>
      <AppLayout>
        <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-in">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Brain className="w-6 h-6 text-primary" /> Governança da IA
            </h1>
            <p className="text-muted-foreground text-sm font-mono">
              Auditoria, versionamento e controle de aprendizado do motor Gemini
            </p>
          </div>

          <Tabs defaultValue="chat" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
              <TabsTrigger value="chat" className="gap-2"><MessageSquare className="w-4 h-4" /> Chat & Diretrizes</TabsTrigger>
              <TabsTrigger value="system" className="gap-2"><Terminal className="w-4 h-4" /> System Prompt</TabsTrigger>
              <TabsTrigger value="snapshots" className="gap-2"><Camera className="w-4 h-4" /> Snapshots</TabsTrigger>
              <TabsTrigger value="fewshot" className="gap-2"><GraduationCap className="w-4 h-4" /> Few-Shot</TabsTrigger>
            </TabsList>
            <TabsContent value="chat"><ChatPanel /></TabsContent>
            <TabsContent value="system"><SystemPromptPanel /></TabsContent>
            <TabsContent value="snapshots"><SnapshotsPanel /></TabsContent>
            <TabsContent value="fewshot"><FewShotPanel /></TabsContent>
          </Tabs>
        </div>
      </AppLayout>
    </AdminGuard>
  );
}
