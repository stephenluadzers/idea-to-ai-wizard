import { useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Trash2, 
  Play, 
  ArrowDown, 
  GripVertical,
  Copy,
  Save,
  Sparkles,
  Zap,
  MessageSquare,
  FileText,
  Image,
  Code
} from "lucide-react";
import { toast } from "sonner";

export type WorkflowStep = {
  id: string;
  type: "prompt" | "transform" | "condition" | "output";
  name: string;
  prompt: string;
  outputVariable: string;
  inputVariables: string[];
};

type WorkflowBuilderProps = {
  initialSteps?: WorkflowStep[];
  onSave?: (steps: WorkflowStep[]) => void;
  onRun?: (steps: WorkflowStep[]) => void;
};

const STEP_TYPES = [
  { type: "prompt" as const, label: "AI Prompt", icon: MessageSquare, color: "bg-blue-500" },
  { type: "transform" as const, label: "Transform", icon: Zap, color: "bg-purple-500" },
  { type: "condition" as const, label: "Condition", icon: Code, color: "bg-orange-500" },
  { type: "output" as const, label: "Output", icon: FileText, color: "bg-green-500" },
];

const WORKFLOW_TEMPLATES = [
  {
    name: "Content Pipeline",
    description: "Generate content, refine it, then format for different platforms",
    steps: [
      { type: "prompt" as const, name: "Generate Draft", prompt: "Write a detailed blog post about {{topic}}", outputVariable: "draft" },
      { type: "transform" as const, name: "Refine Content", prompt: "Improve this content for clarity and engagement:\n\n{{draft}}", outputVariable: "refined" },
      { type: "output" as const, name: "Final Output", prompt: "Format this for social media:\n\n{{refined}}", outputVariable: "final" },
    ]
  },
  {
    name: "AI Agent Builder",
    description: "Create a comprehensive AI agent system prompt",
    steps: [
      { type: "prompt" as const, name: "Define Role", prompt: "Create a detailed role definition for an AI {{agentType}} agent", outputVariable: "role" },
      { type: "prompt" as const, name: "Add Capabilities", prompt: "Based on this role:\n{{role}}\n\nDefine specific capabilities and tools", outputVariable: "capabilities" },
      { type: "prompt" as const, name: "Safety Guidelines", prompt: "Create safety guidelines for an agent with:\nRole: {{role}}\nCapabilities: {{capabilities}}", outputVariable: "safety" },
      { type: "output" as const, name: "Compile Agent", prompt: "Compile a complete system prompt combining:\n\nRole: {{role}}\n\nCapabilities: {{capabilities}}\n\nSafety: {{safety}}", outputVariable: "agentPrompt" },
    ]
  },
  {
    name: "Research & Summarize",
    description: "Research a topic and create structured summaries",
    steps: [
      { type: "prompt" as const, name: "Research", prompt: "Research and explain {{topic}} in detail", outputVariable: "research" },
      { type: "transform" as const, name: "Extract Key Points", prompt: "Extract the 5 most important points from:\n\n{{research}}", outputVariable: "keyPoints" },
      { type: "output" as const, name: "Create Summary", prompt: "Create an executive summary from these key points:\n\n{{keyPoints}}", outputVariable: "summary" },
    ]
  }
];

export function WorkflowBuilder({ initialSteps = [], onSave, onRun }: WorkflowBuilderProps) {
  const [steps, setSteps] = useState<WorkflowStep[]>(initialSteps);
  const [workflowName, setWorkflowName] = useState("New Workflow");
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const generateId = () => Math.random().toString(36).substring(2, 9);

  const addStep = (type: WorkflowStep["type"]) => {
    const stepType = STEP_TYPES.find(s => s.type === type);
    const newStep: WorkflowStep = {
      id: generateId(),
      type,
      name: `${stepType?.label || "Step"} ${steps.length + 1}`,
      prompt: "",
      outputVariable: `output_${steps.length + 1}`,
      inputVariables: steps.length > 0 ? [steps[steps.length - 1].outputVariable] : [],
    };
    setSteps([...steps, newStep]);
  };

  const updateStep = (id: string, updates: Partial<WorkflowStep>) => {
    setSteps(steps.map(step => 
      step.id === id ? { ...step, ...updates } : step
    ));
  };

  const removeStep = (id: string) => {
    setSteps(steps.filter(step => step.id !== id));
  };

  const duplicateStep = (step: WorkflowStep) => {
    const newStep = {
      ...step,
      id: generateId(),
      name: `${step.name} (Copy)`,
      outputVariable: `${step.outputVariable}_copy`,
    };
    const index = steps.findIndex(s => s.id === step.id);
    const newSteps = [...steps];
    newSteps.splice(index + 1, 0, newStep);
    setSteps(newSteps);
  };

  const loadTemplate = (template: typeof WORKFLOW_TEMPLATES[0]) => {
    const newSteps: WorkflowStep[] = template.steps.map((step, index) => ({
      id: generateId(),
      type: step.type,
      name: step.name,
      prompt: step.prompt,
      outputVariable: step.outputVariable,
      inputVariables: index > 0 ? [template.steps[index - 1].outputVariable] : [],
    }));
    setSteps(newSteps);
    setWorkflowName(template.name);
    toast.success(`Loaded "${template.name}" template`);
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    
    const newSteps = [...steps];
    const draggedStep = newSteps[draggedIndex];
    newSteps.splice(draggedIndex, 1);
    newSteps.splice(index, 0, draggedStep);
    setSteps(newSteps);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const getAvailableVariables = (currentIndex: number) => {
    return steps.slice(0, currentIndex).map(s => s.outputVariable);
  };

  const handleSave = () => {
    if (onSave) {
      onSave(steps);
    }
    toast.success("Workflow saved");
  };

  const handleRun = () => {
    if (steps.length === 0) {
      toast.error("Add at least one step to run the workflow");
      return;
    }
    if (onRun) {
      onRun(steps);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Input
          value={workflowName}
          onChange={(e) => setWorkflowName(e.target.value)}
          className="text-xl font-bold bg-transparent border-none focus-visible:ring-0 w-auto"
        />
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Save
          </Button>
          <Button onClick={handleRun} disabled={steps.length === 0}>
            <Play className="h-4 w-4 mr-2" />
            Run Workflow
          </Button>
        </div>
      </div>

      {/* Templates */}
      <Card className="p-4">
        <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          Quick Start Templates
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {WORKFLOW_TEMPLATES.map((template) => (
            <button
              key={template.name}
              onClick={() => loadTemplate(template)}
              className="p-3 border rounded-lg text-left hover:border-primary hover:bg-accent/50 transition-colors"
            >
              <div className="font-medium text-sm">{template.name}</div>
              <div className="text-xs text-muted-foreground mt-1">{template.description}</div>
              <div className="text-xs text-muted-foreground mt-2">{template.steps.length} steps</div>
            </button>
          ))}
        </div>
      </Card>

      {/* Add Step Buttons */}
      <div className="flex gap-2 flex-wrap">
        {STEP_TYPES.map((stepType) => (
          <Button
            key={stepType.type}
            variant="outline"
            size="sm"
            onClick={() => addStep(stepType.type)}
            className="gap-2"
          >
            <div className={`w-3 h-3 rounded ${stepType.color}`} />
            <stepType.icon className="h-4 w-4" />
            Add {stepType.label}
          </Button>
        ))}
      </div>

      {/* Steps */}
      <div className="space-y-4">
        {steps.length === 0 ? (
          <Card className="p-12 text-center border-dashed">
            <div className="text-muted-foreground">
              <Plus className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No steps yet. Add a step or load a template to get started.</p>
            </div>
          </Card>
        ) : (
          steps.map((step, index) => {
            const stepType = STEP_TYPES.find(s => s.type === step.type);
            const availableVars = getAvailableVariables(index);
            
            return (
              <div key={step.id}>
                <Card
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`p-4 ${draggedIndex === index ? 'opacity-50' : ''}`}
                >
                  <div className="flex items-start gap-4">
                    <div className="flex flex-col items-center gap-2">
                      <div className="cursor-grab hover:bg-accent rounded p-1">
                        <GripVertical className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className={`w-8 h-8 rounded-full ${stepType?.color} flex items-center justify-center text-white text-sm font-medium`}>
                        {index + 1}
                      </div>
                    </div>
                    
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-2">
                        <Input
                          value={step.name}
                          onChange={(e) => updateStep(step.id, { name: e.target.value })}
                          className="font-medium"
                          placeholder="Step name"
                        />
                        <Badge variant="secondary" className="shrink-0">
                          {stepType?.label}
                        </Badge>
                      </div>
                      
                      {availableVars.length > 0 && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>Available variables:</span>
                          {availableVars.map(v => (
                            <code key={v} className="bg-muted px-1.5 py-0.5 rounded">{`{{${v}}}`}</code>
                          ))}
                        </div>
                      )}
                      
                      <Textarea
                        value={step.prompt}
                        onChange={(e) => updateStep(step.id, { prompt: e.target.value })}
                        placeholder={`Enter ${step.type === 'prompt' ? 'AI prompt' : step.type === 'transform' ? 'transformation instructions' : step.type === 'condition' ? 'condition logic' : 'output format'}...`}
                        className="min-h-[100px] font-mono text-sm"
                      />
                      
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Output as:</span>
                        <Input
                          value={step.outputVariable}
                          onChange={(e) => updateStep(step.id, { outputVariable: e.target.value.replace(/\s/g, '_') })}
                          className="w-40 font-mono text-sm"
                          placeholder="variable_name"
                        />
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-1">
                      <Button variant="ghost" size="icon" onClick={() => duplicateStep(step)}>
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => removeStep(step.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </Card>
                
                {index < steps.length - 1 && (
                  <div className="flex justify-center py-2">
                    <ArrowDown className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
