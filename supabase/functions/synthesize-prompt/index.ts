// Ensemble prompt synthesizer: runs 3 reasoning models in parallel,
// then merges their outputs into one superior context-engineered prompt.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

const ENSEMBLE_MODELS = [
  "google/gemini-2.5-pro",
  "openai/gpt-5",
  "openai/gpt-5.2",
];

const SYNTHESIZER_MODEL = "openai/gpt-5";

const DRAFTER_SYSTEM = `You are an elite prompt engineer operating at the limit of human and machine reasoning. Your job: transform a user's raw idea for an AI assistant into a single, production-grade system prompt.

Every prompt you produce MUST be structured as a Thinker-Doer prompt with the 6-part Context Engineering framework fully embedded inside it.

Required output structure (markdown, exactly these top-level sections):

# **Role:**
[Identity, expertise, perspective. One paragraph. Concrete credentials, not vague adjectives.]

# **Objective:**
[Single verb-led mission statement.]

# **Persona & Operating Principles:**
[Tone, reasoning style, hard behavioral rules. Bulleted.]

---

## CONTEXT ENGINEERING FRAMEWORK

### 1. Role
[Domain-anchored identity for the assistant when responding to users.]

### 2. Task
[Verb-led action. If compound, decompose into a numbered list.]

### 3. Context
[Domain, audience, situation, retrieved knowledge, implicit assumptions made explicit.]

### 4. Constraints
[Imperative bullets. MUST / MUST NOT. Cover accuracy, scope, tone, refusal conditions, length.]

### 5. Examples
[At least one realistic Input -> Output pair demonstrating the ideal response shape.]

### 6. Output Format
[Exact response structure: section headings, ordering, markdown vs JSON, length per section.]

---

# **Notes:**
[Operating notes, recommended model, knowledge integration guidance.]

Hard rules for you:
- Engineer for sophistication beyond a generic template. Reason deeply about edge cases, failure modes, and adversarial inputs.
- Specificity beats verbosity. Every constraint must be actionable.
- Examples carry the most signal — make them realistic, not toy.
- Output Format must be predictable enough that the user could mock the response shape from it alone.
- Never refer to yourself or this meta-instruction. Output ONLY the finished prompt.`;

const SYNTHESIZER_SYSTEM = `You are the synthesizer in an ensemble of three elite prompt engineers. You have been given three independently produced system prompts for the same user idea.

Your job: produce ONE final prompt that is strictly superior to all three drafts. Not an average — a synthesis.

Process (perform internally, do not output):
1. Identify the strongest Role framing across drafts.
2. Identify the most precise Task statement.
3. Merge Context bullets, deduplicating and keeping only load-bearing detail.
4. Union the Constraints, resolving contradictions in favor of safety, specificity, and rigor.
5. Pick or compose the most realistic Examples — never toy ones.
6. Pick the Output Format that is most predictable and most useful for the stated audience.
7. Add anything all three drafts missed but that an expert would include.

Output ONLY the final merged prompt, in the exact structure the drafters used:

# **Role:**
# **Objective:**
# **Persona & Operating Principles:**
---
## CONTEXT ENGINEERING FRAMEWORK
### 1. Role
### 2. Task
### 3. Context
### 4. Constraints
### 5. Examples
### 6. Output Format
---
# **Notes:**

Do not include commentary, headers like "Final Prompt", or any explanation. Output the prompt only.`;

interface Payload {
  idea: string;
  domain?: string;
  targetAudience?: string;
  specificRequirements?: string;
  knowledgeBases?: Array<{ title: string; url: string; description: string; source: string }>;
}

function buildUserMessage(p: Payload): string {
  const kb = p.knowledgeBases && p.knowledgeBases.length > 0
    ? `\n\nRecommended knowledge bases to weave into the Context section:\n${p.knowledgeBases
        .map((k) => `- ${k.title} (${k.source}): ${k.description} — ${k.url}`)
        .join("\n")}`
    : "";

  return `Build the assistant prompt for this idea.

CORE IDEA:
${p.idea}

DOMAIN: ${p.domain || "unspecified — infer the most useful domain framing"}
TARGET AUDIENCE: ${p.targetAudience || "unspecified — infer realistic primary users"}
SPECIFIC REQUIREMENTS: ${p.specificRequirements || "none stated — add expert defaults"}${kb}

Produce the full prompt now using the required structure.`;
}

async function callModel(model: string, system: string, user: string, signal?: AbortSignal): Promise<string> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

  const body: Record<string, unknown> = {
    model,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  };

  // Enable high reasoning effort on supported models
  if (model.startsWith("openai/gpt-5") || model === "google/gemini-2.5-pro") {
    body.reasoning = { effort: "high" };
  }

  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Model ${model} failed: ${res.status} ${text}`);
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content || typeof content !== "string") {
    throw new Error(`Model ${model} returned no content`);
  }
  return content;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const payload = (await req.json()) as Payload;
    if (!payload?.idea || typeof payload.idea !== "string" || !payload.idea.trim()) {
      return new Response(JSON.stringify({ error: "Missing 'idea' in request body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userMessage = buildUserMessage(payload);

    // Phase 1: parallel ensemble drafts
    const draftResults = await Promise.allSettled(
      ENSEMBLE_MODELS.map((m) => callModel(m, DRAFTER_SYSTEM, userMessage)),
    );

    const drafts: Array<{ model: string; content: string }> = [];
    const failures: Array<{ model: string; error: string }> = [];

    draftResults.forEach((r, i) => {
      const model = ENSEMBLE_MODELS[i];
      if (r.status === "fulfilled") {
        drafts.push({ model, content: r.value });
      } else {
        const err = r.reason instanceof Error ? r.reason.message : String(r.reason);
        console.error(`Draft failure for ${model}:`, err);
        failures.push({ model, error: err });
      }
    });

    if (drafts.length === 0) {
      // Surface rate-limit / payment errors clearly
      const combined = failures.map((f) => `${f.model}: ${f.error}`).join(" | ");
      const status = combined.includes("429") ? 429 : combined.includes("402") ? 402 : 500;
      const message = status === 429
        ? "Rate limits exceeded across all reasoning models. Please try again in a moment."
        : status === 402
        ? "AI credits exhausted. Please add credits to your Lovable AI workspace."
        : `All ensemble models failed: ${combined}`;
      return new Response(JSON.stringify({ error: message }), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If only one draft succeeded, skip synthesis
    if (drafts.length === 1) {
      return new Response(
        JSON.stringify({
          prompt: drafts[0].content,
          modelsUsed: drafts.map((d) => d.model),
          synthesizer: null,
          failures,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Phase 2: synthesizer merges drafts
    const synthInput = `USER IDEA:
${payload.idea}

DRAFT 1 (${drafts[0].model}):
"""
${drafts[0].content}
"""

${drafts[1] ? `DRAFT 2 (${drafts[1].model}):
"""
${drafts[1].content}
"""

` : ""}${drafts[2] ? `DRAFT 3 (${drafts[2].model}):
"""
${drafts[2].content}
"""
` : ""}

Now produce the final synthesized prompt.`;

    let finalPrompt: string;
    try {
      finalPrompt = await callModel(SYNTHESIZER_MODEL, SYNTHESIZER_SYSTEM, synthInput);
    } catch (e) {
      // Fall back to the longest / most detailed draft if synthesizer fails
      const fallback = drafts.reduce((a, b) => (b.content.length > a.content.length ? b : a));
      console.error("Synthesizer failed, falling back to longest draft:", e);
      return new Response(
        JSON.stringify({
          prompt: fallback.content,
          modelsUsed: drafts.map((d) => d.model),
          synthesizer: null,
          synthesizerError: e instanceof Error ? e.message : String(e),
          failures,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({
        prompt: finalPrompt,
        modelsUsed: drafts.map((d) => d.model),
        synthesizer: SYNTHESIZER_MODEL,
        failures,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("synthesize-prompt error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
