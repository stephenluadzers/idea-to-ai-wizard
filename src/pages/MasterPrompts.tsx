import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Brain, Plus, Trash2, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface MasterPrompt {
  id: string;
  name: string;
  content: string;
  is_active: boolean;
  framework: string;
  version: number;
  created_at: string;
}

const MasterPrompts = () => {
  const [prompts, setPrompts] = useState<MasterPrompt[]>([]);
  const [newPrompt, setNewPrompt] = useState({ name: "", content: "" });
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadPrompts();
  }, []);

  const loadPrompts = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("master_prompts")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Error loading prompts", description: error.message, variant: "destructive" });
    } else {
      setPrompts(data || []);
    }
  };

  const createPrompt = async () => {
    if (!newPrompt.name || !newPrompt.content) {
      toast({ title: "Missing fields", description: "Please fill in all fields", variant: "destructive" });
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setIsCreating(true);
    const { error } = await supabase.from("master_prompts").insert({
      user_id: user.id,
      name: newPrompt.name,
      content: newPrompt.content,
      is_active: prompts.length === 0, // First prompt is active by default
      framework: "combined",
    });

    setIsCreating(false);

    if (error) {
      toast({ title: "Error creating prompt", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Master prompt created" });
      setNewPrompt({ name: "", content: "" });
      loadPrompts();
    }
  };

  const setActivePrompt = async (promptId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Deactivate all prompts
    await supabase
      .from("master_prompts")
      .update({ is_active: false })
      .eq("user_id", user.id);

    // Activate selected prompt
    const { error } = await supabase
      .from("master_prompts")
      .update({ is_active: true })
      .eq("id", promptId);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Active prompt updated" });
      loadPrompts();
    }
  };

  const deletePrompt = async (promptId: string) => {
    const { error } = await supabase
      .from("master_prompts")
      .delete()
      .eq("id", promptId);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Prompt deleted" });
      loadPrompts();
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Brain className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold text-foreground">Master Prompts</h1>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Create Master Prompt</CardTitle>
            <CardDescription>
              Define a system-level prompt that combines all prompting strategies
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="Prompt name"
              value={newPrompt.name}
              onChange={(e) => setNewPrompt({ ...newPrompt, name: e.target.value })}
            />
            <Textarea
              placeholder="Master prompt content..."
              value={newPrompt.content}
              onChange={(e) => setNewPrompt({ ...newPrompt, content: e.target.value })}
              rows={8}
            />
            <Button onClick={createPrompt} disabled={isCreating}>
              <Plus className="w-4 h-4 mr-2" />
              Create Master Prompt
            </Button>
          </CardContent>
        </Card>

        <div className="grid gap-4">
          {prompts.map((prompt) => (
            <Card key={prompt.id} className={prompt.is_active ? "border-primary" : ""}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2">
                      {prompt.name}
                      {prompt.is_active && (
                        <Badge variant="default">
                          <Check className="w-3 h-3 mr-1" />
                          Active
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription>
                      Version {prompt.version} • {new Date(prompt.created_at).toLocaleDateString()}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    {!prompt.is_active && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setActivePrompt(prompt.id)}
                      >
                        Set Active
                      </Button>
                    )}
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deletePrompt(prompt.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <pre className="text-sm text-muted-foreground whitespace-pre-wrap font-mono bg-muted p-4 rounded">
                  {prompt.content}
                </pre>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MasterPrompts;