"use client";

import { useState } from "react";
import { generatePlanViaEdge, getLatestPlanViaEdge } from "@/lib/supabase/functions";
import { supabaseClient } from "@/lib/supabase/client";

type PlanDay = {
  id?: string;
  day: string;
  sport: string;
  focus: string;
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

const sportOptions = [
  { value: "table_tennis", label: "Table Tennis" },
  { value: "badminton", label: "Badminton" },
  { value: "cricket", label: "Cricket" },
  { value: "football", label: "Football" },
  { value: "agility", label: "Agility" },
  { value: "strength", label: "Strength" }
];

const defaultProfile = {
  name: "Varun",
  age: 20,
  heightCm: 172,
  weightKg: 68,
  trainingDaysPerWeek: 7,
  level: "intermediate" as "beginner" | "intermediate" | "advanced",
  sessionMinutes: 60 as 30 | 45 | 60 | 90
};

function normalizeSession(s: any): PlanDay {
  return {
    id: s.id,
    day: s.day_label ?? s.session_date,
    sport: s.sport,
    focus: s.focus,
    sportDrills: s.sport_drills ?? [],
    strengthBlock: s.strength_block ?? [],
    warmup: s.warmup ?? [],
    mainSet: s.main_set ?? [],
    cooldown: s.cooldown ?? [],
    macros: {
      calories: s.diet?.calories ?? 0,
      proteinG: s.diet?.protein_g ?? 0,
      carbsG: s.diet?.carbs_g ?? 0,
      fatsG: s.diet?.fats_g ?? 0
    },
    meals: {
      breakfast: s.diet?.breakfast ?? "",
      preWorkoutSnack: s.diet?.pre_workout_snack ?? "",
      postWorkoutMeal: s.diet?.post_workout_meal ?? "",
      lunch: s.diet?.lunch ?? "",
      eveningSnack: s.diet?.evening_snack ?? "",
      dinner: s.diet?.dinner ?? "",
      hydrationLiters: s.diet?.hydration_liters ?? 0
    }
  };
}

function RoutineList({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="routineSection">
      <h3>{title}</h3>
      {items.length ? (
        <ol>
          {items.map((item, index) => <li key={`${title}-${index}`}>{item}</li>)}
        </ol>
      ) : (
        <p className="emptyText">No items planned yet.</p>
      )}
    </section>
  );
}

export default function HomePage() {
  const [authForm, setAuthForm] = useState({ email: "", password: "" });
  const [sessionToken, setSessionToken] = useState("");
  const [accountEmail, setAccountEmail] = useState("");
  const [form, setForm] = useState(defaultProfile);
  const [plan, setPlan] = useState<PlanDay[]>([]);
  const [profileId, setProfileId] = useState("");
  const [selectedSport, setSelectedSport] = useState("football");
  const [selectedDayKey, setSelectedDayKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const sportPlan = plan.filter((day) => day.sport === selectedSport);
  const selectedRoutine = sportPlan.find((day, index) => (day.id ?? `${day.day}-${index}`) === selectedDayKey) ?? sportPlan[0];

  async function loadAccountPlan(token: string) {
    const result = await getLatestPlanViaEdge(token);
    const loadedPlan: PlanDay[] = (result.sessions ?? []).map(normalizeSession);
    setPlan(loadedPlan);
    setProfileId(result.profile?.id ?? "");

    const firstSport = sportOptions.find((sport) => loadedPlan.some((day) => day.sport === sport.value))?.value ?? "football";
    const firstDay = loadedPlan.find((day) => day.sport === firstSport);
    setSelectedSport(firstSport);
    setSelectedDayKey(firstDay ? firstDay.id ?? `${firstDay.day}-0` : "");
  }

  async function handleAuth(mode: "signin" | "signup") {
    setLoading(true);
    setError("");
    try {
      const { data, error: authError } = mode === "signin"
        ? await supabaseClient.auth.signInWithPassword({ email: authForm.email, password: authForm.password })
        : await supabaseClient.auth.signUp({ email: authForm.email, password: authForm.password });

      if (authError) {
        throw authError;
      }

      const token = data.session?.access_token;
      if (!token) {
        setError("Check your email to confirm the account, then sign in.");
        return;
      }

      setSessionToken(token);
      setAccountEmail(data.user?.email ?? authForm.email);
      await loadAccountPlan(token);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Authentication failed.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSignOut() {
    await supabaseClient.auth.signOut();
    setSessionToken("");
    setAccountEmail("");
    setPlan([]);
    setProfileId("");
    setSelectedDayKey("");
  }

  async function handleCreatePlan() {
    if (!sessionToken) {
      setError("Sign in before creating your account plan.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const result = await generatePlanViaEdge(form, sessionToken);
      const nextPlan = result.plan ?? [];
      setPlan(nextPlan);
      setProfileId(result.profileId ?? "");
      const firstDay = nextPlan.find((day: PlanDay) => day.sport === selectedSport) ?? nextPlan[0];
      setSelectedSport(firstDay?.sport ?? "football");
      setSelectedDayKey(firstDay ? `${firstDay.day}-0` : "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create plan.");
    } finally {
      setLoading(false);
    }
  }

  function handleSportChange(sport: string) {
    setSelectedSport(sport);
    const firstDay = plan.find((day) => day.sport === sport);
    setSelectedDayKey(firstDay ? firstDay.id ?? `${firstDay.day}-0` : "");
  }

  return (
    <main className="appShell">
      <section className="topbar">
        <div>
          <p className="kicker">Account Based Training</p>
          <h1>Pick a sport. Pick a day. Start the routine.</h1>
          <p>Your workout and diet are loaded from your signed-in account.</p>
        </div>
        <div className="accountCard">
          {sessionToken ? (
            <>
              <span>Signed in as</span>
              <strong>{accountEmail}</strong>
              <button className="button secondaryButton" onClick={handleSignOut} type="button">Sign out</button>
            </>
          ) : (
            <>
              <span>Account</span>
              <input className="fieldInput" placeholder="email" value={authForm.email} onChange={(event) => setAuthForm({ ...authForm, email: event.target.value })} />
              <input className="fieldInput" placeholder="password" type="password" value={authForm.password} onChange={(event) => setAuthForm({ ...authForm, password: event.target.value })} />
              <div className="buttonRow">
                <button className="button" disabled={loading} onClick={() => handleAuth("signin")} type="button">Sign in</button>
                <button className="button secondaryButton" disabled={loading} onClick={() => handleAuth("signup")} type="button">Create account</button>
              </div>
            </>
          )}
        </div>
      </section>

      <section className="plannerPanel">
        <div className="selectorGrid">
          <label className="field">
            <span className="fieldLabel">Sports</span>
            <select className="fieldInput" value={selectedSport} onChange={(event) => handleSportChange(event.target.value)} disabled={!plan.length}>
              {sportOptions.map((sport) => <option key={sport.value} value={sport.value}>{sport.label}</option>)}
            </select>
          </label>

          <label className="field">
            <span className="fieldLabel">Day</span>
            <select className="fieldInput" value={selectedRoutine ? selectedRoutine.id ?? `${selectedRoutine.day}-0` : ""} onChange={(event) => setSelectedDayKey(event.target.value)} disabled={!sportPlan.length}>
              {sportPlan.map((day, index) => (
                <option key={day.id ?? `${day.day}-${index}`} value={day.id ?? `${day.day}-${index}`}>
                  {day.day} - {day.focus}
                </option>
              ))}
            </select>
          </label>

          <div className="planActions">
            <button className="button" onClick={() => sessionToken && loadAccountPlan(sessionToken)} disabled={!sessionToken || loading} type="button">Load my saved plan</button>
            {!plan.length ? <button className="button secondaryButton" onClick={handleCreatePlan} disabled={!sessionToken || loading} type="button">Create my first plan</button> : null}
          </div>
        </div>

        {error ? <p className="error">{error}</p> : null}
        {!sessionToken ? <p className="emptyText">Sign in to view the routine attached to your account.</p> : null}
        {sessionToken && !plan.length ? <p className="emptyText">No plan is saved yet. Create your first account plan once, then it will load from your account.</p> : null}

        {selectedRoutine ? (
          <div className="routineBoard">
            <header className="routineHeader">
              <div>
                <p className="kicker">Ready Workout</p>
                <h2>{selectedRoutine.sport.replace("_", " ")} - {selectedRoutine.focus}</h2>
                <p>{selectedRoutine.day}</p>
              </div>
              <div className="macroCard">
                <strong>{selectedRoutine.macros.calories} kcal</strong>
                <span>P {selectedRoutine.macros.proteinG}g / C {selectedRoutine.macros.carbsG}g / F {selectedRoutine.macros.fatsG}g</span>
              </div>
            </header>

            <div className="routineGrid">
              <div className="workoutStack">
                <RoutineList title="1. Warm-up" items={selectedRoutine.warmup} />
                <RoutineList title="2. Skill drills" items={selectedRoutine.sportDrills} />
                <RoutineList title="3. Strength training" items={selectedRoutine.strengthBlock} />
                <RoutineList title="4. Main workout" items={selectedRoutine.mainSet} />
                <RoutineList title="5. Cooldown" items={selectedRoutine.cooldown} />
              </div>

              <aside className="dietCard">
                <p className="kicker">Diet For This Day</p>
                <h3>Meals</h3>
                <dl>
                  <dt>Breakfast</dt><dd>{selectedRoutine.meals.breakfast}</dd>
                  <dt>Pre-workout</dt><dd>{selectedRoutine.meals.preWorkoutSnack}</dd>
                  <dt>Post-workout</dt><dd>{selectedRoutine.meals.postWorkoutMeal}</dd>
                  <dt>Lunch</dt><dd>{selectedRoutine.meals.lunch}</dd>
                  <dt>Snack</dt><dd>{selectedRoutine.meals.eveningSnack}</dd>
                  <dt>Dinner</dt><dd>{selectedRoutine.meals.dinner}</dd>
                  <dt>Hydration</dt><dd>{selectedRoutine.meals.hydrationLiters} L</dd>
                </dl>
              </aside>
            </div>
          </div>
        ) : null}
      </section>
    </main>
  );
}
