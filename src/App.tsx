import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import NewDocument from "./pages/NewDocument";
import Analysis from "./pages/Analysis";
import Workspace from "./pages/Workspace";
import Templates from "./pages/Templates";
import History from "./pages/History";
import Settings from "./pages/Settings";
import About from "./pages/About";
import NotFound from "./pages/NotFound";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AITraining from "./pages/admin/AITraining";
import UserManagement from "./pages/admin/UserManagement";
import SystemLogs from "./pages/admin/SystemLogs";
import { AuthProvider } from "./contexts/AuthContext";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/novo-documento" element={<NewDocument />} />
            <Route path="/analise" element={<Analysis />} />
            <Route path="/workspace" element={<Workspace />} />
            <Route path="/biblioteca" element={<Templates />} />
            <Route path="/historico" element={<History />} />
            <Route path="/configuracoes" element={<Settings />} />
            <Route path="/sobre" element={<About />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/treinamento" element={<AITraining />} />
            <Route path="/admin/usuarios" element={<UserManagement />} />
            <Route path="/admin/logs" element={<SystemLogs />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
