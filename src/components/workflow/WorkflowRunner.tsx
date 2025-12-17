import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Play, 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  Clock,
  Copy,
  ChevronDown,
  ChevronRight
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { WorkflowStep } from "./WorkflowBuilder";

type StepResult = {
  stepId: string;
  status: "pending" | "running" | "success" | "error";
  output?: string;
  error?: string;
  duration?: number;
};

type WorkflowRunnerProps = {
  steps: WorkflowStep[];
  onComplete?: (results: Record<string, string>) => void;
};

export function WorkflowRunner({ steps, onComplete }: WorkflowRunnerProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<StepResult[]>([]);
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [inputVariables, setInputVariables] = useState<Record<string, string>>({});
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());

  // Extract input variables from prompts (variables not defined by previous steps)
  const getRequiredInputs = () => {
    const definedVars = new Set(steps.map(s => s.outputVariable));
    const requiredInputs = new Set<string>();
    
    steps.forEach(step => {
      const matches = step.prompt.matchAll(/\{\{(\w+)\}\}/g);
      for (const match of matches) {
        const varName = match[1];
        if (!definedVars.has(varName)) {
          requiredInputs.add(varName);
        }
      }
    });
    
    return Array.from(requiredInputs);
  };

  const requiredInputs = getRequiredInputs();

  const substituteVariables = (text: string, vars: Record<string, string>) => {
    return text.replace(/\{\{(\w+)\}\}/g, (_, varName) => vars[varName] || `{{${varName}}}`);
  };

  const runWorkflow = async () => {
    // Check all required inputs are provided
    const missingInputs = requiredInputs.filter(v => !inputVariables[v]?.trim());
    if (missingInputs.length > 0) {
      toast.error(`Please provide values for: ${missingInputs.join(", ")}`);
      return;
    }

    setIsRunning(true);
    setResults(steps.map(s => ({ stepId: s.id, status: "pending" })));
    
    const currentVars: Record<string, string> = { ...inputVariables };
    const stepResults: StepResult[] = [];

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const startTime = Date.now();
      
      // Update status to running
      setResults(prev => prev.map((r, idx) => 
        idx === i ? { ...r, status: "running" } : r
      ));

      try {
        const processedPrompt = substituteVariables(step.prompt, currentVars);
        
        // Call the generate-prompt function
        const { data: { session } } = await supabase.auth.getSession();
        
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-prompt`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session?.access_token || ""}`,
            },
            body: JSON.stringify({
              messages: [{ role: "user", content: processedPrompt }],
            }),
          }
        );

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        // Read the streaming response
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let output = "";

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value);
            const lines = chunk.split("\n");
            
            for (const line of lines) {
              if (line.startsWith("data: ")) {
                const data = line.slice(6);
                if (data === "[DONE]") continue;
                
                try {
                  const parsed = JSON.parse(data);
                  const content = parsed.choices?.[0]?.delta?.content;
                  if (content) {
                    output += content;
                  }
                } catch {
                  // Skip malformed JSON
                }
              }
            }
          }
        }

        const duration = Date.now() - startTime;
        currentVars[step.outputVariable] = output;
        
        const result: StepResult = {
          stepId: step.id,
          status: "success",
          output,
          duration,
        };
        
        stepResults.push(result);
        setResults(prev => prev.map((r, idx) => idx === i ? result : r));
        setVariables({ ...currentVars });
        
        // Auto-expand completed steps
        setExpandedSteps(prev => new Set([...prev, step.id]));
        
      } catch (error) {
        const duration = Date.now() - startTime;
        const result: StepResult = {
          stepId: step.id,
          status: "error",
          error: error instanceof Error ? error.message : "Unknown error",
          duration,
        };
        
        stepResults.push(result);
        setResults(prev => prev.map((r, idx) => idx === i ? result : r));
        
        toast.error(`Step "${step.name}" failed: ${result.error}`);
        break; // Stop workflow on error
      }
    }

    setIsRunning(false);
    
    if (stepResults.every(r => r.status === "success")) {
      toast.success("Workflow completed successfully!");
      onComplete?.(currentVars);
    }
  };

  const toggleExpanded = (stepId: string) => {
    setExpandedSteps(prev => {
      const next = new Set(prev);
      if (next.has(stepId)) {
        next.delete(stepId);
      } else {
        next.add(stepId);
      }
      return next;
    });
  };

  const copyOutput = (output: string) => {
    navigator.clipboard.writeText(output);
    toast.success("Copied to clipboard");
  };

  const getStatusIcon = (status: StepResult["status"]) => {
    switch (status) {
      case "running":
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case "success":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "error":
        return <XCircle className="h-4 w-4 text-destructive" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Input Variables */}
      {requiredInputs.length > 0 && (
        <Card className="p-4">
          <h3 className="font-medium mb-3">Input Variables</h3>
          <div className="grid gap-3">
            {requiredInputs.map(varName => (
              <div key={varName} className="flex items-center gap-3">
                <code className="bg-muted px-2 py-1 rounded text-sm min-w-[120px]">
                  {`{{${varName}}}`}
                </code>
                <Input
                  value={inputVariables[varName] || ""}
                  onChange={(e) => setInputVariables(prev => ({
                    ...prev,
                    [varName]: e.target.value
                  }))}
                  placeholder={`Enter value for ${varName}`}
                  disabled={isRunning}
                />
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Run Button */}
      <Button 
        onClick={runWorkflow} 
        disabled={isRunning || steps.length === 0}
        className="w-full"
        size="lg"
      >
        {isRunning ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Running Workflow...
          </>
        ) : (
          <>
            <Play className="h-4 w-4 mr-2" />
            Run Workflow ({steps.length} steps)
          </>
        )}
      </Button>

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-medium">Results</h3>
          {steps.map((step, index) => {
            const result = results[index];
            const isExpanded = expandedSteps.has(step.id);
            
            return (
              <Card key={step.id} className="overflow-hidden">
                <button
                  onClick={() => result?.output && toggleExpanded(step.id)}
                  className="w-full p-3 flex items-center gap-3 hover:bg-accent/50 transition-colors"
                  disabled={!result?.output}
                >
                  {result?.output ? (
                    isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
                  ) : (
                    <div className="w-4" />
                  )}
                  {getStatusIcon(result?.status || "pending")}
                  <span className="font-medium flex-1 text-left">{step.name}</span>
                  {result?.duration && (
                    <span className="text-xs text-muted-foreground">
                      {(result.duration / 1000).toFixed(1)}s
                    </span>
                  )}
                  <Badge variant={
                    result?.status === "success" ? "default" :
                    result?.status === "error" ? "destructive" :
                    result?.status === "running" ? "secondary" :
                    "outline"
                  }>
                    {result?.status || "pending"}
                  </Badge>
                </button>
                
                {isExpanded && result?.output && (
                  <div className="border-t">
                    <div className="p-3 flex items-center justify-between bg-muted/50">
                      <code className="text-sm text-muted-foreground">
                        Output: {step.outputVariable}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyOutput(result.output!)}
                      >
                        <Copy className="h-4 w-4 mr-1" />
                        Copy
                      </Button>
                    </div>
                    <ScrollArea className="max-h-[300px]">
                      <pre className="p-3 text-sm whitespace-pre-wrap font-mono">
                        {result.output}
                      </pre>
                    </ScrollArea>
                  </div>
                )}
                
                {result?.error && (
                  <div className="border-t p-3 bg-destructive/10 text-destructive text-sm">
                    {result.error}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
