"use client";

import { useState } from "react";
import {
  generatePlanViaEdge,
  getLatestPlanViaEdge,
  logWorkout,
  getProgress
} from "@/lib/supabase/functions";
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

const sports = [
  { value: "all", label: "All Sports", icon: "🏆" },
  { value: "table_tennis", label: "Table Tennis", icon: "🏓" },
  { value: "badminton", label: "Badminton", icon: "🏸" },
  { value: "cricket", label: "Cricket", icon: "🏏" },
  { value: "football", label: "Football", icon: "⚽" },
  { value: "agility", label: "Agility", icon: "⚡" },
  { value: "strength", label: "Strength", icon: "💪" }
];

const defaultProfile = {
  name: "Varun", age: 20, heightCm: 172, weightKg: 68,
  trainingDaysPerWeek: 7, level: "intermediate" as const,
  sessionMinutes: 60 as 30 | 45 | 60 | 90
};

const mealKeys = [
  { key: "breakfast", label: "Breakfast" },
  { key: "preWorkoutSnack", label: "Pre-workout" },
  { key: "postWorkoutMeal", label: "Post-workout" },
  { key: "lunch", label: "Lunch" },
  { key: "eveningSnack", label: "Snack" },
  { key: "dinner", label: "Dinner" }
] as const;

const dayNames: Record<string, string> = {
  Monday: "Mon", Tuesday: "Tue", Wednesday: "Wed", Thursday: "Thu",
  Friday: "Fri", Saturday: "Sat", Sunday: "Sun"
};

const sportIcon: Record<string, string> = Object.fromEntries(sports.map((s) => [s.value, s.icon]));

function norm(s: any): PlanDay {
  return {
    id: s.id, day: s.day_label ?? s.session_date, sport: s.sport, focus: s.focus,
    sportDrills: s.sport_drills ?? [], strengthBlock: s.strength_block ?? [],
    warmup: s.warmup ?? [], mainSet: s.main_set ?? [], cooldown: s.cooldown ?? [],
    macros: { calories: s.diet?.calories ?? 0, proteinG: s.diet?.protein_g ?? 0, carbsG: s.diet?.carbs_g ?? 0, fatsG: s.diet?.fats_g ?? 0 },
    meals: { breakfast: s.diet?.breakfast ?? "", preWorkoutSnack: s.diet?.pre_workout_snack ?? "", postWorkoutMeal: s.diet?.post_workout_meal ?? "", lunch: s.diet?.lunch ?? "", eveningSnack: s.diet?.evening_snack ?? "", dinner: s.diet?.dinner ?? "", hydrationLiters: s.diet?.hydration_liters ?? 0 }
  };
}

function Badge({ children, color }: { children: string; color: string }) {
  return <span className={`badge badge-${color}`}>{children}</span>;
}

export default function HomePage() {
  const [authForm, setAuthForm] = useState({ email: "", password: "" });
  const [token, setToken] = useState("");
  const [email, setEmail] = useState("");
  const [form] = useState(defaultProfile);
  const [plan, setPlan] = useState<PlanDay[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [dark, setDark] = useState(false);
  const [sport, setSport] = useState("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [progress, setProgress] = useState<any>(null);
  const [aiGenerated, setAiGenerated] = useState(false);

  const sorted = [...plan].sort((a, b) => ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"].indexOf(a.day) - ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"].indexOf(b.day));
  const stats = progress?.stats ?? { total: 0, completed: 0, avgRPE: 0, streak: 0 };
  const sessions = progress?.sessions ?? [];
  const rate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  async function loadPlan(t: string) {
    const r = await getLatestPlanViaEdge(t);
    setPlan((r.sessions ?? []).map(norm));
  }
  async function loadProg(t: string) {
    try { setProgress(await getProgress(t)); } catch {}
  }
  async function auth(mode: "in" | "up") {
    setLoading(true); setError(""); setMsg("");
    try {
      const { data, error: e } = mode === "in"
        ? await supabaseClient.auth.signInWithPassword(authForm)
        : await supabaseClient.auth.signUp(authForm);
      if (e) throw e;
      const t = data.session?.access_token;
      if (!t) { setError("Check email to confirm, then sign in."); return; }
      setToken(t); setEmail(data.user?.email ?? authForm.email);
      await loadPlan(t); await loadProg(t);
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  }
  async function signOut() {
    await supabaseClient.auth.signOut();
    setToken(""); setEmail(""); setPlan([]); setProgress(null); setExpanded(null);
  }
  async function createPlan(s?: string) {
    if (!token) return;
    setLoading(true); setError(""); setMsg("");
    try {
      const r = await generatePlanViaEdge({ ...form, sport: s }, token);
      setPlan(r.plan ?? []);
      setAiGenerated(r.aiGenerated ?? false);
      setMsg(`Week plan for "${getLabel(s)}" created!`);
      setExpanded(r.plan?.[0]?.id ?? null);
      await loadProg(token);
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  }

  function getLabel(v?: string) {
    return sports.find((s) => s.value === (v ?? sport))?.label ?? v ?? "All Sports";
  }

  async function logWorkoutAction(sid: string) {
    if (!token || !sid) return;
    setLoading(true); setError("");
    try {
      await logWorkout(token, sid, { completed: true, rpe: 7, fatigueScore: 5, mood: "good" });
      setMsg("Logged!"); setTimeout(() => setMsg(""), 2000);
      await loadProg(token);
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  }

  return (
    <main className={`appShell ${dark ? "dark" : ""}`}>
      {/* Top Bar */}
      <section className="topbar">
        <div>
          <p className="kicker">Multi-Sport Training</p>
          <h1>Full week plan</h1>
          <p>Pick a sport below to see its dedicated 7-day schedule with workouts and diet.</p>
        </div>
        <div className="accountCard">
          {token ? (
            <>
              <span>Signed in as</span>
              <strong style={{fontSize:"0.9rem"}}>{email}</strong>
              <div className="row">
                <button className="toggleBtn" onClick={() => setDark(!dark)}>
                  <span className={`toggleTrack ${dark ? "toggleOn" : ""}`}><span className="toggleThumb" /></span>
                  {dark ? "☀️ Light" : "🌙 Dark"}
                </button>
                <button className="button secondaryButton" onClick={signOut}>Sign out</button>
              </div>
            </>
          ) : (
            <>
              <span>Account</span>
              <input className="fieldInput" placeholder="email" value={authForm.email} onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })} />
              <input className="fieldInput" placeholder="password" type="password" value={authForm.password} onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })} />
              <div className="row">
                <button className="button" disabled={loading} onClick={() => auth("in")}>Sign in</button>
                <button className="button secondaryButton" disabled={loading} onClick={() => auth("up")}>Create</button>
                <button className="toggleBtn" onClick={() => setDark(!dark)}>
                  <span className={`toggleTrack ${dark ? "toggleOn" : ""}`}><span className="toggleThumb" /></span>
                  {dark ? "☀️" : "🌙"}
                </button>
              </div>
            </>
          )}
        </div>
      </section>

      {/* Main */}
      <section className="plannerPanel">
        {/* Sport chips */}
        {token ? (
          <>
            <div className="chipRow">
              {sports.map((sp) => (
                <button key={sp.value} className={`chip ${sport === sp.value ? "chipActive" : ""}`}
                  onClick={() => { setSport(sp.value); setExpanded(null); }}>
                  <span className="chipIcon">{sp.icon}</span>
                  <span>{sp.label}</span>
                </button>
              ))}
            </div>

            {/* Action bar */}
            <div className="actionBar">
              <span className="chipLabel">
                {sport === "all" ? "Mixed week (1 per sport)" : `7-day ${getLabel()} week`}
              </span>
              <button className="button smallButton" onClick={() => createPlan(sport === "all" ? undefined : sport)}
                disabled={loading}>Generate {getLabel()} plan</button>
            </div>
          </>
        ) : null}

        {error ? <p className="error">{error}</p> : null}
        {msg ? <p className="successMsg">{msg} <span className={`badge ${aiGenerated ? "badge-green" : "badge-gray"}`}>{aiGenerated ? "AI" : "Template"}</span></p> : null}
        {!token ? <p className="emptyText">Sign in to see your 7-day weekly plan.</p> : null}
        {token && !plan.length ? (
          <div className="emptyState">
            <p className="emptyText">No plan saved. Generate one now.</p>
            <button className="button" disabled={loading} onClick={() => createPlan()}>Create my plan</button>
          </div>
        ) : null}

        {/* Week Grid */}
        {sorted.length > 0 ? (
          <div className="weekGrid">
            {sorted.map((day) => {
              const isOpen = expanded === (day.id ?? day.day);
              const log = sessions.find((s: any) => s.id === day.id)?.log;
              return (
                <div key={day.id ?? day.day}
                  className={`dayCard ${isOpen ? "dayOpen" : ""}`}
                  onClick={() => setExpanded(isOpen ? null : (day.id ?? day.day))}>
                  <div className="dayHeader">
                    <div className="dayMeta">
                      <span className="dayName">{dayNames[day.day] ?? day.day}</span>
                      {sport === "all" ? <span className="daySport">{sportIcon[day.sport]} {day.sport.replace("_"," ")}</span> : null}
                      <Badge color={log?.completed ? "green" : "gray"}>{log?.completed ? "✅" : day.focus}</Badge>
                    </div>
                    <span className="expandIcon">{isOpen ? "▲" : "▼"}</span>
                  </div>

                  {isOpen ? (
                    <div className="dayBody">
                      <div className="dayWorkout">
                        <h4>🏋️ Workout — {day.focus}</h4>
                        {[
                          ["Warm-up", day.warmup],
                          ["Skill drills", day.sportDrills],
                          ["Strength", day.strengthBlock],
                          ["Main set", day.mainSet],
                          ["Cooldown", day.cooldown]
                        ].map(([title, items]) => (
                          <div className="block" key={title as string}>
                            <strong>{title as string}</strong>
                            <div>{(items as string[]).map((i, idx) => <p key={idx}>• {i}</p>)}</div>
                          </div>
                        ))}
                      </div>
                      <div className="dayDiet">
                        <h4>🥗 Diet</h4>
                        <div className="macroRow"><span>Calories</span><strong>{day.macros.calories}</strong></div>
                        <div className="macroRow"><span>Protein</span><strong>{day.macros.proteinG}g</strong></div>
                        <div className="macroRow"><span>Carbs</span><strong>{day.macros.carbsG}g</strong></div>
                        <div className="macroRow"><span>Fats</span><strong>{day.macros.fatsG}g</strong></div>
                        <div className="macroRow"><span>Hydration</span><strong>{day.meals.hydrationLiters}L</strong></div>
                        <div className="mealList">
                          {mealKeys.map(({ key, label }) => (
                            <div key={key} className="mealItem">
                              <span className="mealLabel">{label}</span>
                              <span>{(day.meals as any)[key]}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="dayActions">
                        {log?.completed ? <Badge color="green">✅ Logged</Badge> : null}
                        <button className="button smallButton" onClick={(e) => { e.stopPropagation(); logWorkoutAction(day.id ?? ""); }}
                          disabled={loading || !day.id}>Log complete</button>
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : null}

        {/* Progress */}
        {token && plan.length > 0 ? (
          <div className="progressSection">
            <h3>📊 Progress</h3>
            <div className="statsRow">
              <div className="statMini"><span className="statNum">{stats.total}</span>Total</div>
              <div className="statMini"><span className="statNum green">{stats.completed}</span>Done</div>
              <div className="statMini"><span className="statNum blue">{stats.avgRPE}</span>Avg RPE</div>
              <div className="statMini"><span className="statNum gold">{stats.streak}🔥</span>Streak</div>
              <div className="statMini"><span className="statNum">{rate}%</span>Rate</div>
            </div>
            <div className="completionBarWrap">
              <div className="completionBar"><div className="completionFill" style={{ width: `${rate}%` }} /></div>
            </div>
          </div>
        ) : null}
      </section>
    </main>
  );
}