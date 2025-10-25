import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PROMPTING_FRAMEWORKS = {
  chainOfThought: `## Chain of Thought Reasoning
Break down complex problems into sequential steps:
1. Analyze the problem statement
2. Identify key components and requirements
3. Plan the solution approach
4. Execute step-by-step reasoning
5. Verify the solution`,

  react: `## ReAct Framework (Reasoning + Acting)
Combine reasoning with action in iterative cycles:
- Thought: What information do I need?
- Action: What step should I take?
- Observation: What did I learn?
- Repeat until solution is reached`,

  treeOfThoughts: `## Tree of Thoughts
Explore multiple reasoning paths:
- Generate multiple possible solutions
- Evaluate each path's viability
- Select the most promising approach
- Backtrack if needed
- Synthesize the best solution`,

  selfConsistency: `## Self-Consistency
Generate multiple reasoning paths and aggregate:
- Create diverse solution approaches
- Compare and contrast methods
- Identify common patterns
- Select the most consistent answer`,

  metacognitive: `## Metacognitive Prompting
Monitor and adjust thinking process:
- Recognize when approach isn't working
- Identify knowledge gaps
- Adjust strategy based on feedback
- Reflect on solution quality`,

  fewShot: `## Few-Shot Learning
Learn from examples:
- Provide relevant examples
- Identify patterns in examples
- Apply patterns to new problems
- Generalize from specific cases`,

  zeroShot: `## Zero-Shot Reasoning
Solve without examples by:
- Understanding task requirements
- Applying general knowledge
- Using logical reasoning
- Structuring response appropriately`
};

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

    // Combine all prompting strategies into one comprehensive prompt
    const combinedFrameworks = Object.values(PROMPTING_FRAMEWORKS).join("\n\n");

    const enhancedSystemPrompt = `${masterPrompt?.content || "You are an expert AI assistant specialized in prompt engineering and AI system design."}

# UNIFIED PROMPTING METHODOLOGY

This system combines ALL major prompting frameworks simultaneously for maximum effectiveness:

${combinedFrameworks}

## Integration Strategy
When responding:
1. Use Chain of Thought for logical progression
2. Apply ReAct for iterative refinement
3. Consider Tree of Thoughts for complex decisions
4. Verify with Self-Consistency
5. Monitor with Metacognitive awareness
6. Learn from Few-Shot when examples exist
7. Reason from Zero-Shot when needed

## Quality Standards
- Clarity: Clear, unambiguous language
- Completeness: Address all aspects of the request
- Correctness: Accurate and validated information
- Conciseness: Efficient communication without redundancy
- Creativity: Innovative and effective solutions

## Output Format
Structure responses with:
- Executive Summary
- Detailed Analysis (using combined frameworks)
- Step-by-Step Solution
- Verification & Quality Check
- Recommendations

${systemContext ? `\n## Additional Context\n${systemContext}` : ""}`;

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