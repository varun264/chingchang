import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type Sport = "table_tennis" | "badminton" | "cricket" | "football" | "agility" | "strength";
type Focus = "skill" | "speed" | "endurance" | "strength" | "recovery";

type ProfileInput = {
  name?: string;
  age?: number;
  heightCm?: number;
  weightKg?: number;
  trainingDaysPerWeek?: number;
  level?: "beginner" | "intermediate" | "advanced";
  sessionMinutes?: 30 | 45 | 60 | 90;
};

type DayPlan = {
  day: string;
  sport: Sport;
  focus: Focus;
  sportDrills: string[];
  strengthBlock: string[];
  warmup: string[];
  mainSet: string[];
  cooldown: string[];
  macros: { calories: number; proteinG: number; carbsG: number; fatsG: number };
  meals: {
    breakfast: string;
    preWorkoutSnack: string;
    postWorkoutMeal: string;
    lunch: string;
    eveningSnack: string;
    dinner: string;
    hydrationLiters: number;
  };
};

type GeminiDay = {
  day: string;
  sport: string;
  focus: string;
  warmup: string;
  mainSet: string;
  cooldown: string;
  sportDrills: string;
  strengthBlock: string;
  macros: { calories: number; proteinG: number; carbsG: number; fatsG: number };
  meals: {
    hydrationLiters: number;
    breakfast: string;
    preWorkoutSnack: string;
    postWorkoutMeal: string;
    lunch: string;
    eveningSnack: string;
    dinner: string;
  };
};

const headers = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const GEMINI_MODEL = "gemini-1.5-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

async function callGemini(profile: Required<ProfileInput>, sport?: Sport): Promise<DayPlan[] | null> {
  if (!GEMINI_API_KEY) return null;

  const isSportSpecific = sport && sport !== "all";
  const sportLabel = isSportSpecific ? sport!.replace(/_/g, " ") : "mixed sports";
  const daysToGenerate = profile.trainingDaysPerWeek;

  const prompt = `You are an expert sports coach and nutritionist for Indian athletes. Generate a ${daysToGenerate}-day weekly training + diet plan for ${sportLabel}.

Athlete profile:
- Name: ${profile.name}
- Age: ${profile.age}
- Height: ${profile.heightCm} cm
- Weight: ${profile.weightKg} kg
- Level: ${profile.level}
- Session length: ${profile.sessionMinutes} min
- Training days: ${daysToGenerate} days/week

${isSportSpecific
  ? `Each day covers a different focus for ${sportLabel}: skill, speed, endurance, strength, skill, speed, recovery (in that order, first ${daysToGenerate} days).`
  : `Each day is a different sport: football, strength, badminton, agility, cricket, table_tennis, strength (in that order, first ${daysToGenerate} days).`}

IMPORTANT: Return ONLY valid JSON array. No markdown, no code fences, no extra text.

Each object must use sport values exactly as: "football", "strength", "badminton", "agility", "cricket", "table_tennis".
Focus values: "skill", "speed", "endurance", "strength", "recovery".

Schema:
[
  {
    "day": "Monday",
    "sport": "football",
    "focus": "skill",
    "warmup": "string describing warmup 50-100 chars",
    "mainSet": "string describing main workout 50-100 chars",
    "cooldown": "string describing cooldown 30-60 chars",
    "sportDrills": "string describing sport-specific drills 40-80 chars",
    "strengthBlock": "string describing strength work 40-80 chars",
    "macros": { "calories": 2500, "proteinG": 150, "carbsG": 300, "fatsG": 70 },
    "meals": {
      "hydrationLiters": 3.0,
      "breakfast": "Indian breakfast (oats, eggs, paratha, etc)",
      "preWorkoutSnack": "light pre-workout snack",
      "postWorkoutMeal": "protein + carbs post workout meal",
      "lunch": "Indian lunch (rice, dal, roti, veg, curd)",
      "eveningSnack": "light evening snack with fruit/nuts",
      "dinner": "Indian dinner with protein + vegetables"
    }
  }
]

Use Indian cuisine references. Tailor intensity to ${profile.level} level.
Make each day unique and interesting. Use realistic macros based on the athlete's weight (${profile.weightKg}kg).
Day names must be actual weekdays starting from Monday.`;

  try {
    const body = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 4096
      }
    };

    const res = await fetch(GEMINI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      console.error("Gemini API error:", res.status, await res.text());
      return null;
    }

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return null;

    // Strip markdown code fences if present
    const cleanJson = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
    const parsed: GeminiDay[] = JSON.parse(cleanJson);
    if (!Array.isArray(parsed) || parsed.length === 0) return null;

    const validSports = ["table_tennis", "badminton", "cricket", "football", "agility", "strength"];

    const plan: DayPlan[] = parsed.slice(0, daysToGenerate).map((d) => ({
      day: d.day,
      sport: validSports.includes(d.sport) ? (d.sport as Sport) : (isSportSpecific ? sport! : "football"),
      focus: ["skill", "speed", "endurance", "strength", "recovery"].includes(d.focus) ? (d.focus as Focus) : "skill",
      sportDrills: [d.sportDrills || "Sport-specific drills as prescribed"],
      strengthBlock: [d.strengthBlock || "Strength work as prescribed"],
      warmup: [d.warmup || "General warmup 10 min"],
      mainSet: [d.mainSet || "Main workout as prescribed"],
      cooldown: [d.cooldown || "Cool down 5 min"],
      macros: d.macros || { calories: 2500, proteinG: 150, carbsG: 300, fatsG: 70 },
      meals: d.meals || {
        hydrationLiters: 3,
        breakfast: "Oats with milk and nuts",
        preWorkoutSnack: "Banana",
        postWorkoutMeal: "Rice with chicken or paneer",
        lunch: "Chapati, dal, veg, curd",
        eveningSnack: "Fruit and nuts",
        dinner: "Rice/chapati with protein and veggies"
      }
    }));

    return plan;
  } catch (err) {
    console.error("Gemini call failed:", err);
    return null;
  }
}

const weeklyTemplate: Array<{ day: string; sport: Sport; focus: Focus }> = [
  { day: "Monday", sport: "football", focus: "speed" },
  { day: "Tuesday", sport: "strength", focus: "strength" },
  { day: "Wednesday", sport: "badminton", focus: "skill" },
  { day: "Thursday", sport: "agility", focus: "endurance" },
  { day: "Friday", sport: "cricket", focus: "skill" },
  { day: "Saturday", sport: "table_tennis", focus: "speed" },
  { day: "Sunday", sport: "strength", focus: "recovery" }
];

function targets(weightKg: number, focus: Focus) {
  const baseCalories = Math.round(weightKg * 33);
  if (focus === "speed" || focus === "endurance") {
    return { calories: baseCalories + 250, proteinG: Math.round(weightKg * 1.8), carbsG: Math.round(weightKg * 4.8), fatsG: Math.round(weightKg * 0.9) };
  }
  if (focus === "strength") {
    return { calories: baseCalories + 200, proteinG: Math.round(weightKg * 2), carbsG: Math.round(weightKg * 3.8), fatsG: Math.round(weightKg * 1) };
  }
  if (focus === "recovery") {
    return { calories: baseCalories - 150, proteinG: Math.round(weightKg * 1.7), carbsG: Math.round(weightKg * 2.8), fatsG: Math.round(weightKg * 1.1) };
  }
  return { calories: baseCalories, proteinG: Math.round(weightKg * 1.8), carbsG: Math.round(weightKg * 3.6), fatsG: Math.round(weightKg * 1) };
}

function workoutForSport(sport: Sport) {
  const commonCooldown = ["5 min light jog", "Hip + hamstring mobility", "Box breathing 3 min"];
  switch (sport) {
    case "football":
      return {
        warmup: ["Dynamic mobility 8 min", "A-skips + high knees 3 x 20m", "Ball touches 5 min"],
        mainSet: ["Sprint repeats 8 x 30m", "Change-of-direction 6 x 20s", "Small-sided game 4 x 4 min"],
        cooldown: commonCooldown
      };
    case "badminton":
      return {
        warmup: ["Joint prep 6 min", "Footwork ladder 4 rounds", "Shadow swings 3 x 90s"],
        mainSet: ["Multi-shuttle drills 6 x 60s", "Net kill + lift drill 5 sets", "Match simulation 3 x 8 min"],
        cooldown: commonCooldown
      };
    case "cricket":
      return {
        warmup: ["Shoulder priming 6 min", "Lateral movements 3 x 20m", "Run-up activation 5 min"],
        mainSet: ["Batting precision 8 sets", "Throwing mechanics 5 x 8", "Sprint between wickets 10 reps"],
        cooldown: commonCooldown
      };
    case "table_tennis":
      return {
        warmup: ["Wrist and shoulder prep 5 min", "Footwork shuffles 5 x 30s", "Shadow strokes 3 x 2 min"],
        mainSet: ["Forehand-backhand rally 10 min", "Serve + third ball attack 8 sets", "Fast reflex drill 6 x 45s"],
        cooldown: commonCooldown
      };
    case "agility":
      return {
        warmup: ["Mobility flow 8 min", "Pogo jumps 3 x 20", "Mini hurdles 4 rounds"],
        mainSet: ["5-10-5 shuttle 8 reps", "Reactive cone drill 6 x 30s", "Broad jump + sprint combo 6 reps"],
        cooldown: commonCooldown
      };
    case "strength":
      return {
        warmup: ["T-spine + hip mobility 8 min", "Core activation 3 rounds", "Ramp-up sets for first lift"],
        mainSet: ["Squat or trap-bar deadlift 5 x 5", "Push movement 4 x 8", "Pull movement 4 x 8", "Loaded carries 4 x 30m"],
        cooldown: commonCooldown
      };
  }
}

function mealsForFocus(focus: Focus) {
  if (focus === "speed" || focus === "endurance") {
    return {
      breakfast: "Oats + banana + milk + nuts",
      preWorkoutSnack: "Banana + dates + water",
      postWorkoutMeal: "Rice + eggs/chicken or paneer + curd",
      lunch: "Chapati + dal + mixed veg + salad",
      eveningSnack: "Peanut butter sandwich + fruit",
      dinner: "Rice or chapati + fish/chicken/paneer + veggies",
      hydrationLiters: 3.5
    };
  }
  if (focus === "strength") {
    return {
      breakfast: "Egg bhurji or tofu scramble + toast + fruit",
      preWorkoutSnack: "Yogurt + banana",
      postWorkoutMeal: "Whey or milk + banana, then chicken/paneer + rice",
      lunch: "Dal + rice + paneer/chicken + salad",
      eveningSnack: "Roasted chana + fruit",
      dinner: "Chapati + lean protein + sauteed vegetables",
      hydrationLiters: 3.2
    };
  }
  return {
    breakfast: "Poha/upma + sprouts + fruit",
    preWorkoutSnack: "Coconut water + light fruit",
    postWorkoutMeal: "Curd rice with protein side",
    lunch: "Chapati + dal + vegetables + curd",
    eveningSnack: "Nuts + herbal tea",
    dinner: "Soup + chapati + paneer/fish + salad",
    hydrationLiters: 3
  };
}

function drillsForSport(sport: Sport): string[] {
  switch (sport) {
    case "table_tennis":
      return ["Serve variation 20 balls", "Forehand-backhand transition 6 x 90s", "Short-long placement drill 5 sets"];
    case "badminton":
      return ["Six-point footwork 5 rounds", "Drop-smash combo 8 sets", "Net tumble + lift reaction 6 sets"];
    case "cricket":
      return ["Batting contact zone 60 balls", "Catching under fatigue 5 rounds", "Throwing accuracy at stumps 30 reps"];
    case "football":
      return ["1-touch passing grid 12 min", "Finishing from cutback 30 reps", "Press-and-recover transition 6 rounds"];
    case "agility":
      return ["Reaction mirror drill 8 x 20s", "Ladder in-in-out-out 6 rounds", "Cone color callouts 10 reps"];
    case "strength":
      return ["Movement quality checks", "Tempo control on lifts", "Core brace breathing practice"];
  }
}

function scaleBlock(block: string[], level: "beginner" | "intermediate" | "advanced", sessionMinutes: 30 | 45 | 60 | 90): string[] {
  const intensityTag = level === "beginner" ? "(easy)" : level === "advanced" ? "(hard)" : "(moderate)";
  const volumeTag = sessionMinutes <= 45 ? "- short session volume" : sessionMinutes >= 90 ? "- long session volume" : "- standard volume";
  return block.map((item) => `${item} ${intensityTag} ${volumeTag}`);
}

function strengthForSport(sport: Sport): string[] {
  switch (sport) {
    case "table_tennis":
      return ["Split squat 3 x 8/side", "Landmine press 3 x 8", "Wrist pronation/supination 3 x 12"];
    case "badminton":
      return ["Rear-foot elevated split squat 4 x 6", "Single-leg RDL 3 x 8", "Pull-ups or assisted pull-ups 4 x 6"];
    case "cricket":
      return ["Trap bar deadlift 4 x 5", "Rotational med-ball throw 5 x 5/side", "Farmer carry 4 x 30m"];
    case "football":
      return ["Back squat 5 x 5", "Nordic hamstring curl 3 x 5", "Lateral bounds 4 x 6/side"];
    case "agility":
      return ["Power clean pull 5 x 3", "Box jump 5 x 3", "Copenhagen plank 3 x 30s/side"];
    case "strength":
      return ["Primary lift 5 x 5", "Secondary push/pull superset 4 x 8", "Core anti-rotation 3 x 12"];
  }
}

function sportMealAdjustments(sport: Sport): string {
  switch (sport) {
    case "table_tennis":
      return "Add lighter pre-session carbs and avoid heavy fats before drills.";
    case "badminton":
      return "Prioritize quick carbs pre-session and electrolytes during long rallies.";
    case "cricket":
      return "Use steady carb intake across long sessions with fruit between blocks.";
    case "football":
      return "Increase carb portions on match-intensity days and hydrate aggressively.";
    case "agility":
      return "Keep pre-workout snack light and emphasize post-session protein + carbs.";
    case "strength":
      return "Center meals around high-quality protein at 3-4 feedings per day.";
  }
}

const sportWeekTemplate: Array<{ day: string; focus: Focus }> = [
  { day: "Monday", focus: "skill" },
  { day: "Tuesday", focus: "speed" },
  { day: "Wednesday", focus: "endurance" },
  { day: "Thursday", focus: "strength" },
  { day: "Friday", focus: "skill" },
  { day: "Saturday", focus: "speed" },
  { day: "Sunday", focus: "recovery" }
];

function generateSportPlan(profile: Required<ProfileInput>, sport: Sport): DayPlan[] {
  return sportWeekTemplate.slice(0, profile.trainingDaysPerWeek).map((t) => {
    const workout = workoutForSport(sport);
    const baseMeals = mealsForFocus(t.focus);
    return {
      day: t.day,
      sport,
      focus: t.focus,
      sportDrills: scaleBlock(drillsForSport(sport), profile.level, profile.sessionMinutes),
      strengthBlock: scaleBlock(strengthForSport(sport), profile.level, profile.sessionMinutes),
      warmup: scaleBlock(workout.warmup, profile.level, profile.sessionMinutes),
      mainSet: scaleBlock(workout.mainSet, profile.level, profile.sessionMinutes),
      cooldown: workout.cooldown,
      macros: targets(profile.weightKg, t.focus),
      meals: { ...baseMeals, eveningSnack: `${baseMeals.eveningSnack} (${sportMealAdjustments(sport)})` }
    };
  });
}

function generatePlan(profile: Required<ProfileInput>): DayPlan[] {
  return weeklyTemplate.slice(0, profile.trainingDaysPerWeek).map((t) => {
    const workout = workoutForSport(t.sport);
    const baseMeals = mealsForFocus(t.focus);
    return {
      ...t,
      sportDrills: scaleBlock(drillsForSport(t.sport), profile.level, profile.sessionMinutes),
      strengthBlock: scaleBlock(strengthForSport(t.sport), profile.level, profile.sessionMinutes),
      warmup: scaleBlock(workout.warmup, profile.level, profile.sessionMinutes),
      mainSet: scaleBlock(workout.mainSet, profile.level, profile.sessionMinutes),
      cooldown: workout.cooldown,
      macros: targets(profile.weightKg, t.focus),
      meals: {
        ...baseMeals,
        eveningSnack: `${baseMeals.eveningSnack} (${sportMealAdjustments(t.sport)})`
      }
    };
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Use POST" }), { status: 405, headers });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRole) {
    return new Response(JSON.stringify({ error: "Missing project env vars in Supabase." }), { status: 500, headers });
  }

  const db = createClient(supabaseUrl, serviceRole);
  const input = (await req.json()) as ProfileInput;
  const profile = {
    name: input.name ?? "Athlete",
    age: Number(input.age ?? 20),
    heightCm: Number(input.heightCm ?? 170),
    weightKg: Number(input.weightKg ?? 70),
    trainingDaysPerWeek: Math.min(7, Math.max(1, Number(input.trainingDaysPerWeek ?? 7))),
    level: input.level ?? "intermediate",
    sessionMinutes: input.sessionMinutes ?? 60
  };

  const requestedSport = (input as any).sport as Sport | undefined;

  // Try Gemini first, fall back to deterministic generator
  let plan = await callGemini(profile, requestedSport);
  if (!plan) {
    plan = requestedSport && requestedSport !== "all"
      ? generateSportPlan(profile, requestedSport)
      : generatePlan(profile);
  }

  // Link to authenticated user
  const userId = req.auth?.uid;
  let profileId = crypto.randomUUID();

  if (userId) {
    const { data: existingProfile } = await db.from("profiles").select("id").eq("user_id", userId).maybeSingle();
    if (existingProfile) {
      profileId = existingProfile.id;
      // Delete old sessions
      await db.from("workout_sessions").delete().eq("profile_id", profileId);
    }
  }

  const { error: profileError } = await db.from("profiles").upsert({
    id: profileId,
    user_id: userId ?? null,
    name: profile.name,
    age: profile.age,
    height_cm: profile.heightCm,
    weight_kg: profile.weightKg,
    training_days_per_week: profile.trainingDaysPerWeek
  });
  if (profileError) {
    return new Response(JSON.stringify({ error: profileError.message }), { status: 500, headers });
  }

  for (const day of plan) {
    const sessionId = crypto.randomUUID();
    const { error: sessionError } = await db.from("workout_sessions").insert({
      id: sessionId,
      profile_id: profileId,
      session_date: new Date().toISOString().split("T")[0],
      day_label: day.day,
      sport: day.sport,
      focus: day.focus,
      sport_drills: day.sportDrills,
      strength_block: day.strengthBlock,
      warmup: day.warmup,
      main_set: day.mainSet,
      cooldown: day.cooldown
    });
    if (sessionError) {
      return new Response(JSON.stringify({ error: sessionError.message }), { status: 500, headers });
    }

    const { error: dietError } = await db.from("diet_plans").insert({
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
      return new Response(JSON.stringify({ error: dietError.message }), { status: 500, headers });
    }
  }

  return new Response(JSON.stringify({ profileId, profile, plan, saved: true }), {
    status: 200,
    headers
  });
});
