import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Star, Download, Trash2, Copy, Volume2 } from "lucide-react";
import { toast } from "sonner";

export default function Library() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const queryClient = useQueryClient();

  const { data: prompts, isLoading } = useQuery({
    queryKey: ["prompts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prompt_library")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("prompt_library")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prompts"] });
      toast.success("Prompt deleted successfully");
    },
  });

  const toggleFavoriteMutation = useMutation({
    mutationFn: async ({ id, isFavorite }: { id: string; isFavorite: boolean }) => {
      const { error } = await supabase
        .from("prompt_library")
        .update({ is_favorite: !isFavorite })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prompts"] });
    },
  });

  const handleReadAloud = async (text: string) => {
    try {
      toast.loading("Generating speech...");
      const { data, error } = await supabase.functions.invoke("text-to-speech", {
        body: { text: text.substring(0, 1000) }, // Limit length
      });

      if (error) throw error;

      const audio = new Audio(`data:audio/mpeg;base64,${data.audioContent}`);
      audio.play();
      toast.success("Playing audio");
    } catch (error) {
      console.error("Text-to-speech error:", error);
      toast.error("Failed to generate speech");
    }
  };

  const handleExport = (prompt: any) => {
    const markdown = `# ${prompt.title}\n\n${prompt.description || ""}\n\n## Content\n\n${prompt.content}\n\n## Metadata\n- Category: ${prompt.category || "N/A"}\n- Tags: ${prompt.tags?.join(", ") || "None"}\n- Model: ${prompt.model_recommendation || "N/A"}\n- Created: ${new Date(prompt.created_at).toLocaleDateString()}`;
    
    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${prompt.title.replace(/\s+/g, "-")}.md`;
    a.click();
    toast.success("Prompt exported");
  };

  const filteredPrompts = prompts?.filter((p) => {
    const matchesSearch = 
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.tags?.some((tag: string) => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = 
      selectedCategory === "all" || 
      p.category === selectedCategory ||
      (selectedCategory === "favorites" && p.is_favorite);
    
    return matchesSearch && matchesCategory;
  });

  const categories = ["all", "favorites", ...new Set(prompts?.map((p) => p.category).filter(Boolean) || [])];

  if (isLoading) {
    return <div className="p-8">Loading your prompt library...</div>;
  }

  return (
    <div className="container max-w-7xl py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Prompt Library</h1>
        <p className="text-muted-foreground">Manage and reuse your saved prompts</p>
      </div>

      <div className="mb-6 flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search prompts by title, content, or tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="mb-6">
        <TabsList>
          {categories.map((cat) => (
            <TabsTrigger key={cat} value={cat} className="capitalize">
              {cat}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="grid gap-4">
        {filteredPrompts?.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground">No prompts found. Start generating and saving prompts!</p>
          </Card>
        ) : (
          filteredPrompts?.map((prompt) => (
            <Card key={prompt.id} className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-xl font-semibold">{prompt.title}</h3>
                    {prompt.is_favorite && <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />}
                  </div>
                  {prompt.description && (
                    <p className="text-sm text-muted-foreground mb-3">{prompt.description}</p>
                  )}
                  <div className="flex flex-wrap gap-2 mb-3">
                    {prompt.category && (
                      <Badge variant="outline">{prompt.category}</Badge>
                    )}
                    {prompt.tags?.map((tag: string) => (
                      <Badge key={tag} variant="secondary">{tag}</Badge>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-muted/50 p-4 rounded-lg mb-4 max-h-48 overflow-y-auto">
                <pre className="text-sm whitespace-pre-wrap font-mono">{prompt.content}</pre>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex gap-2 text-xs text-muted-foreground">
                  {prompt.token_count && <span>{prompt.token_count} tokens</span>}
                  {prompt.performance_score && <span>Score: {prompt.performance_score}/10</span>}
                  <span>Used {prompt.usage_count || 0} times</span>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleFavoriteMutation.mutate({ 
                      id: prompt.id, 
                      isFavorite: prompt.is_favorite 
                    })}
                  >
                    <Star className={`h-4 w-4 ${prompt.is_favorite ? "fill-yellow-400 text-yellow-400" : ""}`} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleReadAloud(prompt.content)}
                  >
                    <Volume2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(prompt.content);
                      toast.success("Copied to clipboard");
                    }}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleExport(prompt)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteMutation.mutate(prompt.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
