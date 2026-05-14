import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  const headers = { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" };

  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "GET") return new Response(JSON.stringify({ error: "Use GET" }), { status: 405, headers });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRole) {
    return new Response(JSON.stringify({ error: "Server config error" }), { status: 500, headers });
  }

  const db = createClient(supabaseUrl, serviceRole);
  const userId = req.auth?.uid;
  if (!userId) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers });

  const { data: profile } = await db.from("profiles").select("id").eq("user_id", userId).single();
  if (!profile) return new Response(JSON.stringify({ error: "Profile not found" }), { status: 404, headers });

  const { data: sessions, error: sErr } = await db
    .from("workout_sessions")
    .select("id, session_date, day_label, sport, focus")
    .eq("profile_id", profile.id)
    .order("session_date", { ascending: false });

  if (sErr) return new Response(JSON.stringify({ error: sErr.message }), { status: 500, headers });

  const ids = sessions?.map((s: any) => s.id) ?? [];
  const { data: logs } = await db
    .from("workout_logs")
    .select("session_id, completed, rpe, fatigue_score, mood, logged_at")
    .in("session_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);

  const logMap = new Map(logs?.map((l: any) => [l.session_id, l]));
  const combined = (sessions ?? []).map((s: any) => ({ ...s, log: logMap.get(s.id) ?? null }));

  const total = combined.length;
  const completed = combined.filter((s: any) => s.log?.completed).length;
  const avgRPE = total > 0
    ? Math.round(combined.filter((s: any) => s.log?.rpe).reduce((a: number, s: any) => a + s.log.rpe, 0) / Math.max(1, combined.filter((s: any) => s.log?.rpe).length))
    : 0;
  const streak = getStreak(combined);

  return new Response(JSON.stringify({ profile, sessions: combined, stats: { total, completed, avgRPE, streak } }), {
    status: 200, headers
  });
});

function getStreak(sessions: any[]): number {
  const dates = sessions.filter((s: any) => s.log?.completed).map((s: any) => new Date(s.session_date)).sort((a: Date, b: Date) => b.getTime() - a.getTime());
  if (dates.length === 0) return 0;
  let streak = 1;
  for (let i = 1; i < dates.length; i++) {
    if ((dates[i - 1].getTime() - dates[i].getTime()) / 86400000 <= 1.5) streak++;
    else break;
  }
  return streak;
}
