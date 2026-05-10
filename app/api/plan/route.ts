import { generateWeeklyPlan } from "@/lib/planner/generator";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(request: Request) {
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
