import { generateWeeklyPlan } from "@/lib/planner/generator";
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

async function loadAccountPlan(supabaseAdmin: NonNullable<ReturnType<typeof getSupabaseAdmin>>, userId: string) {
  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("id, user_id, name, age, height_cm, weight_kg, training_days_per_week, created_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (profileError) {
    return { error: profileError.message, status: 500 as const };
  }

  if (!profile) {
    return { profile: null, sessions: [] };
  }

  const { data: sessions, error: sessionError } = await supabaseAdmin
    .from("workout_sessions")
    .select("id, session_date, sport, focus, warmup, main_set, cooldown, created_at")
    .eq("profile_id", profile.id)
    .order("created_at", { ascending: true });

  if (sessionError) {
    return { error: sessionError.message, status: 500 as const };
  }

  const sessionIds = (sessions ?? []).map((session) => session.id);
  const { data: dietRows, error: dietError } = await supabaseAdmin
    .from("diet_plans")
    .select("workout_session_id, calories, protein_g, carbs_g, fats_g, hydration_liters, breakfast, pre_workout_snack, post_workout_meal, lunch, evening_snack, dinner")
    .in("workout_session_id", sessionIds.length ? sessionIds : ["00000000-0000-0000-0000-000000000000"]);

  if (dietError) {
    return { error: dietError.message, status: 500 as const };
  }

  const dietBySession = new Map((dietRows ?? []).map((row) => [row.workout_session_id, row]));
  const combined = (sessions ?? []).map((session) => ({
    ...session,
    diet: dietBySession.get(session.id) ?? null
  }));

  return { profile, sessions: combined };
}

export async function GET(request: Request) {
  const auth = await getAuthenticatedUser(request);
  if ("error" in auth) {
    return Response.json({ error: auth.error }, { status: auth.status });
  }

  const result = await loadAccountPlan(auth.supabaseAdmin, auth.user.id);
  if ("error" in result) {
    return Response.json({ error: result.error }, { status: result.status });
  }

  return Response.json(result);
}

export async function POST(request: Request) {
  const auth = await getAuthenticatedUser(request);
  if ("error" in auth) {
    return Response.json({ error: auth.error }, { status: auth.status });
  }

  const body = await request.json();
  const profile = {
    name: body.name ?? auth.user.email?.split("@")[0] ?? "Athlete",
    age: Number(body.age ?? 20),
    heightCm: Number(body.heightCm ?? 170),
    weightKg: Number(body.weightKg ?? 70),
    trainingDaysPerWeek: Number(body.trainingDaysPerWeek ?? 7),
    level: body.level ?? "intermediate",
    sessionMinutes: body.sessionMinutes ?? 60
  };

  const existing = await loadAccountPlan(auth.supabaseAdmin, auth.user.id);
  if ("error" in existing) {
    return Response.json({ error: existing.error }, { status: existing.status });
  }

  if (existing.profile) {
    const { error: deleteError } = await auth.supabaseAdmin
      .from("workout_sessions")
      .delete()
      .eq("profile_id", existing.profile.id);

    if (deleteError) {
      return Response.json({ error: deleteError.message }, { status: 500 });
    }
  }

  const profileId = existing.profile?.id ?? crypto.randomUUID();
  const plan = generateWeeklyPlan(profile);

  const { error: profileError } = await auth.supabaseAdmin.from("profiles").upsert({
    id: profileId,
    user_id: auth.user.id,
    name: profile.name,
    age: profile.age,
    height_cm: profile.heightCm,
    weight_kg: profile.weightKg,
    training_days_per_week: profile.trainingDaysPerWeek
  });

  if (profileError) {
    return Response.json({ error: profileError.message }, { status: 500 });
  }

  for (const day of plan) {
    const sessionId = crypto.randomUUID();

    const { error: sessionError } = await auth.supabaseAdmin.from("workout_sessions").insert({
      id: sessionId,
      profile_id: profileId,
      session_date: new Date().toISOString().split("T")[0],
      sport: day.sport,
      focus: day.focus,
      warmup: day.warmup,
      main_set: day.mainSet,
      cooldown: day.cooldown
    });

    if (sessionError) {
      return Response.json({ error: sessionError.message }, { status: 500 });
    }

    const { error: dietError } = await auth.supabaseAdmin.from("diet_plans").insert({
      id: crypto.randomUUID(),
      workout_session_id: sessionId,
      calories: day.macros.calories,
      protein_g: day.macros.proteinG,
      carbs_g: day.macros.carbsG,
      fats_g: day.macros.fatsG,
      hydration_liters: day.meals.hydrationLiters,
      breakfast: day.meals.breakfast,
      pre_workout_snack: day.meals.preWorkoutSnack,
      post_workout_meal: day.meals.postWorkoutMeal,
      lunch: day.meals.lunch,
      evening_snack: day.meals.eveningSnack,
      dinner: day.meals.dinner
    });

    if (dietError) {
      return Response.json({ error: dietError.message }, { status: 500 });
    }
  }

  return Response.json({ profileId, profile, plan, saved: true });
}
