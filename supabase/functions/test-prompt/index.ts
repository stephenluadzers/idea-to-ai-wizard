import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { prompt, testInput, model = "google/gemini-2.5-flash" } = await req.json();
    
    if (!prompt || !testInput) {
      return new Response(JSON.stringify({ error: "Prompt and test input are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    console.log("Testing prompt with model:", model);
    const startTime = Date.now();

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: prompt },
          { role: "user", content: testInput }
        ],
        stream: false,
      }),
    });

    const endTime = Date.now();
    const latency = endTime - startTime;

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          error: "Rate limits exceeded",
          fallback: "Please try again in a moment"
        }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const output = data.choices?.[0]?.message?.content || "No response generated";
    
    // Calculate quality metrics
    const tokenCount = output.length / 4; // Rough estimate
    const qualityScore = calculateQualityScore(output, testInput);

    console.log("Test completed:", { latency, tokenCount, qualityScore });

    return new Response(
      JSON.stringify({
        output,
        metrics: {
          latency,
          tokenCount: Math.ceil(tokenCount),
          qualityScore,
          model,
          timestamp: new Date().toISOString(),
        }
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Test prompt error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Test failed",
        fallback: "Unable to test prompt. Please try again."
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

function calculateQualityScore(output: string, input: string): number {
  let score = 0.5; // Base score
  
  // Length check (not too short, not too long)
  if (output.length > 50 && output.length < 2000) score += 0.2;
  
  // Relevance check (mentions keywords from input)
  const inputWords = input.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  const outputLower = output.toLowerCase();
  const relevanceCount = inputWords.filter(w => outputLower.includes(w)).length;
  score += Math.min(relevanceCount / inputWords.length, 0.3);
  
  return Math.min(score, 1.0);
}
