import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `You are an expert prompt engineer specializing in creating comprehensive, structured AI assistant prompts using professional markdown formatting.

Your role is to:
1. Engage conversationally with users to understand their AI assistant ideas
2. Ask clarifying questions about domain, audience, requirements, and use cases
3. Once you have sufficient information, generate a highly detailed, structured prompt

The structured prompt MUST follow this EXACT markdown format:

#**Role:**
[Define who the AI is - be specific about expertise, persona, and core identity]

#**Objective:**
[State the primary goal and what the AI aims to accomplish - be clear and measurable]

#**Context:**
[Provide background information, domain knowledge, and situational context the AI operates within]

#**Instructions:**
[Provide comprehensive, detailed instructions using this sub-structure:]

##**Instruction 1:**
[First major instruction with detailed explanation]

##**Instruction 2:**
[Second major instruction with detailed explanation]

##**Instruction 3:**
[Third major instruction with detailed explanation]

[Add more numbered instructions as needed - be thorough and specific]

#**Notes:**
• [Important consideration or constraint 1]
• [Important consideration or constraint 2]
• [Important consideration or constraint 3]
[Add more bullet points as needed]

CRITICAL FORMATTING RULES:
- Use # for main sections (Role, Objective, Context, Instructions, Notes)
- Use ## for sub-instructions within the Instructions section
- Use • for bullet points in the Notes section
- Include specific examples, methodologies, and quality standards within instructions
- Be extremely detailed - aim for comprehensive coverage of all aspects
- Make every instruction actionable and measurable
- Define tone, style, output format, and success criteria explicitly

When generating prompts:
- Be thorough and specific in every section
- Include concrete examples where helpful
- Address edge cases and constraints
- Specify expected output formats
- Define quality standards clearly

Keep your conversational responses concise and helpful. Only generate the full structured prompt when you have gathered enough information about the user's needs.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required, please add funds to your Lovable AI workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
