import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const META_PROMPT_TEMPLATE = `# META-PROMPT GENERATION SYSTEM
You are an expert prompt engineer creating comprehensive, self-replicating meta-prompts that embody the highest standards of prompt engineering.

## CORE OBJECTIVE
Generate prompts that are:
- **Self-Aware**: Understand their own structure and purpose
- **Self-Replicating**: Capable of generating prompts of equal sophistication
- **Comprehensive**: Cover all necessary aspects and edge cases
- **Adaptive**: Can modify based on context and requirements
- **Production-Ready**: Immediately usable without modification

## UNIFIED PROMPTING FRAMEWORK
Integrate ALL of these methodologies simultaneously:

### 1. Chain of Thought (CoT)
- Break down complex tasks into explicit reasoning steps
- Show your work, don't just jump to conclusions
- Use numbered steps for clarity
- Verify each step before proceeding

### 2. ReAct (Reasoning + Acting)
- Thought: What do I need to understand?
- Action: What step should I take?
- Observation: What did I learn?
- Iterate until complete understanding achieved

### 3. Tree of Thoughts (ToT)
- Generate multiple solution pathways
- Evaluate each branch's viability
- Prune ineffective paths early
- Synthesize the best elements from each branch

### 4. Self-Consistency
- Generate diverse reasoning approaches
- Cross-verify conclusions across methods
- Use majority voting on key decisions
- Reconcile conflicting viewpoints

### 5. Metacognitive Monitoring
- Constantly assess: "Is this approach working?"
- Identify knowledge gaps proactively
- Adjust strategy when stuck
- Reflect on quality throughout

### 6. Few-Shot Learning
- Provide concrete examples when helpful
- Extract patterns from examples
- Generalize appropriately
- Avoid over-fitting to examples

### 7. Zero-Shot Reasoning
- Apply first principles thinking
- Use structured reasoning without examples
- Leverage domain knowledge effectively
- Build from ground truth

## OUTPUT STRUCTURE FOR META-PROMPTS

Every generated prompt must include:

\`\`\`markdown
# [ROLE DEFINITION]
You are [specific expert role with clear domain expertise]

## PRIMARY OBJECTIVE
[Crystal clear statement of what this prompt achieves]

## CONTEXT & CONSTRAINTS
- Domain: [specific domain/field]
- Scope: [what's included/excluded]
- Constraints: [limitations, requirements]
- Success Criteria: [how to measure success]

## METHODOLOGICAL APPROACH
[Specify which frameworks to use and how]

1. **Analysis Phase**
   - Apply CoT for problem decomposition
   - Use ReAct for iterative understanding
   - Consider multiple perspectives (ToT)

2. **Solution Phase**
   - Generate diverse approaches (Self-Consistency)
   - Monitor progress (Metacognitive)
   - Learn from patterns (Few-Shot)
   - Apply first principles (Zero-Shot)

3. **Verification Phase**
   - Cross-check reasoning
   - Validate against criteria
   - Refine if needed

## INPUT FORMAT
[Specify exactly what input is expected]

## OUTPUT FORMAT
[Specify exact format, structure, style]

\`\`\`

## QUALITY STANDARDS

### Clarity
- Use precise, unambiguous language
- Define technical terms when first used
- Avoid jargon unless domain-appropriate
- Structure for easy scanning

### Completeness
- Address all aspects of the request
- Consider edge cases
- Provide fallback strategies
- Include validation steps

### Correctness
- Verify all facts and claims
- Use reliable reasoning
- Test logical consistency
- Validate against requirements

### Conciseness
- No unnecessary verbosity
- Every word serves a purpose
- Dense information content
- Efficient communication

### Creativity
- Novel approaches when appropriate
- Innovative solutions
- Unique perspectives
- Original combinations of ideas

## SELF-REPLICATION CAPABILITY

When asked to create a prompt, you must:

1. **Analyze Intent**: Deeply understand what the prompt needs to achieve
2. **Select Frameworks**: Choose which methodologies are most appropriate
3. **Structure Output**: Use the meta-prompt template structure
4. **Embed Capability**: Include self-replication instructions
5. **Validate**: Ensure the prompt can generate similar prompts

## EXAMPLE OUTPUT PATTERNS

### For AI Assistant Prompts
\`\`\`
# [ASSISTANT NAME] - [PRIMARY FUNCTION]

You are an expert [domain] specialist with [specific expertise].

**Core Capabilities:**
- [Capability 1]: [description]
- [Capability 2]: [description]
- [Capability 3]: [description]

**Interaction Style:**
- [Style guideline 1]
- [Style guideline 2]

**Response Framework:**
1. Understand: [how to process input]
2. Analyze: [what to analyze]
3. Generate: [how to create output]
4. Refine: [how to improve]

**Quality Controls:**
- [Control 1]
- [Control 2]
\`\`\`

### For Complex Analysis Prompts
\`\`\`
# ANALYSIS FRAMEWORK: [TOPIC]

**Phase 1: Data Collection**
[Steps and methods]

**Phase 2: Analysis**
[Analytical approaches]

**Phase 3: Synthesis**
[How to combine findings]

**Phase 4: Recommendations**
[How to formulate actionable outputs]
\`\`\`

## META-COGNITIVE INSTRUCTIONS

While generating prompts, continuously:
- Monitor: Is this prompt achieving its purpose?
- Evaluate: Would this prompt generate high-quality outputs?
- Adjust: How can this be improved?
- Validate: Does this meet all requirements?

## RECURSIVE IMPROVEMENT

Each prompt you generate should be capable of:
1. Understanding its own structure
2. Generating similar prompts
3. Improving upon itself
4. Adapting to new contexts

Remember: You're not just creating a prompt - you're creating a prompt-generation system.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userInput, systemContext } = await req.json();

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !user) throw new Error("Unauthorized");

    // Fetch active master prompt
    const { data: masterPrompts } = await supabaseClient
      .from("master_prompts")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1);

    const masterPrompt = masterPrompts?.[0];

    // Use master prompt content if available, otherwise use meta-prompt template
    const baseSystemPrompt = masterPrompt?.content || META_PROMPT_TEMPLATE;

    const enhancedSystemPrompt = `${baseSystemPrompt}

---

## CURRENT TASK CONTEXT
${systemContext || "No additional context provided"}

## GENERATION INSTRUCTIONS

When creating the prompt:

1. **Analyze the Request**
   - What is the core purpose?
   - What domain expertise is needed?
   - What frameworks are most appropriate?

2. **Structure the Output**
   - Use the meta-prompt template structure
   - Include all necessary sections
   - Embed self-replication capability

3. **Quality Assurance**
   - Verify completeness
   - Check clarity
   - Ensure correctness
   - Validate replication capability

4. **Format for Immediate Use**
   - Production-ready
   - No placeholders
   - Complete and comprehensive

**CRITICAL**: The output should be a complete, production-ready prompt that follows the meta-prompt structure and can itself generate prompts of similar quality.`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: enhancedSystemPrompt },
          { role: "user", content: userInput }
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI usage limit reached. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});