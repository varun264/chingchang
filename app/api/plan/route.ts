import { generateWeeklyPlan } from "@/lib/planner/generator";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    return Response.json(
      { error: "Missing Supabase admin environment variables on server." },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(request.url);
  const profileId = searchParams.get("profileId");
  if (!profileId) {
    return Response.json({ error: "Missing profileId query param." }, { status: 400 });
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("id, name, age, height_cm, weight_kg, training_days_per_week, created_at")
    .eq("id", profileId)
    .single();

  if (profileError) {
    return Response.json({ error: profileError.message }, { status: 404 });
  }

  const { data: sessions, error: sessionError } = await supabaseAdmin
    .from("workout_sessions")
    .select("id, session_date, sport, focus, warmup, main_set, cooldown, created_at")
    .eq("profile_id", profileId)
    .order("created_at", { ascending: true });

  if (sessionError) {
    return Response.json({ error: sessionError.message }, { status: 500 });
  }

  const sessionIds = (sessions ?? []).map((session) => session.id);
  const { data: dietRows, error: dietError } = await supabaseAdmin
    .from("diet_plans")
    .select("workout_session_id, calories, protein_g, carbs_g, fats_g, hydration_liters, breakfast, pre_workout_snack, post_workout_meal, lunch, evening_snack, dinner")
    .in("workout_session_id", sessionIds.length ? sessionIds : ["00000000-0000-0000-0000-000000000000"]);

  if (dietError) {
    return Response.json({ error: dietError.message }, { status: 500 });
  }

  const dietBySession = new Map((dietRows ?? []).map((row) => [row.workout_session_id, row]));
  const combined = (sessions ?? []).map((session) => ({
    ...session,
    diet: dietBySession.get(session.id) ?? null
  }));

  return Response.json({ profile, sessions: combined });
}

export async function POST(request: Request) {
  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    return Response.json(
      { error: "Missing Supabase admin environment variables on server." },
      { status: 500 }
    );
  }

  const body = await request.json();

  const profile = {
    name: body.name ?? "Athlete",
    age: Number(body.age ?? 20),
    heightCm: Number(body.heightCm ?? 170),
    weightKg: Number(body.weightKg ?? 70),
    trainingDaysPerWeek: Number(body.trainingDaysPerWeek ?? 7)
  };

  const plan = generateWeeklyPlan(profile);

  const profileId = crypto.randomUUID();

  const { error: profileError } = await supabaseAdmin.from("profiles").insert({
    id: profileId,
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

    const { error: sessionError } = await supabaseAdmin.from("workout_sessions").insert({
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

    const { error: dietError } = await supabaseAdmin.from("diet_plans").insert({
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
