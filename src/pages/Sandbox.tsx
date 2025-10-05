import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Play, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function Sandbox() {
  const [prompt, setPrompt] = useState("");
  const [testInput, setTestInput] = useState("");
  const [model, setModel] = useState("google/gemini-2.5-flash");
  const [result, setResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleTest = async () => {
    if (!prompt || !testInput) {
      toast.error("Please provide both prompt and test input");
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("test-prompt", {
        body: { prompt, testInput, model },
      });

      if (error) throw error;
      setResult(data);
      toast.success("Test completed");
    } catch (error) {
      console.error("Test error:", error);
      toast.error("Test failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container max-w-7xl py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Testing Sandbox</h1>
        <p className="text-muted-foreground">Test prompts with sample inputs before deployment</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Test Configuration</h2>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="model">AI Model</Label>
                <Select value={model} onValueChange={setModel}>
                  <SelectTrigger id="model">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="google/gemini-2.5-flash">Gemini 2.5 Flash</SelectItem>
                    <SelectItem value="google/gemini-2.5-pro">Gemini 2.5 Pro</SelectItem>
                    <SelectItem value="openai/gpt-5-mini">GPT-5 Mini</SelectItem>
                    <SelectItem value="openai/gpt-5">GPT-5</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="prompt">System Prompt</Label>
                <Textarea
                  id="prompt"
                  placeholder="Enter your system prompt here..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="min-h-[200px] font-mono text-sm"
                />
              </div>

              <div>
                <Label htmlFor="testInput">Test Input</Label>
                <Textarea
                  id="testInput"
                  placeholder="Enter test input to send to the AI..."
                  value={testInput}
                  onChange={(e) => setTestInput(e.target.value)}
                  className="min-h-[120px]"
                />
              </div>

              <Button
                onClick={handleTest}
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Running Test...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Run Test
                  </>
                )}
              </Button>
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Test Results</h2>
            
            {!result ? (
              <div className="text-center py-12 text-muted-foreground">
                <Play className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>Run a test to see results</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Performance Metrics</Label>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    <div className="bg-muted p-3 rounded text-center">
                      <div className="text-2xl font-bold">{result.metrics.latency}ms</div>
                      <div className="text-xs text-muted-foreground">Latency</div>
                    </div>
                    <div className="bg-muted p-3 rounded text-center">
                      <div className="text-2xl font-bold">{result.metrics.tokenCount}</div>
                      <div className="text-xs text-muted-foreground">Tokens</div>
                    </div>
                    <div className="bg-muted p-3 rounded text-center">
                      <div className="text-2xl font-bold">{(result.metrics.qualityScore * 100).toFixed(0)}%</div>
                      <div className="text-xs text-muted-foreground">Quality</div>
                    </div>
                  </div>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">AI Output</Label>
                  <div className="mt-2 bg-muted/50 p-4 rounded max-h-[400px] overflow-y-auto">
                    <pre className="whitespace-pre-wrap text-sm">{result.output}</pre>
                  </div>
                </div>

                <div className="text-xs text-muted-foreground">
                  Model: {result.metrics.model} • Tested: {new Date(result.metrics.timestamp).toLocaleString()}
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
