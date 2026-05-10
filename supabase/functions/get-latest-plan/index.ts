import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const headers = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers });
  }
  if (req.method !== "GET") {
    return new Response(JSON.stringify({ error: "Use GET" }), { status: 405, headers });
  }

  const url = new URL(req.url);
  const profileId = url.searchParams.get("profileId");
  if (!profileId) {
    return new Response(JSON.stringify({ error: "Missing profileId query param." }), { status: 400, headers });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRole) {
    return new Response(JSON.stringify({ error: "Missing project env vars in Supabase." }), { status: 500, headers });
  }

  const db = createClient(supabaseUrl, serviceRole);

  const { data: profile, error: profileError } = await db
    .from("profiles")
    .select("id, name, age, height_cm, weight_kg, training_days_per_week, created_at")
    .eq("id", profileId)
    .single();

  if (profileError) {
    return new Response(JSON.stringify({ error: profileError.message }), { status: 404, headers });
  }

  const { data: sessions, error: sessionError } = await db
    .from("workout_sessions")
    .select("id, session_date, sport, focus, warmup, main_set, cooldown")
    .eq("profile_id", profileId)
    .order("created_at", { ascending: true });

  if (sessionError) {
    return new Response(JSON.stringify({ error: sessionError.message }), { status: 500, headers });
  }

  const sessionIds = (sessions ?? []).map((s) => s.id);
  const { data: dietRows, error: dietError } = await db
    .from("diet_plans")
    .select("workout_session_id, calories, protein_g, carbs_g, fats_g, hydration_liters, breakfast, pre_workout_snack, post_workout_meal, lunch, evening_snack, dinner")
    .in("workout_session_id", sessionIds.length ? sessionIds : ["00000000-0000-0000-0000-000000000000"]);

  if (dietError) {
    return new Response(JSON.stringify({ error: dietError.message }), { status: 500, headers });
  }

  const dietBySession = new Map((dietRows ?? []).map((row) => [row.workout_session_id, row]));

  const combined = (sessions ?? []).map((session) => ({
    ...session,
    diet: dietBySession.get(session.id) ?? null
  }));

  return new Response(JSON.stringify({ profile, sessions: combined }), { status: 200, headers });
});
