import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Copy, Download, Sparkles, Loader2, ImagePlus, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Message {
  role: "user" | "assistant";
  content: string | Array<{ type: "text" | "image_url"; text?: string; image_url?: { url: string } }>;
}

export const ChatInterface = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<Array<{ url: string; file: File }>>([]);
  const { toast } = useToast();
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    files.forEach(file => {
      if (!file.type.startsWith("image/")) {
        toast({
          title: "Invalid File",
          description: "Please upload only image files.",
          variant: "destructive",
        });
        return;
      }

      if (file.size > 20 * 1024 * 1024) { // 20MB limit
        toast({
          title: "File Too Large",
          description: "Images must be under 20MB.",
          variant: "destructive",
        });
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        setUploadedImages(prev => [...prev, { url: event.target?.result as string, file }]);
      };
      reader.readAsDataURL(file);
    });

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
  };

  const streamChat = async (userMessage: string) => {
    // Build message content with images
    let messageContent: string | Array<{ type: "text" | "image_url"; text?: string; image_url?: { url: string } }>;
    
    if (uploadedImages.length > 0) {
      messageContent = [
        { type: "text" as const, text: userMessage },
        ...uploadedImages.map(img => ({ 
          type: "image_url" as const, 
          image_url: { url: img.url } 
        }))
      ];
    } else {
      messageContent = userMessage;
    }

    const newMessages = [...messages, { role: "user" as const, content: messageContent }];
    setMessages(newMessages);
    setIsLoading(true);
    setUploadedImages([]); // Clear images after sending

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-prompt`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ messages: newMessages }),
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
    if ((!input.trim() && uploadedImages.length === 0) || isLoading) return;
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
              <p className="text-sm text-muted-foreground">
                💡 Tip: Upload images of workflows, business flyers, diagrams, or screenshots to analyze and create contextual prompts!
              </p>
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
                onClick={downloadLastPrompt}
                disabled={isLoading}
              >
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
            </div>
          )}

          {uploadedImages.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {uploadedImages.map((img, index) => (
                <div key={index} className="relative group">
                  <img
                    src={img.url}
                    alt={`Upload ${index + 1}`}
                    className="h-20 w-20 object-cover rounded-lg border border-border/50"
                  />
                  <Button
                    size="icon"
                    variant="destructive"
                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => removeImage(index)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
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
            </div>
            <div className="flex flex-col gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleImageUpload}
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
                variant="outline"
                size="icon"
                className="shrink-0"
              >
                <ImagePlus className="w-5 h-5" />
              </Button>
              <Button
                onClick={handleSend}
                disabled={(!input.trim() && uploadedImages.length === 0) || isLoading}
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
    </div>
  );
};
