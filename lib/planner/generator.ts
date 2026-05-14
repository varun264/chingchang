import { DayPlan, Focus, MacroTargets, Sport, UserProfile } from "./types";

const weeklyTemplate: Array<{ day: string; sport: Sport; focus: Focus }> = [
  { day: "Monday", sport: "football", focus: "speed" },
  { day: "Tuesday", sport: "strength", focus: "strength" },
  { day: "Wednesday", sport: "badminton", focus: "skill" },
  { day: "Thursday", sport: "agility", focus: "endurance" },
  { day: "Friday", sport: "cricket", focus: "skill" },
  { day: "Saturday", sport: "table_tennis", focus: "speed" },
  { day: "Sunday", sport: "strength", focus: "recovery" }
];

function targetsForFocus(profile: UserProfile, focus: Focus): MacroTargets {
  const baseCalories = Math.round(profile.weightKg * 33);

  if (focus === "speed" || focus === "endurance") {
    return {
      calories: baseCalories + 250,
      proteinG: Math.round(profile.weightKg * 1.8),
      carbsG: Math.round(profile.weightKg * 4.8),
      fatsG: Math.round(profile.weightKg * 0.9)
    };
  }

  if (focus === "strength") {
    return {
      calories: baseCalories + 200,
      proteinG: Math.round(profile.weightKg * 2),
      carbsG: Math.round(profile.weightKg * 3.8),
      fatsG: Math.round(profile.weightKg * 1)
    };
  }

  if (focus === "recovery") {
    return {
      calories: baseCalories - 150,
      proteinG: Math.round(profile.weightKg * 1.7),
      carbsG: Math.round(profile.weightKg * 2.8),
      fatsG: Math.round(profile.weightKg * 1.1)
    };
  }

  return {
    calories: baseCalories,
    proteinG: Math.round(profile.weightKg * 1.8),
    carbsG: Math.round(profile.weightKg * 3.6),
    fatsG: Math.round(profile.weightKg * 1)
  };
}

function workoutForSport(sport: Sport): Pick<DayPlan, "warmup" | "mainSet" | "cooldown"> {
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

export function generateSportWeekPlan(profile: UserProfile, sport: Sport): DayPlan[] {
  const level = profile.level ?? "intermediate";
  const sessionMinutes = profile.sessionMinutes ?? 60;

  return sportWeekTemplate.slice(0, profile.trainingDaysPerWeek).map((template) => {
    const workout = workoutForSport(sport);
    const baseMeals = mealsForFocus(template.focus);
    return {
      day: template.day,
      sport,
      focus: template.focus,
      sportDrills: scaleBlock(drillsForSport(sport), level, sessionMinutes),
      strengthBlock: scaleBlock(strengthForSport(sport), level, sessionMinutes),
      warmup: scaleBlock(workout.warmup, level, sessionMinutes),
      mainSet: scaleBlock(workout.mainSet, level, sessionMinutes),
      cooldown: workout.cooldown,
      macros: targetsForFocus(profile, template.focus),
      meals: {
        ...baseMeals,
        eveningSnack: `${baseMeals.eveningSnack} (${sportMealAdjustments(sport)})`
      }
    };
  });
}

export function generateWeeklyPlan(profile: UserProfile): DayPlan[] {
  const level = profile.level ?? "intermediate";
  const sessionMinutes = profile.sessionMinutes ?? 60;

  return weeklyTemplate.slice(0, profile.trainingDaysPerWeek).map((template) => {
    const workout = workoutForSport(template.sport);
    const baseMeals = mealsForFocus(template.focus);
    return {
      ...template,
      sportDrills: scaleBlock(drillsForSport(template.sport), level, sessionMinutes),
      strengthBlock: scaleBlock(strengthForSport(template.sport), level, sessionMinutes),
      warmup: scaleBlock(workout.warmup, level, sessionMinutes),
      mainSet: scaleBlock(workout.mainSet, level, sessionMinutes),
      cooldown: workout.cooldown,
      macros: targetsForFocus(profile, template.focus),
      meals: {
        ...baseMeals,
        eveningSnack: `${baseMeals.eveningSnack} (${sportMealAdjustments(template.sport)})`
      }
    };
  });
}
