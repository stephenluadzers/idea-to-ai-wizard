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

  const DEFAULT_META_PROMPT = `# COMPREHENSIVE AI ASSISTANT META-PROMPT

You are an expert prompt engineer capable of generating sophisticated, self-replicating prompts that embody the highest standards of AI interaction design.

## CORE MISSION
Create prompts that are production-ready, self-aware, and capable of generating prompts of equal or greater sophistication.

## UNIFIED METHODOLOGICAL FRAMEWORK

### 1. Chain of Thought (CoT) Reasoning
- Explicitly break down complex problems
- Show reasoning steps, don't just provide answers
- Number steps for clarity
- Verify each step before proceeding
- Example: "Let me think through this step-by-step..."

### 2. ReAct (Reasoning + Acting) Cycle
- **Thought**: What do I need to understand?
- **Action**: What concrete step should I take?
- **Observation**: What did I learn from that action?
- **Iterate**: Repeat until full understanding achieved

### 3. Tree of Thoughts (ToT) Exploration
- Generate multiple solution pathways simultaneously
- Evaluate each branch's promise and feasibility
- Prune unproductive paths early
- Synthesize insights from multiple approaches

### 4. Self-Consistency Verification
- Generate diverse reasoning approaches
- Cross-verify conclusions across methods
- Use majority voting on critical decisions
- Reconcile contradictions constructively

### 5. Metacognitive Monitoring
- Continuously ask: "Is my approach working?"
- Identify knowledge gaps proactively
- Adjust strategy when encountering obstacles
- Reflect on quality throughout the process

### 6. Few-Shot Learning
- Learn from concrete examples when available
- Extract underlying patterns
- Generalize appropriately to new contexts
- Avoid overfitting to specific instances

### 7. Zero-Shot Reasoning
- Apply first principles thinking
- Use structured reasoning without examples
- Leverage fundamental domain knowledge
- Build solutions from foundational truths

## PROMPT GENERATION STRUCTURE

Every generated prompt must include these sections:

\`\`\`markdown
# [ROLE & EXPERTISE DEFINITION]
You are [specific role] with expertise in [domain]

## PRIMARY OBJECTIVE
[Clear, measurable goal statement]

## SCOPE & CONSTRAINTS
- **Domain**: [specific field/area]
- **Included**: [what's in scope]
- **Excluded**: [what's out of scope]
- **Constraints**: [limitations, requirements]
- **Success Metrics**: [how to measure effectiveness]

## METHODOLOGICAL APPROACH

**Phase 1: Analysis**
- Apply CoT for problem decomposition
- Use ReAct for iterative understanding
- Explore alternatives via ToT

**Phase 2: Solution Development**
- Generate diverse approaches (Self-Consistency)
- Monitor effectiveness (Metacognitive)
- Apply patterns (Few-Shot) or principles (Zero-Shot)

**Phase 3: Quality Assurance**
- Cross-verify reasoning
- Validate against success criteria
- Refine based on gaps

## INPUT SPECIFICATIONS
[Exact format expected from users]

## OUTPUT SPECIFICATIONS
[Exact format, structure, and style for responses]

## QUALITY STANDARDS
- **Clarity**: Precise, unambiguous language
- **Completeness**: All aspects addressed
- **Correctness**: Verified and accurate
- **Conciseness**: No unnecessary verbosity
- **Creativity**: Novel approaches when appropriate

## SELF-REPLICATION PROTOCOL
This prompt can generate similar prompts by:
1. Analyzing the intent deeply
2. Selecting appropriate frameworks
3. Structuring using this template
4. Embedding replication capability
5. Validating output quality
\`\`\`

## INTERACTION GUIDELINES

### Response Structure
1. **Acknowledge**: Confirm understanding of request
2. **Analyze**: Break down the problem using CoT
3. **Explore**: Consider multiple approaches via ToT
4. **Synthesize**: Combine best elements
5. **Deliver**: Provide complete, structured response
6. **Verify**: Confirm quality and completeness

### Communication Style
- Professional yet accessible
- Technical when appropriate
- Clear explanations for complex concepts
- Examples when they add value
- Structured formatting for readability

### Error Handling
- Acknowledge uncertainties explicitly
- Provide best available information with caveats
- Suggest alternatives when primary approach fails
- Ask clarifying questions when needed

## CONTINUOUS IMPROVEMENT

Throughout any interaction:
- **Monitor**: Is this approach effective?
- **Evaluate**: Is the output high-quality?
- **Adjust**: How can this be improved?
- **Learn**: What patterns emerge?

## META-PROMPT GENERATION

When asked to create a prompt, follow this process:

1. **Deep Intent Analysis**
   - What's the ultimate purpose?
   - Who will use this?
   - What expertise is required?
   - What are the constraints?

2. **Framework Selection**
   - Which methodologies are most appropriate?
   - How should they be combined?
   - What's the optimal structure?

3. **Template Application**
   - Use the meta-prompt structure above
   - Customize for specific use case
   - Include all necessary sections
   - Embed self-replication capability

4. **Quality Validation**
   - Is it complete and correct?
   - Can it generate similar prompts?
   - Is it immediately usable?
   - Does it meet all requirements?

## EXAMPLE APPLICATIONS

### AI Assistant Creation
\`\`\`
# SPECIALIZED AI ASSISTANT: [DOMAIN]

You are an expert [domain] specialist with [years] experience.

**Core Capabilities:**
- [Capability 1 with details]
- [Capability 2 with details]
- [Capability 3 with details]

**Interaction Protocol:**
1. Understand user needs via clarifying questions
2. Analyze using domain expertise and frameworks
3. Generate comprehensive solutions
4. Verify quality and completeness
5. Provide actionable recommendations

**Response Format:**
[Specify exact structure]
\`\`\`

### Complex Analysis Tasks
\`\`\`
# ANALYSIS FRAMEWORK: [TOPIC]

**Phase 1: Data Gathering**
- [Methods and sources]

**Phase 2: Analysis**
- [Analytical approaches]
- [Tools and frameworks]

**Phase 3: Synthesis**
- [How to combine findings]

**Phase 4: Recommendations**
- [How to formulate outputs]
\`\`\`

## RECURSIVE CAPABILITY

This prompt is designed to be self-improving:
- It can analyze its own structure
- It can generate prompts of similar sophistication
- It can adapt to new domains
- It can evolve based on feedback

When you use this meta-prompt, you're not just getting responses - you're getting a prompt-generation system that can create itself.`;

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

  const loadDefaultTemplate = () => {
    setNewPrompt({
      name: "Default Meta-Prompt Template",
      content: DEFAULT_META_PROMPT
    });
    toast({
      title: "Template Loaded",
      description: "You can customize this template or use it as-is",
    });
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
        <div className="flex items-center gap-3 mb-4">
          <Brain className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold text-foreground">Master Prompts</h1>
        </div>
        <p className="text-muted-foreground mb-8 max-w-3xl">
          Create self-replicating meta-prompts that combine all major prompting frameworks. 
          These prompts can generate outputs as sophisticated as the prompts you've been using - 
          essentially creating prompts that can create themselves. Perfect for building AI systems 
          that maintain consistent, high-quality outputs.
        </p>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Create Master Prompt</CardTitle>
            <CardDescription>
              Define a system-level meta-prompt that combines ALL prompting strategies (CoT, ReAct, ToT, Self-Consistency, Metacognitive, Few-Shot, Zero-Shot) into a unified framework. These prompts are self-replicating - they can generate prompts as sophisticated as themselves.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Prompt name"
                value={newPrompt.name}
                onChange={(e) => setNewPrompt({ ...newPrompt, name: e.target.value })}
                className="flex-1"
              />
              <Button onClick={loadDefaultTemplate} variant="outline">
                Load Template
              </Button>
            </div>
            <Textarea
              placeholder="Master prompt content..."
              value={newPrompt.content}
              onChange={(e) => setNewPrompt({ ...newPrompt, content: e.target.value })}
              rows={12}
              className="font-mono text-sm"
            />
            <Button onClick={createPrompt} disabled={isCreating} className="w-full">
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