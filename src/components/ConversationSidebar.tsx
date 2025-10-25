import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, MessageSquare, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

interface ConversationSidebarProps {
  currentConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
}

export const ConversationSidebar = ({
  currentConversationId,
  onSelectConversation,
  onNewChat,
}: ConversationSidebarProps) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("conversations")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Error loading conversations:", error);
    } else {
      setConversations(data || []);
    }
  };

  // Refresh conversations when current conversation changes
  useEffect(() => {
    if (currentConversationId) {
      loadConversations();
    }
  }, [currentConversationId]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    const { error } = await supabase
      .from("conversations")
      .delete()
      .eq("id", id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete conversation",
        variant: "destructive",
      });
    } else {
      setConversations(conversations.filter(c => c.id !== id));
      if (currentConversationId === id) {
        onNewChat();
      }
      toast({
        title: "Deleted",
        description: "Conversation deleted successfully",
      });
    }
  };

  return (
    <div className="w-64 border-r border-border bg-card flex flex-col h-full">
      <div className="p-4 border-b border-border">
        <Button
          onClick={onNewChat}
          className="w-full"
          variant="default"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Chat
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {conversations.map((conversation) => (
            <div
              key={conversation.id}
              className={`group relative flex items-center gap-2 p-3 rounded-lg cursor-pointer transition-colors ${
                currentConversationId === conversation.id
                  ? "bg-primary/10 text-primary"
                  : "hover:bg-secondary"
              }`}
              onClick={() => onSelectConversation(conversation.id)}
            >
              <MessageSquare className="w-4 h-4 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {conversation.title || "Untitled"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(conversation.updated_at), { addSuffix: true })}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 h-8 w-8"
                onClick={(e) => handleDelete(conversation.id, e)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};
