import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  const headers = { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" };

  if (req.method === "OPTIONS") return new Response("ok", { headers });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRole) {
    return new Response(JSON.stringify({ error: "Server config error" }), { status: 500, headers });
  }

  const db = createClient(supabaseUrl, serviceRole);
  const userId = req.auth?.uid;
  if (!userId) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers });

  if (req.method === "POST") {
    const body = await req.json();
    const { sessionId, completed, rpe, fatigueScore, mood, notes } = body;
    if (!sessionId) return new Response(JSON.stringify({ error: "Missing sessionId" }), { status: 400, headers });

    const { data: profile } = await db.from("profiles").select("id").eq("user_id", userId).single();
    if (!profile) return new Response(JSON.stringify({ error: "Profile not found" }), { status: 404, headers });

    const { data: session } = await db.from("workout_sessions").select("id").eq("id", sessionId).eq("profile_id", profile.id).single();
    if (!session) return new Response(JSON.stringify({ error: "Session not found" }), { status: 404, headers });

    const { error: logError } = await db.from("workout_logs").upsert({
      id: crypto.randomUUID(),
      session_id: sessionId,
      completed: completed ?? true,
      rpe: rpe ?? null,
      fatigue_score: fatigueScore ?? null,
      mood: mood ?? null,
      notes: notes ?? null,
    });

    if (logError) return new Response(JSON.stringify({ error: logError.message }), { status: 500, headers });
    return new Response(JSON.stringify({ success: true }), { status: 200, headers });
  }

  return new Response(JSON.stringify({ error: "Use POST" }), { status: 405, headers });
});
