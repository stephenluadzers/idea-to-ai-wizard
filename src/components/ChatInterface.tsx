import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Copy, Download, Sparkles, Loader2, FileUp, Save, Layers } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { FileUploadManager, UploadedFile } from "./FileUploadManager";
import { SavePromptDialog } from "./SavePromptDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";

interface Message {
  role: "user" | "assistant";
  content: string | Array<{ type: "text" | "image_url" | "document"; text?: string; image_url?: { url: string }; document?: { name: string; url: string; type: string } }>;
}

interface ChatInterfaceProps {
  currentConversationId: string | null;
  onConversationCreated?: (id: string) => void;
  onNewChat?: () => void;
}

export const ChatInterface = ({ 
  currentConversationId: externalConversationId, 
  onConversationCreated,
  onNewChat 
}: ChatInterfaceProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [isCompareMode, setIsCompareMode] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(externalConversationId);
  const { toast } = useToast();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load template from sessionStorage if available
  useEffect(() => {
    const templateContent = sessionStorage.getItem("templateContent");
    if (templateContent) {
      setInput(templateContent);
      sessionStorage.removeItem("templateContent");
      toast({
        title: "Template Loaded",
        description: "Template content has been loaded. You can edit and use it.",
      });
    }
  }, []);

  // Load conversation when external ID changes
  useEffect(() => {
    if (externalConversationId) {
      loadConversation(externalConversationId);
    } else {
      // New chat
      setMessages([]);
      setCurrentConversationId(null);
    }
  }, [externalConversationId]);

  const loadConversation = async (conversationId: string) => {
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error loading conversation:", error);
      toast({
        title: "Error",
        description: "Failed to load conversation",
        variant: "destructive",
      });
    } else if (data) {
      const loadedMessages: Message[] = data.map((msg) => ({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      }));
      setMessages(loadedMessages);
      setCurrentConversationId(conversationId);
      toast({
        title: "Loaded",
        description: "Conversation loaded successfully",
      });
    }
  };

  const saveMessageToDb = async (role: string, content: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Create new conversation if needed
    if (!currentConversationId) {
      const { data: convData, error: convError } = await supabase
        .from("conversations")
        .insert({
          user_id: user.id,
          title: content.substring(0, 50) + (content.length > 50 ? "..." : ""),
        })
        .select()
        .single();

      if (convError) {
        console.error("Error creating conversation:", convError);
        return;
      }

      setCurrentConversationId(convData.id);
      onConversationCreated?.(convData.id);

      // Save message
      await supabase.from("messages").insert({
        conversation_id: convData.id,
        user_id: user.id,
        role,
        content,
      });
    } else {
      // Save to existing conversation
      await supabase.from("messages").insert({
        conversation_id: currentConversationId,
        user_id: user.id,
        role,
        content,
      });

      // Update conversation's updated_at
      await supabase
        .from("conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", currentConversationId);
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const streamChat = async (userMessage: string) => {
    // Build message content with files
    let messageContent: Message["content"];
    
    if (uploadedFiles.length > 0) {
      const contentParts: Array<{ type: "text" | "image_url" | "document"; text?: string; image_url?: { url: string }; document?: { name: string; url: string; type: string } }> = [
        { type: "text" as const, text: userMessage }
      ];
      
      uploadedFiles.forEach(file => {
        if (file.type === "image") {
          contentParts.push({ 
            type: "image_url" as const, 
            image_url: { url: file.url } 
          });
        } else {
          contentParts.push({
            type: "document" as const,
            document: {
              name: file.file.name,
              url: file.url,
              type: file.metadata.format
            }
          });
        }
      });
      
      messageContent = contentParts;
    } else {
      messageContent = userMessage;
    }

    const newMessages = [...messages, { role: "user" as const, content: messageContent }];
    setMessages(newMessages);
    setIsLoading(true);
    setUploadedFiles([]); // Clear files after sending
    setIsUploadDialogOpen(false);

    // Save user message to database
    const contentText = typeof messageContent === "string" 
      ? messageContent 
      : messageContent.find(part => part.type === "text")?.text || "";
    await saveMessageToDb("user", contentText);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: "Authentication required",
          description: "Please sign in to use this feature",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-enhanced-prompt`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ 
            userInput: contentText,
            systemContext: uploadedFiles.length > 0 ? "User has attached files for context" : undefined
          }),
        }
      );

      if (!response.ok || !response.body) {
        throw new Error("Failed to start stream");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let streamDone = false;
      let assistantContent = "";

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") {
            streamDone = true;
            break;
          }

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantContent += content;
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") {
                  return prev.map((m, i) =>
                    i === prev.length - 1 ? { ...m, content: assistantContent } : m
                  );
                }
                return [...prev, { role: "assistant", content: assistantContent }];
              });
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      // Save assistant's final message to database
      if (assistantContent) {
        await saveMessageToDb("assistant", assistantContent);
      }
    } catch (error) {
      console.error("Chat error:", error);
      toast({
        title: "Error",
        description: "Failed to generate response. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = () => {
    if ((!input.trim() && uploadedFiles.length === 0) || isLoading) return;
    streamChat(input);
    setInput("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const copyLastPrompt = () => {
    const lastAssistantMessage = messages
      .slice()
      .reverse()
      .find((m) => m.role === "assistant");
    if (lastAssistantMessage) {
      const content = typeof lastAssistantMessage.content === "string" 
        ? lastAssistantMessage.content 
        : lastAssistantMessage.content.find(part => part.type === "text")?.text || "";
      navigator.clipboard.writeText(content);
      toast({
        title: "Copied!",
        description: "Prompt copied to clipboard.",
      });
    }
  };

  const downloadLastPrompt = () => {
    const lastAssistantMessage = messages
      .slice()
      .reverse()
      .find((m) => m.role === "assistant");
    if (lastAssistantMessage) {
      const content = typeof lastAssistantMessage.content === "string" 
        ? lastAssistantMessage.content 
        : lastAssistantMessage.content.find(part => part.type === "text")?.text || "";
      const blob = new Blob([content], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "ai-assistant-prompt.md";
      a.click();
      URL.revokeObjectURL(url);
      toast({
        title: "Downloaded!",
        description: "Prompt saved as Markdown file.",
      });
    }
  };

  const getLastPromptContent = (): string => {
    const lastAssistantMessage = messages
      .slice()
      .reverse()
      .find((m) => m.role === "assistant");
    if (lastAssistantMessage) {
      return typeof lastAssistantMessage.content === "string" 
        ? lastAssistantMessage.content 
        : lastAssistantMessage.content.find(part => part.type === "text")?.text || "";
    }
    return "";
  };

  const handleCompareMode = () => {
    if (!input.trim()) {
      toast({
        title: "Enter a prompt",
        description: "Please enter your prompt request to generate 3 variations",
        variant: "destructive",
      });
      return;
    }
    
    const enhancedInput = `${input}\n\n**COMPARISON MODE**: Generate 3 distinct variations of this prompt with different approaches or styles. Label them as "Variation 1:", "Variation 2:", and "Variation 3:".`;
    streamChat(enhancedInput);
    setInput("");
    setIsCompareMode(false);
  };

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 p-6" ref={scrollRef}>
        <div className="max-w-4xl mx-auto space-y-6">
          {messages.length === 0 && (
            <Card className="p-8 text-center bg-gradient-card border-border/50">
              <Sparkles className="w-12 h-12 mx-auto mb-4 text-primary" />
              <h3 className="text-xl font-semibold mb-2">Start a Conversation</h3>
              <p className="text-muted-foreground mb-4">
                Tell me about your AI assistant idea, and I'll help you create a comprehensive structured prompt.
              </p>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>📸 Images: Workflows, flyers, diagrams, screenshots</p>
                <p>📄 Documents: Business plans, reports, PDFs, Word docs</p>
                <p>🎯 All files will be analyzed to create contextual metaprompts</p>
              </div>
            </Card>
          )}

          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <Card
                className={`max-w-[85%] p-4 ${
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-gradient-card border-border/50"
                }`}
              >
                {typeof message.content === "string" ? (
                  <div className="whitespace-pre-wrap font-mono text-sm leading-relaxed">
                    {message.content}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {message.content.map((part, partIndex) => (
                      <div key={partIndex}>
                        {part.type === "text" && part.text && (
                          <div className="whitespace-pre-wrap font-mono text-sm leading-relaxed">
                            {part.text}
                          </div>
                        )}
                        {part.type === "image_url" && part.image_url && (
                          <img
                            src={part.image_url.url}
                            alt="Uploaded"
                            className="max-w-full rounded-lg border border-border/20"
                          />
                        )}
                        {part.type === "document" && part.document && (
                          <div className="bg-secondary/50 p-3 rounded-lg border border-border/20">
                            <p className="text-sm font-medium">{part.document.name}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {part.document.type}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <Card className="p-4 bg-gradient-card border-border/50">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              </Card>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-4xl mx-auto p-4 space-y-3">
          {messages.length > 0 && (
            <div className="flex gap-2 justify-end">
              <Button
                variant="secondary"
                size="sm"
                onClick={copyLastPrompt}
                disabled={isLoading}
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy Last Prompt
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsSaveDialogOpen(true)}
                disabled={isLoading || !getLastPromptContent()}
              >
                <Save className="w-4 h-4 mr-2" />
                Save to Library
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={downloadLastPrompt}
                disabled={isLoading}
              >
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
            </div>
          )}

          <div className="flex gap-2">
            <div className="flex-1 space-y-2">
              <Textarea
                placeholder="Describe your AI assistant idea... (Press Enter to send, Shift+Enter for new line)"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                className="min-h-[80px] bg-secondary border-border/50 resize-none"
                disabled={isLoading}
              />
              {input.trim() && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCompareMode}
                  disabled={isLoading}
                  className="w-full"
                >
                  <Layers className="w-4 h-4 mr-2" />
                  Generate 3 Variations (Comparison Mode)
                </Button>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    disabled={isLoading}
                    variant="outline"
                    size="icon"
                    className="shrink-0"
                  >
                    <FileUp className="w-5 h-5" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Upload Files</DialogTitle>
                  </DialogHeader>
                  <FileUploadManager
                    files={uploadedFiles}
                    onFilesChange={setUploadedFiles}
                  />
                  {uploadedFiles.length > 0 && (
                    <Button onClick={() => setIsUploadDialogOpen(false)} className="w-full">
                      Done ({uploadedFiles.length} file{uploadedFiles.length !== 1 ? 's' : ''})
                    </Button>
                  )}
                </DialogContent>
              </Dialog>
              <Button
                onClick={handleSend}
                disabled={(!input.trim() && uploadedFiles.length === 0) || isLoading}
                className="bg-gradient-primary text-primary-foreground shadow-primary hover:shadow-glow transition-all duration-300 shrink-0"
                size="icon"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <SavePromptDialog
        open={isSaveDialogOpen}
        onOpenChange={setIsSaveDialogOpen}
        content={getLastPromptContent()}
      />
    </div>
  );
};
