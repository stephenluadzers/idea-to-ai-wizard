import { ChatInterface } from "@/components/ChatInterface";
import { SubscriptionBanner } from "@/components/SubscriptionBanner";
import { Brain } from "lucide-react";
import { useOutletContext } from "react-router-dom";

interface OutletContext {
  currentConversationId: string | null;
  setCurrentConversationId: (id: string | null) => void;
  handleNewChat: () => void;
}

const Index = () => {
  const { currentConversationId, setCurrentConversationId, handleNewChat } = useOutletContext<OutletContext>();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-hero border-b border-border/50">
        <div className="absolute inset-0 bg-background/10 backdrop-blur-sm"></div>
        <div className="relative max-w-7xl mx-auto px-6 py-8 text-center">
          <div className="inline-flex items-center gap-3 mb-4">
            <Brain className="w-10 h-10 text-primary-foreground" />
            <h1 className="text-3xl md:text-4xl font-bold text-primary-foreground">
              AI Assistant Designer
            </h1>
          </div>
          <p className="text-lg text-primary-foreground/80 max-w-2xl mx-auto">
            Chat with me to create comprehensive, structured AI assistant prompts using the "Thinker Doer" methodology.
          </p>
          
          {/* Subscription Banner */}
          <div className="mt-6 max-w-2xl mx-auto">
            <SubscriptionBanner />
          </div>
        </div>
      </div>

      {/* Chat Interface */}
      <div className="flex-1 flex flex-col">
        <ChatInterface 
          currentConversationId={currentConversationId}
          onConversationCreated={setCurrentConversationId}
          onNewChat={handleNewChat}
        />
      </div>
    </div>
  );
};

export default Index;