import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useSearchParams } from "react-router-dom";

export function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(
    searchParams.get("conversation")
  );

  const isIndexPage = location.pathname === "/";

  useEffect(() => {
    const conversationParam = searchParams.get("conversation");
    setCurrentConversationId(conversationParam);
  }, [searchParams]);

  useEffect(() => {
    // Check if user is authenticated
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setIsLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || !session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSelectConversation = (id: string) => {
    if (location.pathname !== "/") {
      navigate("/");
    }
    setSearchParams({ conversation: id });
    setCurrentConversationId(id);
  };

  const handleNewChat = () => {
    if (location.pathname !== "/") {
      navigate("/");
    }
    setSearchParams({});
    setCurrentConversationId(null);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar 
          currentConversationId={isIndexPage ? currentConversationId : undefined}
          onSelectConversation={isIndexPage ? handleSelectConversation : undefined}
          onNewChat={isIndexPage ? handleNewChat : undefined}
        />
        <div className="flex-1 flex flex-col">
          <header className="sticky top-0 z-50 h-14 border-b flex items-center px-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <SidebarTrigger />
            <h1 className="ml-4 font-semibold">Prompt Engineering Suite</h1>
          </header>
          <main className="flex-1 overflow-auto">
            <Outlet context={{ currentConversationId, setCurrentConversationId, handleNewChat }} />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
