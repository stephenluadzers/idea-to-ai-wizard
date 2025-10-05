import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Save } from "lucide-react";

interface SavePromptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  content: string;
}

export function SavePromptDialog({ open, onOpenChange, content }: SavePromptDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [tags, setTags] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!title) {
      toast.error("Please enter a title");
      return;
    }

    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please sign in to save prompts");
        return;
      }

      const { error } = await supabase.from("prompt_library").insert({
        user_id: user.id,
        title,
        description: description || null,
        content,
        category: category || null,
        tags: tags ? tags.split(",").map(t => t.trim()) : [],
        token_count: Math.ceil(content.length / 4),
      });

      if (error) throw error;

      toast.success("Prompt saved to library!");
      onOpenChange(false);
      setTitle("");
      setDescription("");
      setCategory("");
      setTags("");
    } catch (error) {
      console.error("Save error:", error);
      toast.error("Failed to save prompt");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Save to Library</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              placeholder="e.g., Customer Support AI Prompt"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Brief description of this prompt..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                placeholder="e.g., Customer Service"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="tags">Tags (comma-separated)</Label>
              <Input
                id="tags"
                placeholder="e.g., support, chatbot, empathy"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
              />
            </div>
          </div>

          <div className="bg-muted p-4 rounded max-h-48 overflow-y-auto">
            <Label className="text-xs text-muted-foreground mb-2">Preview</Label>
            <pre className="text-sm whitespace-pre-wrap font-mono">{content.substring(0, 500)}...</pre>
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? "Saving..." : "Save to Library"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
