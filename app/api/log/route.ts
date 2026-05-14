import { getSupabaseAdmin } from "@/lib/supabase/admin";

async function getAuthenticatedUser(request: Request) {
  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    return { error: "Missing Supabase admin environment variables on server.", status: 500 as const };
  }

  const token = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) {
    return { error: "Sign in required.", status: 401 as const };
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) {
    return { error: "Invalid or expired session.", status: 401 as const };
  }

  return { supabaseAdmin, user: data.user };
}

export async function POST(request: Request) {
  const auth = await getAuthenticatedUser(request);
  if ("error" in auth) {
    return Response.json({ error: auth.error }, { status: auth.status });
  }

  const body = await request.json();
  const sessionId = body.sessionId as string;
  if (!sessionId) {
    return Response.json({ error: "Missing sessionId." }, { status: 400 });
  }

  // First find the profile for this user
  const { data: profile, error: profileError } = await auth.supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("user_id", auth.user.id)
    .single();

  if (profileError || !profile) {
    return Response.json({ error: "Profile not found.", status: 404 });
  }

  // Verify session belongs to this profile
  const { data: session, error: sessionError } = await auth.supabaseAdmin
    .from("workout_sessions")
    .select("id")
    .eq("id", sessionId)
    .eq("profile_id", profile.id)
    .single();

  if (sessionError || !session) {
    return Response.json({ error: "Session not found.", status: 404 });
  }

  const { error: logError } = await auth.supabaseAdmin.from("workout_logs").upsert({
    id: body.logId ?? crypto.randomUUID(),
    session_id: sessionId,
    completed: body.completed ?? true,
    rpe: body.rpe ?? null,
    fatigue_score: body.fatigueScore ?? null,
    mood: body.mood ?? null,
    notes: body.notes ?? null
  });

  if (logError) {
    return Response.json({ error: logError.message }, { status: 500 });
  }

  return Response.json({ success: true });
}

export async function GET(request: Request) {
  const auth = await getAuthenticatedUser(request);
  if ("error" in auth) {
    return Response.json({ error: auth.error }, { status: auth.status });
  }

  const { data: profile, error: profileError } = await auth.supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("user_id", auth.user.id)
    .single();

  if (profileError || !profile) {
    return Response.json({ error: "Profile not found.", status: 404 });
  }

  // Get progress summary
  const { data: sessions, error: sessionsError } = await auth.supabaseAdmin
    .from("workout_sessions")
    .select("id, session_date, day_label, sport, focus")
    .eq("profile_id", profile.id)
    .order("session_date", { ascending: false });

  if (sessionsError) {
    return Response.json({ error: sessionsError.message }, { status: 500 });
  }

  const sessionIds = (sessions ?? []).map((s: any) => s.id);

  const { data: logs, error: logsError } = await auth.supabaseAdmin
    .from("workout_logs")
    .select("session_id, completed, rpe, fatigue_score, mood, logged_at")
    .in("session_id", sessionIds.length ? sessionIds : ["00000000-0000-0000-0000-000000000000"]);

  if (logsError) {
    return Response.json({ error: logsError.message }, { status: 500 });
  }

  const logMap = new Map((logs ?? []).map((l: any) => [l.session_id, l]));

  const combined = (sessions ?? []).map((session: any) => ({
    ...session,
    log: logMap.get(session.id) ?? null
  }));

  // Summary stats
  const total = combined.length;
  const completed = combined.filter((s: any) => s.log?.completed).length;
  const avgRPE = total > 0
    ? Math.round(combined.filter((s: any) => s.log?.rpe).reduce((sum: number, s: any) => sum + s.log.rpe, 0) / Math.max(1, combined.filter((s: any) => s.log?.rpe).length))
    : 0;
  const streak = getStreak(combined);

  return Response.json({ profile, sessions: combined, stats: { total, completed, avgRPE, streak } });
}

function getStreak(sessions: any[]): number {
  const dates = sessions
    .filter((s: any) => s.log?.completed)
    .map((s: any) => new Date(s.session_date))
    .sort((a: Date, b: Date) => b.getTime() - a.getTime());

  if (dates.length === 0) return 0;
  let streak = 1;
  for (let i = 1; i < dates.length; i++) {
    const diff = (dates[i - 1].getTime() - dates[i].getTime()) / (1000 * 60 * 60 * 24);
    if (diff <= 1.5) streak++;
    else break;
  }
  return streak;
}