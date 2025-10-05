import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, FileText, Trash2, Eye } from "lucide-react";
import { toast } from "sonner";

export default function Knowledge() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [viewContent, setViewContent] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: knowledgeBases, isLoading } = useQuery({
    queryKey: ["knowledge-bases"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("knowledge_bases")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (formData: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("knowledge_bases")
        .insert({
          ...formData,
          user_id: user.id,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knowledge-bases"] });
      setIsAddDialogOpen(false);
      toast.success("Knowledge base added");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("knowledge_bases")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knowledge-bases"] });
      toast.success("Knowledge base deleted");
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createMutation.mutate({
      name: formData.get("name"),
      description: formData.get("description"),
      content: formData.get("content"),
      file_type: "text",
      file_size: (formData.get("content") as string).length,
    });
  };

  if (isLoading) {
    return <div className="p-8">Loading knowledge bases...</div>;
  }

  return (
    <div className="container max-w-7xl py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold mb-2">Knowledge Base</h1>
          <p className="text-muted-foreground">Store domain knowledge to enhance prompt generation</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Knowledge
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add Knowledge Base</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="Company Guidelines, Product Docs, etc."
                  required
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  name="description"
                  placeholder="Brief description of this knowledge"
                />
              </div>
              <div>
                <Label htmlFor="content">Content</Label>
                <Textarea
                  id="content"
                  name="content"
                  placeholder="Paste your knowledge content here..."
                  className="min-h-[200px]"
                  required
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Add Knowledge Base</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {knowledgeBases?.length === 0 ? (
          <Card className="p-12 text-center">
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">No knowledge bases yet</p>
            <p className="text-sm text-muted-foreground">Add domain knowledge to automatically enhance your prompts</p>
          </Card>
        ) : (
          knowledgeBases?.map((kb) => (
            <Card key={kb.id} className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <h3 className="text-xl font-semibold">{kb.name}</h3>
                    {kb.is_active && <Badge className="bg-green-500">Active</Badge>}
                  </div>
                  {kb.description && (
                    <p className="text-sm text-muted-foreground mb-3">{kb.description}</p>
                  )}
                  <div className="text-xs text-muted-foreground">
                    {kb.file_size ? `${(kb.file_size / 1024).toFixed(1)} KB` : "Unknown size"} • 
                    Added {new Date(kb.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setViewContent(kb.content)}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => deleteMutation.mutate(kb.id)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>

      <Dialog open={!!viewContent} onOpenChange={() => setViewContent(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Knowledge Content</DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto">
            <pre className="whitespace-pre-wrap text-sm p-4 bg-muted rounded">{viewContent}</pre>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
