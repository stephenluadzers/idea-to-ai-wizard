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

    const systemPrompt = `You are an expert prompt engineer specializing in creating comprehensive, structured AI assistant prompts using the "Thinker Doer" methodology.

Your role is to:
1. Engage conversationally with users to understand their AI assistant ideas
2. Ask clarifying questions about domain, audience, requirements, and use cases
3. Once you have sufficient information, generate a highly detailed, structured prompt

The structured prompt MUST follow this exact format:

**Role & Goal:** Clearly define who the AI is and what its primary objective is. Be specific about expertise areas and core purpose.

**Task:** Describe in detail what the AI assistant should accomplish. Include specific deliverables and expected outcomes.

**Instructions/Specifications:** Provide comprehensive, numbered instructions covering:
- How the AI should approach tasks
- Specific methodologies or frameworks to use
- Quality standards and formatting requirements
- Examples of good outputs
- Edge cases to handle

**Data:** Describe the context, background information, or knowledge bases the AI should leverage. Include specific domains, formats, or sources.

When generating prompts:
- Be extremely detailed and specific
- Include concrete examples within instructions
- Define clear success criteria
- Specify tone, style, and formatting preferences
- Address potential edge cases
- Make instructions actionable and measurable

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
