import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Auth via existing JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization required. Pass your JWT Bearer token." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check subscription
    const { data: subData } = await supabaseClient.functions.invoke("check-subscription", {
      headers: { Authorization: `Bearer ${token}` },
    });

    const isSubscribed = subData?.subscribed === true;

    if (req.method === "GET") {
      // List agent's own listings
      const { data: listings, error } = await supabaseClient
        .from("agent_listings")
        .select("*")
        .eq("creator_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return new Response(
        JSON.stringify({ listings, is_subscribed: isSubscribed }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (req.method === "POST") {
      const body = await req.json();
      const { action } = body;

      // CREATE a new prompt listing
      if (!action || action === "create") {
        const { title, description, content, category, tags, price_tier } = body;

        if (!title || !content) {
          return new Response(
            JSON.stringify({ error: "title and content are required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Non-subscribers can only create free listings
        const tier = isSubscribed ? (price_tier || "subscription") : "free";

        const { data: listing, error } = await supabaseClient
          .from("agent_listings")
          .insert({
            creator_id: user.id,
            title,
            description: description || null,
            content,
            category: category || "general",
            tags: tags || [],
            price_tier: tier,
            is_published: true,
          })
          .select()
          .single();

        if (error) throw error;

        return new Response(
          JSON.stringify({
            success: true,
            listing,
            message: isSubscribed
              ? "Prompt created and published (subscription-gated)"
              : "Prompt created as free tier (subscribe to gate behind paywall)",
          }),
          { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // UPDATE an existing listing
      if (action === "update") {
        const { id, ...updates } = body;
        if (!id) {
          return new Response(
            JSON.stringify({ error: "id is required for updates" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Remove action from updates
        delete updates.action;

        const { data: listing, error } = await supabaseClient
          .from("agent_listings")
          .update(updates)
          .eq("id", id)
          .eq("creator_id", user.id)
          .select()
          .single();

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true, listing }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // DELETE a listing
      if (action === "delete") {
        const { id } = body;
        if (!id) {
          return new Response(
            JSON.stringify({ error: "id is required for deletion" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { error } = await supabaseClient
          .from("agent_listings")
          .delete()
          .eq("id", id)
          .eq("creator_id", user.id);

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true, message: "Listing deleted" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // BROWSE marketplace listings (for consumers)
      if (action === "browse") {
        const { category, search, limit: queryLimit } = body;
        let query = supabaseClient
          .from("agent_listings")
          .select("id, title, description, category, tags, price_tier, rating, usage_count, created_at, creator_id")
          .eq("is_published", true);

        if (!isSubscribed) {
          query = query.eq("price_tier", "free");
        }

        if (category) {
          query = query.eq("category", category);
        }

        if (search) {
          query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
        }

        const { data: listings, error } = await query
          .order("rating", { ascending: false })
          .limit(queryLimit || 50);

        if (error) throw error;

        return new Response(
          JSON.stringify({ listings, is_subscribed: isSubscribed }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // GET full content of a listing (subscription check)
      if (action === "get") {
        const { id } = body;
        if (!id) {
          return new Response(
            JSON.stringify({ error: "id is required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { data: listing, error } = await supabaseClient
          .from("agent_listings")
          .select("*")
          .eq("id", id)
          .eq("is_published", true)
          .single();

        if (error) throw error;

        if (listing.price_tier === "subscription" && !isSubscribed) {
          return new Response(
            JSON.stringify({
              error: "Subscription required",
              listing: {
                id: listing.id,
                title: listing.title,
                description: listing.description,
                category: listing.category,
                tags: listing.tags,
                price_tier: listing.price_tier,
                // Content hidden
              },
            }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Increment usage count
        await supabaseClient
          .from("agent_listings")
          .update({ usage_count: (listing.usage_count || 0) + 1 })
          .eq("id", id);

        return new Response(
          JSON.stringify({ listing }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: "Unknown action. Use: create, update, delete, browse, get" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Method not allowed. Use GET or POST." }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Agent endpoint error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
