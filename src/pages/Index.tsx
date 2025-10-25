import { useState, useEffect } from "react";
import { ChatInterface } from "@/components/ChatInterface";
import { ConversationSidebar } from "@/components/ConversationSidebar";
import { Brain } from "lucide-react";
import { useSearchParams } from "react-router-dom";

const Index = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(
    searchParams.get("conversation")
  );

  useEffect(() => {
    const conversationParam = searchParams.get("conversation");
    setCurrentConversationId(conversationParam);
  }, [searchParams]);

  const handleSelectConversation = (id: string) => {
    setSearchParams({ conversation: id });
    setCurrentConversationId(id);
  };

  const handleNewChat = () => {
    setSearchParams({});
    setCurrentConversationId(null);
  };

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
        </div>
      </div>

      {/* Chat Interface with Sidebar */}
      <div className="flex-1 flex">
        <ConversationSidebar
          currentConversationId={currentConversationId}
          onSelectConversation={handleSelectConversation}
          onNewChat={handleNewChat}
        />
        <div className="flex-1 flex flex-col">
          <ChatInterface 
            currentConversationId={currentConversationId}
            onConversationCreated={setCurrentConversationId}
            onNewChat={handleNewChat}
          />
        </div>
      </div>
    </div>
  );
};

export default Index;