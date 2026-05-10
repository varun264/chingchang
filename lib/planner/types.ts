export type Sport =
  | "table_tennis"
  | "badminton"
  | "cricket"
  | "football"
  | "agility"
  | "strength";

export type Focus = "skill" | "speed" | "endurance" | "strength" | "recovery";

export type MealPlan = {
  breakfast: string;
  preWorkoutSnack: string;
  postWorkoutMeal: string;
  lunch: string;
  eveningSnack: string;
  dinner: string;
  hydrationLiters: number;
};

export type MacroTargets = {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatsG: number;
};

export type DayPlan = {
  day: string;
  sport: Sport;
  focus: Focus;
  sportDrills: string[];
  strengthBlock: string[];
  warmup: string[];
  mainSet: string[];
  cooldown: string[];
  macros: MacroTargets;
  meals: MealPlan;
};

export type UserProfile = {
  name: string;
  age: number;
  heightCm: number;
  weightKg: number;
  trainingDaysPerWeek: number;
  level?: "beginner" | "intermediate" | "advanced";
  sessionMinutes?: 30 | 45 | 60 | 90;
};
