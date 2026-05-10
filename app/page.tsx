"use client";

import { useState } from "react";
import { generatePlanViaEdge, getLatestPlanViaEdge } from "@/lib/supabase/functions";
import { supabaseClient } from "@/lib/supabase/client";

type PlanDay = {
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
  { value: "all", label: "All sports" },
  { value: "table_tennis", label: "Table Tennis" },
  { value: "badminton", label: "Badminton" },
  { value: "cricket", label: "Cricket" },
  { value: "football", label: "Football" },
  { value: "agility", label: "Agility" },
  { value: "strength", label: "Strength" }
];

const tabs = [
  { value: "skill", label: "Skill drills" },
  { value: "strength", label: "Strength training" },
  { value: "diet", label: "Diet" }
] as const;

export default function HomePage() {
  const [authForm, setAuthForm] = useState({ email: "", password: "" });
  const [sessionToken, setSessionToken] = useState("");
  const [accountEmail, setAccountEmail] = useState("");
  const [form, setForm] = useState({
    name: "Varun",
    age: 20,
    heightCm: 172,
    weightKg: 68,
    trainingDaysPerWeek: 7,
    level: "intermediate" as "beginner" | "intermediate" | "advanced",
    sessionMinutes: 60 as 30 | 45 | 60 | 90
  });
  const [plan, setPlan] = useState<PlanDay[]>([]);
  const [profileId, setProfileId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [customInput, setCustomInput] = useState<Record<string, { drill: string; strength: string; diet: string }>>({});
  const [selectedSport, setSelectedSport] = useState("all");
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]["value"]>("skill");

  const visiblePlan = selectedSport === "all" ? plan : plan.filter((day) => day.sport === selectedSport);

  async function loadAccountPlan(token: string) {
    const result = await getLatestPlanViaEdge(token);
    const fromSessions = (result.sessions ?? []).map((s: any): PlanDay => ({
      day: s.session_date,
      sport: s.sport,
      focus: s.focus,
      sportDrills: [],
      strengthBlock: [],
      warmup: s.warmup,
      mainSet: s.main_set,
      cooldown: s.cooldown,
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
    }));
    setPlan(fromSessions);
    setProfileId(result.profile?.id ?? "");
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
  }

  function addCustomItem(index: number, kind: "drill" | "strength" | "diet") {
    const key = String(index);
    const value = customInput[key]?.[kind]?.trim();
    if (!value) {
      return;
    }

    setPlan((prev) =>
      prev.map((day, i) => {
        if (i !== index) {
          return day;
        }
        if (kind === "drill") {
          return { ...day, sportDrills: [...(day.sportDrills ?? []), value] };
        }
        if (kind === "strength") {
          return { ...day, strengthBlock: [...(day.strengthBlock ?? []), value] };
        }
        return { ...day, meals: { ...day.meals, dinner: `${day.meals.dinner}; ${value}` } };
      })
    );

    setCustomInput((prev) => ({ ...prev, [key]: { ...prev[key], [kind]: "" } }));
  }

  async function handleGenerate() {
    if (!sessionToken) {
      setError("Sign in before creating or updating your plan.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const result = await generatePlanViaEdge(form, sessionToken);
      setPlan(result.plan ?? []);
      setProfileId(result.profileId ?? "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not generate plan.");
    } finally {
      setLoading(false);
    }
  }

  async function handleFetchLatest() {
    if (!sessionToken) {
      setError("Sign in to load your account plan.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await loadAccountPlan(sessionToken);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load latest plan.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="container">
      <section className="hero">
        <div className="heroTop">
          <div>
            <p className="kicker">Performance Planner</p>
            <h1>Train like an all-round athlete</h1>
            <p>Sport-specific drills, strength work, and diet plans for TT, badminton, cricket, football, agility, and gym training.</p>
          </div>
          <div className="heroBadge">ADMIN: {form.name.toUpperCase()}</div>
        </div>

        <div className="dashboardControls">
          <div className="authPanel">
            {sessionToken ? (
              <>
                <span>Signed in</span>
                <strong>{accountEmail}</strong>
                <button className="button secondaryButton" onClick={handleSignOut} type="button">Sign out</button>
              </>
            ) : (
              <>
                <span>Account</span>
                <input className="fieldInput" placeholder="email" value={authForm.email} onChange={(event) => setAuthForm({ ...authForm, email: event.target.value })} />
                <input className="fieldInput" placeholder="password" type="password" value={authForm.password} onChange={(event) => setAuthForm({ ...authForm, password: event.target.value })} />
                <div className="authActions">
                  <button className="button" disabled={loading} onClick={() => handleAuth("signin")} type="button">Sign in</button>
                  <button className="button secondaryButton" disabled={loading} onClick={() => handleAuth("signup")} type="button">Create account</button>
                </div>
              </>
            )}
          </div>

          <details className="dropdownPanel">
            <summary>Profile</summary>
            <div className="dropdownBody">
              <p><strong>{form.name}</strong> - admin profile</p>
              <p>{form.age} yrs, {form.heightCm} cm, {form.weightKg} kg</p>
              <p>{form.trainingDaysPerWeek} training days/week</p>
              <p>{form.level} level, {form.sessionMinutes} min sessions</p>
            </div>
          </details>

          <label className="selectPanel">
            <span>Sports</span>
            <select value={selectedSport} onChange={(event) => setSelectedSport(event.target.value)}>
              {sportOptions.map((sport) => (
                <option key={sport.value} value={sport.value}>{sport.label}</option>
              ))}
            </select>
          </label>

          <div className="tabPanel" role="tablist" aria-label="Sport sections">
            {tabs.map((tab) => (
              <button
                className={activeTab === tab.value ? "tab activeTab" : "tab"}
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                type="button"
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="targets">
          <div className="targetCard">
            <div className="targetLabel">Training Days</div>
            <div className="targetValue">{form.trainingDaysPerWeek}/week</div>
          </div>
          <div className="targetCard">
            <div className="targetLabel">Body Weight</div>
            <div className="targetValue">{form.weightKg} kg</div>
          </div>
          <div className="targetCard">
            <div className="targetLabel">Primary Goal</div>
            <div className="targetValue">All-round athleticism</div>
          </div>
        </div>

        <div className="targets formGrid">
          <label className="field targetCard">
            <span className="fieldLabel">Name</span>
            <input className="fieldInput" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </label>
          <label className="field targetCard">
            <span className="fieldLabel">Age</span>
            <input className="fieldInput" type="number" value={form.age} onChange={(e) => setForm({ ...form, age: Number(e.target.value) })} />
          </label>
          <label className="field targetCard">
            <span className="fieldLabel">Height (cm)</span>
            <input className="fieldInput" type="number" value={form.heightCm} onChange={(e) => setForm({ ...form, heightCm: Number(e.target.value) })} />
          </label>
          <label className="field targetCard">
            <span className="fieldLabel">Weight (kg)</span>
            <input className="fieldInput" type="number" value={form.weightKg} onChange={(e) => setForm({ ...form, weightKg: Number(e.target.value) })} />
          </label>
          <label className="field targetCard">
            <span className="fieldLabel">Training days/week</span>
            <input
              className="fieldInput"
              type="number"
              min={1}
              max={7}
              value={form.trainingDaysPerWeek}
              onChange={(e) => setForm({ ...form, trainingDaysPerWeek: Number(e.target.value) })}
            />
          </label>
          <label className="field targetCard">
            <span className="fieldLabel">Level</span>
            <select className="fieldInput" value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value as "beginner" | "intermediate" | "advanced" })}>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </label>
          <label className="field targetCard">
            <span className="fieldLabel">Session duration</span>
            <select className="fieldInput" value={form.sessionMinutes} onChange={(e) => setForm({ ...form, sessionMinutes: Number(e.target.value) as 30 | 45 | 60 | 90 })}>
              <option value={30}>30 min</option>
              <option value={45}>45 min</option>
              <option value={60}>60 min</option>
              <option value={90}>90 min</option>
            </select>
          </label>
        </div>

        <div className="actions">
          <button onClick={handleGenerate} disabled={loading} className="button">
            {loading ? "Working..." : "Create / update my account plan"}
          </button>
          <button onClick={handleFetchLatest} disabled={loading} className="button">
            Load my saved plan
          </button>
          {profileId ? <span className="profileChip">Profile: {profileId}</span> : null}
        </div>
        {error ? <p className="error">{error}</p> : null}
      </section>

      <section className="days">
        {visiblePlan.map((day, index) => {
          const planIndex = plan.findIndex((item) => item.day === day.day && item.sport === day.sport && item.focus === day.focus);
          const itemIndex = planIndex >= 0 ? planIndex : index;

          return (
          <article className="card" key={`${day.day}-${day.sport}-${index}`}>
            <div className="cardHead">
              <h3>{day.day}</h3>
              <div className="pill">{day.sport.replace("_", " ")} - {day.focus}</div>
            </div>

            {activeTab === "skill" ? (
              <div className="sectionBlock">
                <h4>Skill Drills</h4>
                <ul>
                  <li><strong>Sport drills:</strong> {(day.sportDrills ?? []).join(" | ") || "Generated for new plans"}</li>
                  <li><strong>Warm-up:</strong> {day.warmup.join(" | ")}</li>
                  <li><strong>Main set:</strong> {day.mainSet.join(" | ")}</li>
                  <li><strong>Cooldown:</strong> {day.cooldown.join(" | ")}</li>
                </ul>
                <div className="actions cardActions">
                  <input
                    className="fieldInput"
                    placeholder="Add custom drill"
                    value={customInput[String(itemIndex)]?.drill ?? ""}
                    onChange={(e) => setCustomInput((prev) => ({ ...prev, [String(itemIndex)]: { ...prev[String(itemIndex)], drill: e.target.value } }))}
                  />
                  <button className="button" onClick={() => addCustomItem(itemIndex, "drill")}>Add drill</button>
                </div>
              </div>
            ) : null}

            {activeTab === "strength" ? (
              <div className="sectionBlock">
                <h4>Strength Training</h4>
                <ul>
                  <li><strong>Strength block:</strong> {(day.strengthBlock ?? []).join(" | ") || "Generated for new plans"}</li>
                </ul>
                <div className="actions cardActions">
                  <input
                    className="fieldInput"
                    placeholder="Add strength exercise"
                    value={customInput[String(itemIndex)]?.strength ?? ""}
                    onChange={(e) => setCustomInput((prev) => ({ ...prev, [String(itemIndex)]: { ...prev[String(itemIndex)], strength: e.target.value } }))}
                  />
                  <button className="button" onClick={() => addCustomItem(itemIndex, "strength")}>Add strength</button>
                </div>
              </div>
            ) : null}

            {activeTab === "diet" ? (
              <div className="sectionBlock">
                <h4>Diet</h4>
                <ul>
                  <li><strong>Macros:</strong> {day.macros.calories} kcal, P {day.macros.proteinG}g, C {day.macros.carbsG}g, F {day.macros.fatsG}g</li>
                  <li><strong>Meals:</strong> {day.meals.breakfast}; {day.meals.preWorkoutSnack}; {day.meals.postWorkoutMeal}; {day.meals.lunch}; {day.meals.eveningSnack}; {day.meals.dinner}</li>
                  <li><strong>Hydration:</strong> {day.meals.hydrationLiters} L/day</li>
                </ul>
                <div className="actions cardActions">
                  <input
                    className="fieldInput"
                    placeholder="Add diet item"
                    value={customInput[String(itemIndex)]?.diet ?? ""}
                    onChange={(e) => setCustomInput((prev) => ({ ...prev, [String(itemIndex)]: { ...prev[String(itemIndex)], diet: e.target.value } }))}
                  />
                  <button className="button" onClick={() => addCustomItem(itemIndex, "diet")}>Add diet</button>
                </div>
              </div>
            ) : null}
          </article>
          );
        })}
      </section>
    </main>
  );
}
