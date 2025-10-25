import { NavLink } from "react-router-dom";
import { useState, useEffect } from "react";
import { 
  BookOpen, 
  Library, 
  LayoutTemplate, 
  BarChart3, 
  Database, 
  GitBranch, 
  TestTube, 
  Sparkles,
  MessageSquare,
  Plus,
  Trash2
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { UserMenu } from "./UserMenu";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

const navItems = [
  { title: "Master Prompts", url: "/master-prompts", icon: BookOpen },
  { title: "Library", url: "/library", icon: Library },
  { title: "Chat History", url: "/history", icon: MessageSquare },
  { title: "Templates", url: "/templates", icon: LayoutTemplate },
  { title: "Knowledge Base", url: "/knowledge", icon: Database },
  { title: "Workflows", url: "/workflows", icon: GitBranch },
  { title: "Testing Sandbox", url: "/sandbox", icon: TestTube },
  { title: "Analytics", url: "/analytics", icon: BarChart3 },
];

interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

interface AppSidebarProps {
  currentConversationId?: string | null;
  onSelectConversation?: (id: string) => void;
  onNewChat?: () => void;
}

export function AppSidebar({ 
  currentConversationId, 
  onSelectConversation, 
  onNewChat 
}: AppSidebarProps) {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (onSelectConversation) {
      loadConversations();
    }
  }, [onSelectConversation]);

  useEffect(() => {
    if (currentConversationId && onSelectConversation) {
      loadConversations();
    }
  }, [currentConversationId]);

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
      if (currentConversationId === id && onNewChat) {
        onNewChat();
      }
      toast({
        title: "Deleted",
        description: "Conversation deleted successfully",
      });
    }
  };

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarContent>
        {onNewChat && onSelectConversation && (
          <SidebarGroup>
            <div className="p-3">
              <Button
                onClick={onNewChat}
                className="w-full"
                variant="default"
                size={isCollapsed ? "icon" : "default"}
              >
                <Plus className="h-4 w-4" />
                {!isCollapsed && <span className="ml-2">New Chat</span>}
              </Button>
            </div>
            
            {!isCollapsed && (
              <ScrollArea className="flex-1 max-h-64">
                <SidebarGroupContent className="px-2">
                  <div className="space-y-1">
                    {conversations.map((conversation) => (
                      <div
                        key={conversation.id}
                        className={`group relative flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
                          currentConversationId === conversation.id
                            ? "bg-primary/10 text-primary"
                            : "hover:bg-secondary"
                        }`}
                        onClick={() => onSelectConversation(conversation.id)}
                      >
                        <MessageSquare className="w-4 h-4 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">
                            {conversation.title || "Untitled"}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {formatDistanceToNow(new Date(conversation.updated_at), { addSuffix: true })}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 h-6 w-6"
                          onClick={(e) => handleDelete(conversation.id, e)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </SidebarGroupContent>
              </ScrollArea>
            )}
          </SidebarGroup>
        )}

        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center gap-2 px-2">
            <Sparkles className="h-4 w-4" />
            {!isCollapsed && <span>Navigation</span>}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end
                      className={({ isActive }) =>
                        isActive
                          ? "bg-primary/10 text-primary font-medium"
                          : "hover:bg-muted/50"
                      }
                    >
                      <item.icon className="h-4 w-4" />
                      {!isCollapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4">
        <UserMenu />
      </SidebarFooter>
    </Sidebar>
  );
}
