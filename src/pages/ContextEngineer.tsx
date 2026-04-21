import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Layers, Copy, Download, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ContextFields {
  role: string;
  task: string;
  context: string;
  constraints: string;
  examples: string;
  outputFormat: string;
}

const SECTIONS: Array<{
  key: keyof ContextFields;
  label: string;
  description: string;
  placeholder: string;
}> = [
  {
    key: "role",
    label: "1. Role",
    description: "Who the AI is. Identity, expertise, persona.",
    placeholder: "You are a senior product strategist with 15 years of experience in B2B SaaS...",
  },
  {
    key: "task",
    label: "2. Task",
    description: "The specific job to accomplish. Action-oriented and unambiguous.",
    placeholder: "Analyze the user's product idea and produce a go-to-market plan...",
  },
  {
    key: "context",
    label: "3. Context",
    description: "Background information, situation, relevant facts, audience.",
    placeholder: "The user is a solo founder targeting mid-market companies in healthcare...",
  },
  {
    key: "constraints",
    label: "4. Constraints",
    description: "Rules, boundaries, what NOT to do, length limits, tone.",
    placeholder: "- Do not recommend any tactics that require >$10k budget\n- Avoid jargon\n- Stay under 600 words",
  },
  {
    key: "examples",
    label: "5. Examples",
    description: "Few-shot demonstrations of input → ideal output.",
    placeholder: "Example input: 'AI tool for dentists'\nExample output: 'Phase 1 — niche down to orthodontists...'",
  },
  {
    key: "outputFormat",
    label: "6. Output Format",
    description: "Exact structure of the response (markdown, JSON, sections, headings).",
    placeholder: "Respond in markdown with these sections:\n## Summary\n## Recommendations (numbered)\n## Risks",
  },
];

const ContextEngineer = () => {
  const [fields, setFields] = useState<ContextFields>({
    role: "",
    task: "",
    context: "",
    constraints: "",
    examples: "",
    outputFormat: "",
  });
  const [generated, setGenerated] = useState("");
  const { toast } = useToast();

  const update = (key: keyof ContextFields, value: string) =>
    setFields((p) => ({ ...p, [key]: value }));

  const generate = () => {
    if (!fields.role.trim() || !fields.task.trim()) {
      toast({
        title: "Role and Task are required",
        description: "Fill in at least the Role and Task sections.",
        variant: "destructive",
      });
      return;
    }

    const sections: string[] = [];
    sections.push(`# Role\n${fields.role.trim()}`);
    sections.push(`# Task\n${fields.task.trim()}`);
    if (fields.context.trim()) sections.push(`# Context\n${fields.context.trim()}`);
    if (fields.constraints.trim()) sections.push(`# Constraints\n${fields.constraints.trim()}`);
    if (fields.examples.trim()) sections.push(`# Examples\n${fields.examples.trim()}`);
    if (fields.outputFormat.trim()) sections.push(`# Output Format\n${fields.outputFormat.trim()}`);

    setGenerated(sections.join("\n\n"));
    toast({ title: "Prompt assembled", description: "Your context-engineered prompt is ready." });
  };

  const copy = () => {
    navigator.clipboard.writeText(generated);
    toast({ title: "Copied", description: "Prompt copied to clipboard." });
  };

  const download = () => {
    const blob = new Blob([generated], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "context-engineered-prompt.md";
    a.click();
    URL.revokeObjectURL(url);
  };

  const loadExample = () => {
    setFields({
      role: "You are a senior technical writer specializing in developer documentation for API-first products.",
      task: "Rewrite the user's draft API reference entry so it is clear, complete, and follows our style guide.",
      context:
        "Audience: backend engineers integrating our REST API for the first time. They skim docs and copy-paste code. The product is a payments gateway.",
      constraints:
        "- Use second person ('you')\n- No marketing language\n- Every endpoint must show one curl example and one JSON response\n- Keep each description under 3 sentences",
      examples:
        "Input: 'POST /charges - creates a charge'\nOutput:\n### POST /charges\nCreate a new charge against a customer's saved payment method.\n\n```bash\ncurl -X POST https://api.example.com/v1/charges \\\n  -H 'Authorization: Bearer $KEY' \\\n  -d amount=2000 -d currency=usd\n```",
      outputFormat:
        "Markdown. For each endpoint:\n### METHOD /path\nOne-line summary.\nDescription (≤3 sentences).\n**Request** (curl block)\n**Response** (json block)\n**Errors** (table)",
    });
    toast({ title: "Example loaded", description: "Edit the fields, then generate." });
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-2">
          <Layers className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold text-foreground">Context Engineer</h1>
          <Badge variant="secondary">6-part Anthropic-style</Badge>
        </div>
        <p className="text-muted-foreground mb-8 max-w-3xl">
          Build prompts using the classic context-engineering structure: Role · Task · Context ·
          Constraints · Examples · Output Format. Each section is engineered independently, then
          assembled into a production-ready prompt.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Sections</CardTitle>
                  <CardDescription>Engineer each part of the context.</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={loadExample}>
                  Load Example
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              {SECTIONS.map((s) => (
                <div key={s.key} className="space-y-2">
                  <Label className="text-sm font-medium">{s.label}</Label>
                  <p className="text-xs text-muted-foreground">{s.description}</p>
                  {s.key === "role" ? (
                    <Input
                      value={fields[s.key]}
                      onChange={(e) => update(s.key, e.target.value)}
                      placeholder={s.placeholder}
                    />
                  ) : (
                    <Textarea
                      value={fields[s.key]}
                      onChange={(e) => update(s.key, e.target.value)}
                      placeholder={s.placeholder}
                      rows={s.key === "examples" || s.key === "outputFormat" ? 5 : 3}
                      className="font-mono text-sm"
                    />
                  )}
                </div>
              ))}
              <Button onClick={generate} className="w-full">
                <Sparkles className="w-4 h-4 mr-2" />
                Assemble Prompt
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Generated Prompt</CardTitle>
              <CardDescription>
                Six sections combined into a single context-engineered prompt.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {generated ? (
                <div className="space-y-4">
                  <pre className="bg-muted p-4 rounded-lg text-sm overflow-auto max-h-[600px] font-mono whitespace-pre-wrap leading-relaxed">
                    {generated}
                  </pre>
                  <Separator />
                  <div className="flex gap-2">
                    <Button variant="secondary" size="sm" onClick={copy} className="flex-1">
                      <Copy className="w-4 h-4 mr-2" />
                      Copy
                    </Button>
                    <Button variant="secondary" size="sm" onClick={download} className="flex-1">
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-16 text-muted-foreground">
                  <Layers className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-2">Nothing assembled yet</p>
                  <p className="text-sm">Fill in Role and Task, then assemble.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ContextEngineer;
