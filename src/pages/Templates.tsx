import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Copy, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export default function Templates() {
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  const { data: templates, isLoading } = useQuery({
    queryKey: ["templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prompt_templates")
        .select("*")
        .order("usage_count", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const filteredTemplates = templates?.filter((t) =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleUseTemplate = (template: any) => {
    // Store template in sessionStorage to pre-fill chat
    sessionStorage.setItem("templateContent", template.content);
    navigate("/");
    toast.success("Template loaded in Prompt Designer");
  };

  const categories = [...new Set(templates?.map((t) => t.category) || [])];

  if (isLoading) {
    return <div className="p-8">Loading templates...</div>;
  }

  return (
    <div className="container max-w-7xl py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Prompt Templates</h1>
        <p className="text-muted-foreground">Pre-built templates for common use cases</p>
      </div>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredTemplates?.map((template) => (
          <Card key={template.id} className="p-6 flex flex-col">
            <div className="mb-4">
              <h3 className="text-lg font-semibold mb-2">{template.name}</h3>
              <p className="text-sm text-muted-foreground mb-3">{template.description}</p>
              <div className="flex flex-wrap gap-2 mb-3">
                <Badge variant="outline">{template.category}</Badge>
                {template.industry && (
                  <Badge variant="secondary">{template.industry}</Badge>
                )}
              </div>
            </div>

            <div className="bg-muted/50 p-3 rounded text-xs mb-4 flex-1 max-h-32 overflow-y-auto">
              <pre className="whitespace-pre-wrap font-mono">{template.content.substring(0, 200)}...</pre>
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground mb-4">
              <span>Used {template.usage_count || 0} times</span>
              {template.rating && <span>⭐ {template.rating}/5</span>}
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => {
                  navigator.clipboard.writeText(template.content);
                  toast.success("Template copied");
                }}
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy
              </Button>
              <Button
                size="sm"
                className="flex-1"
                onClick={() => handleUseTemplate(template)}
              >
                Use Template
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {filteredTemplates?.length === 0 && (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">No templates found</p>
        </Card>
      )}
    </div>
  );
}
