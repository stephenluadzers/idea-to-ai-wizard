import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "@/components/Layout";
import Index from "./pages/Index";
import Library from "./pages/Library";
import Templates from "./pages/Templates";
import Knowledge from "./pages/Knowledge";
import Workflows from "./pages/Workflows";
import Sandbox from "./pages/Sandbox";
import Analytics from "./pages/Analytics";
import Auth from "./pages/Auth";
import History from "./pages/History";
import MasterPrompts from "./pages/MasterPrompts";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route element={<Layout />}>
            <Route path="/" element={<Index />} />
            <Route path="/library" element={<Library />} />
            <Route path="/templates" element={<Templates />} />
            <Route path="/knowledge" element={<Knowledge />} />
            <Route path="/workflows" element={<Workflows />} />
            <Route path="/sandbox" element={<Sandbox />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/history" element={<History />} />
            <Route path="/master-prompts" element={<MasterPrompts />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
