import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  GitBranch, 
  Plus, 
  Play, 
  Save,
  Trash2,
  Clock,
  Loader2
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { WorkflowBuilder, type WorkflowStep } from "@/components/workflow/WorkflowBuilder";
import { WorkflowRunner } from "@/components/workflow/WorkflowRunner";

type SavedWorkflow = {
  id: string;
  name: string;
  description: string | null;
  steps: WorkflowStep[];
  created_at: string;
  updated_at: string;
};

export default function Workflows() {
  const [activeTab, setActiveTab] = useState("builder");
  const [currentWorkflow, setCurrentWorkflow] = useState<WorkflowStep[]>([]);
  const [savedWorkflows, setSavedWorkflows] = useState<SavedWorkflow[]>([]);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [workflowName, setWorkflowName] = useState("New Workflow");

  useEffect(() => {
    loadWorkflows();
  }, []);

  const loadWorkflows = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("prompt_workflows")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });

      if (error) throw error;
      
      // Transform the data to match our type
      const workflows: SavedWorkflow[] = (data || []).map(w => ({
        id: w.id,
        name: w.name,
        description: w.description,
        steps: (w.steps as unknown as WorkflowStep[]) || [],
        created_at: w.created_at || "",
        updated_at: w.updated_at || "",
      }));
      
      setSavedWorkflows(workflows);
    } catch (error) {
      console.error("Error loading workflows:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveWorkflow = async (steps: WorkflowStep[]) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please sign in to save workflows");
        return;
      }

      if (selectedWorkflowId) {
        // Update existing
        const { error } = await supabase
          .from("prompt_workflows")
          .update({
            name: workflowName,
            steps: JSON.parse(JSON.stringify(steps)),
            updated_at: new Date().toISOString(),
          })
          .eq("id", selectedWorkflowId);

        if (error) throw error;
        toast.success("Workflow updated");
      } else {
        // Create new
        const { data, error } = await supabase
          .from("prompt_workflows")
          .insert([{
            name: workflowName,
            steps: JSON.parse(JSON.stringify(steps)),
            user_id: user.id,
          }])
          .select()
          .single();

        if (error) throw error;
        setSelectedWorkflowId(data.id);
        toast.success("Workflow saved");
      }

      loadWorkflows();
    } catch (error) {
      console.error("Error saving workflow:", error);
      toast.error("Failed to save workflow");
    }
  };

  const loadWorkflow = (workflow: SavedWorkflow) => {
    setCurrentWorkflow(workflow.steps);
    setWorkflowName(workflow.name);
    setSelectedWorkflowId(workflow.id);
    setActiveTab("builder");
  };

  const deleteWorkflow = async (id: string) => {
    try {
      const { error } = await supabase
        .from("prompt_workflows")
        .delete()
        .eq("id", id);

      if (error) throw error;
      
      if (selectedWorkflowId === id) {
        setSelectedWorkflowId(null);
        setCurrentWorkflow([]);
        setWorkflowName("New Workflow");
      }
      
      toast.success("Workflow deleted");
      loadWorkflows();
    } catch (error) {
      console.error("Error deleting workflow:", error);
      toast.error("Failed to delete workflow");
    }
  };

  const createNewWorkflow = () => {
    setCurrentWorkflow([]);
    setWorkflowName("New Workflow");
    setSelectedWorkflowId(null);
    setActiveTab("builder");
  };

  const runWorkflow = (steps: WorkflowStep[]) => {
    setCurrentWorkflow(steps);
    setActiveTab("runner");
  };

  return (
    <div className="container max-w-7xl py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold mb-2">Prompt Workflows</h1>
          <p className="text-muted-foreground">Chain prompts together for complex AI tasks</p>
        </div>
        <Button onClick={createNewWorkflow}>
          <Plus className="h-4 w-4 mr-2" />
          New Workflow
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar - Saved Workflows */}
        <div className="lg:col-span-1">
          <Card className="p-4">
            <h3 className="font-medium mb-3 flex items-center gap-2">
              <GitBranch className="h-4 w-4" />
              Saved Workflows
            </h3>
            
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : savedWorkflows.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No saved workflows yet
              </p>
            ) : (
              <div className="space-y-2">
                {savedWorkflows.map((workflow) => (
                  <div
                    key={workflow.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedWorkflowId === workflow.id
                        ? "border-primary bg-accent"
                        : "hover:border-primary/50 hover:bg-accent/50"
                    }`}
                    onClick={() => loadWorkflow(workflow)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm truncate">
                        {workflow.name}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteWorkflow(workflow.id);
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {new Date(workflow.updated_at).toLocaleDateString()}
                      <span>•</span>
                      {workflow.steps.length} steps
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="builder" className="gap-2">
                <GitBranch className="h-4 w-4" />
                Builder
              </TabsTrigger>
              <TabsTrigger value="runner" className="gap-2" disabled={currentWorkflow.length === 0}>
                <Play className="h-4 w-4" />
                Runner
              </TabsTrigger>
            </TabsList>

            <TabsContent value="builder">
              <WorkflowBuilder
                initialSteps={currentWorkflow}
                onSave={saveWorkflow}
                onRun={runWorkflow}
              />
            </TabsContent>

            <TabsContent value="runner">
              {currentWorkflow.length > 0 ? (
                <WorkflowRunner
                  steps={currentWorkflow}
                  onComplete={(results) => {
                    console.log("Workflow completed:", results);
                  }}
                />
              ) : (
                <Card className="p-12 text-center">
                  <p className="text-muted-foreground">
                    Create a workflow first to run it
                  </p>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
