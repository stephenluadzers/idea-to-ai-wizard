import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Layers, Copy, Download, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SixPartFields {
  role: string;
  task: string;
  context: string;
  constraints: string;
  examples: string;
  outputFormat: string;
}

interface FiveLayerFields {
  identity: string;
  world: string;
  task: string;
  example: string;
  constraint: string;
}

const SIX_PART: Array<{ key: keyof SixPartFields; label: string; description: string; placeholder: string }> = [
  { key: "role", label: "1. Role", description: "Who the AI is. Identity, expertise, persona.", placeholder: "You are a senior product strategist..." },
  { key: "task", label: "2. Task", description: "The specific job. Action-oriented and unambiguous.", placeholder: "Analyze the user's product idea and produce..." },
  { key: "context", label: "3. Context", description: "Background, situation, relevant facts, audience.", placeholder: "Solo founder targeting mid-market healthcare..." },
  { key: "constraints", label: "4. Constraints", description: "Rules, boundaries, what NOT to do, tone.", placeholder: "- No tactics requiring >$10k budget\n- Avoid jargon" },
  { key: "examples", label: "5. Examples", description: "Few-shot demonstrations of input → ideal output.", placeholder: "Example input: ...\nExample output: ..." },
  { key: "outputFormat", label: "6. Output Format", description: "Exact response structure (markdown, JSON, sections).", placeholder: "Markdown with:\n## Summary\n## Recommendations" },
];

const FIVE_LAYERS: Array<{ key: keyof FiveLayerFields; label: string; description: string; placeholder: string }> = [
  { key: "identity", label: "Layer 1 — Identity Context", description: "Who is the AI acting as? Lineage, expertise, worldview — beyond a job title.", placeholder: "A 20-year veteran trial lawyer who teaches negotiation at Harvard Law..." },
  { key: "world", label: "Layer 2 — World Context", description: "What does the AI need to know about your situation, business, audience?", placeholder: "Bootstrapped B2B SaaS, $2M ARR, churn problem in SMB segment, sales-led..." },
  { key: "task", label: "Layer 3 — Task Context", description: "What exactly needs to happen? The deliverable and its scope.", placeholder: "Draft a 90-day churn-reduction playbook with weekly milestones..." },
  { key: "example", label: "Layer 4 — Example Context", description: "What does GREAT output look like? What does BAD output look like?", placeholder: "GREAT: specific tactics tied to metrics, e.g. 'NPS survey at day 14...'\nBAD: generic advice like 'improve onboarding'" },
  { key: "constraint", label: "Layer 5 — Constraint Context", description: "What are the boundaries, rules, non-negotiables?", placeholder: "- Never recommend layoffs\n- Stay GDPR-compliant\n- No tactics requiring eng work >2 weeks" },
];

const ContextEngineer = () => {
  const [mode, setMode] = useState<"5layers" | "6part">("5layers");
  const [six, setSix] = useState<SixPartFields>({ role: "", task: "", context: "", constraints: "", examples: "", outputFormat: "" });
  const [five, setFive] = useState<FiveLayerFields>({ identity: "", world: "", task: "", example: "", constraint: "" });
  const [generated, setGenerated] = useState("");
  const { toast } = useToast();

  const generate = () => {
    const sections: string[] = [];

    if (mode === "5layers") {
      if (!five.identity.trim() || !five.task.trim()) {
        toast({ title: "Identity and Task are required", description: "Fill in at least Identity Context and Task Context.", variant: "destructive" });
        return;
      }
      sections.push(`# THE 5 LAYERS OF CONTEXT\n`);
      sections.push(`## Layer 1 — Identity Context\n${five.identity.trim()}`);
      sections.push(`## Layer 2 — World Context\n${five.world.trim() || "_(not specified)_"}`);
      sections.push(`## Layer 3 — Task Context\n${five.task.trim()}`);
      sections.push(`## Layer 4 — Example Context\n${five.example.trim() || "_(not specified)_"}`);
      sections.push(`## Layer 5 — Constraint Context\n${five.constraint.trim() || "_(not specified)_"}`);
    } else {
      if (!six.role.trim() || !six.task.trim()) {
        toast({ title: "Role and Task are required", description: "Fill in at least Role and Task.", variant: "destructive" });
        return;
      }
      sections.push(`# Role\n${six.role.trim()}`);
      sections.push(`# Task\n${six.task.trim()}`);
      if (six.context.trim()) sections.push(`# Context\n${six.context.trim()}`);
      if (six.constraints.trim()) sections.push(`# Constraints\n${six.constraints.trim()}`);
      if (six.examples.trim()) sections.push(`# Examples\n${six.examples.trim()}`);
      if (six.outputFormat.trim()) sections.push(`# Output Format\n${six.outputFormat.trim()}`);
    }

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
    if (mode === "5layers") {
      setFive({
        identity: "A 20-year veteran growth advisor who has scaled three B2B SaaS companies past $50M ARR. Mentored at YC. Skeptical of vanity metrics, biased toward durable revenue.",
        world: "Bootstrapped vertical SaaS for dental practices, $2M ARR, 8% monthly logo churn in single-location practices. Sales-led, 2-person founding team. No marketing hire.",
        task: "Produce a 90-day churn-reduction playbook with weekly milestones, owner per task, and a leading-indicator metric for each week.",
        example: "GREAT: 'Week 2 — Ship an NPS survey at day 14 of onboarding (owner: CEO). Leading indicator: response rate >40%.'\nBAD: 'Improve onboarding to reduce churn.' — vague, no owner, no metric, no timeline.",
        constraint: "- Never recommend layoffs or price cuts\n- All tactics must be executable by a 2-person team\n- Stay HIPAA-compliant\n- No tactics requiring eng work >2 weeks\n- Output must fit on one page printed",
      });
    } else {
      setSix({
        role: "You are a senior technical writer specializing in developer documentation for API-first products.",
        task: "Rewrite the user's draft API reference entry so it is clear, complete, and follows our style guide.",
        context: "Audience: backend engineers integrating our REST API for the first time. They skim docs and copy-paste code. The product is a payments gateway.",
        constraints: "- Use second person ('you')\n- No marketing language\n- Every endpoint must show one curl example and one JSON response\n- Keep each description under 3 sentences",
        examples: "Input: 'POST /charges - creates a charge'\nOutput:\n### POST /charges\nCreate a new charge against a customer's saved payment method.",
        outputFormat: "Markdown. For each endpoint: ### METHOD /path, summary, description, **Request**, **Response**, **Errors**.",
      });
    }
    toast({ title: "Example loaded", description: "Edit the fields, then assemble." });
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-2 flex-wrap">
          <Layers className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold text-foreground">Context Engineer</h1>
          <Badge variant="secondary">5 Layers</Badge>
          <Badge variant="secondary">6-part Anthropic</Badge>
        </div>
        <p className="text-muted-foreground mb-6 max-w-3xl">
          Engineer prompts using either the <strong>5 Layers of Context</strong> (Identity · World · Task · Example · Constraint)
          or the classic <strong>6-part Anthropic structure</strong>. Both frameworks are also automatically embedded into
          every prompt generated by the Prompt Designer.
        </p>

        <Tabs value={mode} onValueChange={(v) => setMode(v as "5layers" | "6part")} className="mb-6">
          <TabsList>
            <TabsTrigger value="5layers">5 Layers of Context</TabsTrigger>
            <TabsTrigger value="6part">6-part Framework</TabsTrigger>
          </TabsList>

          <TabsContent value="5layers" className="mt-0" />
          <TabsContent value="6part" className="mt-0" />
        </Tabs>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{mode === "5layers" ? "The 5 Layers" : "Sections"}</CardTitle>
                  <CardDescription>
                    {mode === "5layers"
                      ? "Engineer each layer of context the AI needs."
                      : "Engineer each part of the context."}
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={loadExample}>Load Example</Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              {mode === "5layers"
                ? FIVE_LAYERS.map((s) => (
                    <div key={s.key} className="space-y-2">
                      <Label className="text-sm font-medium">{s.label}</Label>
                      <p className="text-xs text-muted-foreground">{s.description}</p>
                      <Textarea
                        value={five[s.key]}
                        onChange={(e) => setFive((p) => ({ ...p, [s.key]: e.target.value }))}
                        placeholder={s.placeholder}
                        rows={s.key === "example" || s.key === "constraint" ? 5 : 3}
                        className="font-mono text-sm"
                      />
                    </div>
                  ))
                : SIX_PART.map((s) => (
                    <div key={s.key} className="space-y-2">
                      <Label className="text-sm font-medium">{s.label}</Label>
                      <p className="text-xs text-muted-foreground">{s.description}</p>
                      {s.key === "role" ? (
                        <Input
                          value={six[s.key]}
                          onChange={(e) => setSix((p) => ({ ...p, [s.key]: e.target.value }))}
                          placeholder={s.placeholder}
                        />
                      ) : (
                        <Textarea
                          value={six[s.key]}
                          onChange={(e) => setSix((p) => ({ ...p, [s.key]: e.target.value }))}
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
                {mode === "5layers" ? "Five layers" : "Six sections"} combined into a single context-engineered prompt.
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
                      <Copy className="w-4 h-4 mr-2" />Copy
                    </Button>
                    <Button variant="secondary" size="sm" onClick={download} className="flex-1">
                      <Download className="w-4 h-4 mr-2" />Download
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-16 text-muted-foreground">
                  <Layers className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-2">Nothing assembled yet</p>
                  <p className="text-sm">
                    {mode === "5layers"
                      ? "Fill in Identity and Task Context, then assemble."
                      : "Fill in Role and Task, then assemble."}
                  </p>
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
