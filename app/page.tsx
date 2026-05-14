"use client";

import { useState } from "react";
import { generatePlanViaEdge, getLatestPlanViaEdge, logWorkout, getProgress } from "@/lib/supabase/functions";
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

function Badge({ children, color }: { children: React.ReactNode; color: string }) {
  return <span className={`badge badge-${color}`}>{children}</span>;
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
  const [activeTab, setActiveTab] = useState<"routine" | "log" | "progress">("routine");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Log state
  const [logData, setLogData] = useState({
    completed: true,
    rpe: 7,
    fatigueScore: 5,
    mood: "good" as const,
    notes: ""
  });
  const [progressData, setProgressData] = useState<any>(null);

  const sportPlan = plan.filter((day) => day.sport === selectedSport);
  const selectedRoutine =
    sportPlan.find((day, index) => (day.id ?? `${day.day}-${index}`) === selectedDayKey) ??
    sportPlan[0];

  async function loadAccountPlan(token: string) {
    const result = await getLatestPlanViaEdge(token);
    const loadedPlan: PlanDay[] = (result.sessions ?? []).map(normalizeSession);
    setPlan(loadedPlan);
    setProfileId(result.profile?.id ?? "");

    const firstSport =
      sportOptions.find((sport) => loadedPlan.some((day) => day.sport === sport.value))
        ?.value ?? "football";
    const firstDay = loadedPlan.find((day) => day.sport === firstSport);
    setSelectedSport(firstSport);
    setSelectedDayKey(firstDay ? firstDay.id ?? `${firstDay.day}-0` : "");
  }

  async function loadProgress(token: string) {
    try {
      const result = await getProgress(token);
      setProgressData(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load progress.");
    }
  }

  async function handleAuth(mode: "signin" | "signup") {
    setLoading(true);
    setError("");
    setSuccessMsg("");
    try {
      const { data, error: authError } = mode === "signin"
        ? await supabaseClient.auth.signInWithPassword({ email: authForm.email, password: authForm.password })
        : await supabaseClient.auth.signUp({ email: authForm.email, password: authForm.password });

      if (authError) throw authError;

      const token = data.session?.access_token;
      if (!token) {
        setError("Check your email to confirm the account, then sign in.");
        return;
      }

      setSessionToken(token);
      setAccountEmail(data.user?.email ?? authForm.email);
      await loadAccountPlan(token);
      await loadProgress(token);
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
    setProgressData(null);
    setActiveTab("routine");
  }

  async function handleCreatePlan() {
    if (!sessionToken) return;
    setLoading(true);
    setError("");
    setSuccessMsg("");
    try {
      const result = await generatePlanViaEdge(form, sessionToken);
      const nextPlan = result.plan ?? [];
      setPlan(nextPlan);
      setProfileId(result.profileId ?? "");
      const firstDay = nextPlan.find((day: PlanDay) => day.sport === selectedSport) ?? nextPlan[0];
      setSelectedSport(firstDay?.sport ?? "football");
      setSelectedDayKey(firstDay ? `${firstDay.day}-${nextPlan.indexOf(firstDay)}` : "");
      setSuccessMsg("Plan created! Check your routine below.");
      await loadProgress(sessionToken);
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

  async function handleLogSubmit() {
    if (!sessionToken || !selectedRoutine?.id) return;
    setLoading(true);
    setError("");
    try {
      await logWorkout(sessionToken, selectedRoutine.id, logData);
      setSuccessMsg("Workout logged!");
      setTimeout(() => setSuccessMsg(""), 3000);
      await loadProgress(sessionToken);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not log workout.");
    } finally {
      setLoading(false);
    }
  }

  const stats = progressData?.stats ?? { total: 0, completed: 0, avgRPE: 0, streak: 0 };
  const sessions = progressData?.sessions ?? [];
  const completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  return (
    <main className="appShell">
      {/* Top Bar */}
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
              <input className="fieldInput" placeholder="email" value={authForm.email} onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })} />
              <input className="fieldInput" placeholder="password" type="password" value={authForm.password} onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })} />
              <div className="buttonRow">
                <button className="button" disabled={loading} onClick={() => handleAuth("signin")} type="button">Sign in</button>
                <button className="button secondaryButton" disabled={loading} onClick={() => handleAuth("signup")} type="button">Create account</button>
              </div>
            </>
          )}
        </div>
      </section>

      {/* Planner Panel */}
      <section className="plannerPanel">
        <div className="selectorGrid">
          <label className="field">
            <span className="fieldLabel">Sports</span>
            <select className="fieldInput" value={selectedSport} onChange={(e) => handleSportChange(e.target.value)} disabled={!plan.length}>
              {sportOptions.map((sport) => (
                <option key={sport.value} value={sport.value}>{sport.label}</option>
              ))}
            </select>
          </label>

          <label className="field">
            <span className="fieldLabel">Day</span>
            <select className="fieldInput" value={selectedRoutine ? selectedRoutine.id ?? `${selectedRoutine.day}-0` : ""} onChange={(e) => setSelectedDayKey(e.target.value)} disabled={!sportPlan.length}>
              {sportPlan.map((day, index) => (
                <option key={day.id ?? `${day.day}-${index}`} value={day.id ?? `${day.day}-${index}`}>
                  {day.day} — {day.focus}
                </option>
              ))}
            </select>
          </label>

          <div className="planActions">
            <button className="button" onClick={() => sessionToken && loadAccountPlan(sessionToken)} disabled={!sessionToken || loading} type="button">Load my plan</button>
            {!plan.length ? <button className="button secondaryButton" onClick={handleCreatePlan} disabled={!sessionToken || loading} type="button">Create my plan</button> : null}
          </div>
        </div>

        {error ? <p className="error">{error}</p> : null}
        {successMsg ? <p className="successMsg">{successMsg}</p> : null}
        {!sessionToken ? <p className="emptyText">Sign in to view your routine.</p> : null}
        {sessionToken && !plan.length ? <p className="emptyText">No plan saved yet. Create your first plan above.</p> : null}

        {/* Tabs: Routine / Log / Progress */}
        {selectedRoutine && (
          <>
            <div className="tabPanel" role="tablist" aria-label="Dashboard sections">
              <button className={activeTab === "routine" ? "tab activeTab" : "tab"} onClick={() => setActiveTab("routine")} type="button">Routine</button>
              <button className={activeTab === "log" ? "tab activeTab" : "tab"} onClick={() => setActiveTab("log")} type="button">Log Workout</button>
              <button className={activeTab === "progress" ? "tab activeTab" : "tab"} onClick={() => setActiveTab("progress")} type="button">Progress</button>
            </div>

            {/* Routine Tab */}
            {activeTab === "routine" && (
              <div className="routineBoard">
                <header className="routineHeader">
                  <div>
                    <p className="kicker">Ready Workout</p>
                    <h2>{selectedRoutine.sport.replace("_", " ")} — {selectedRoutine.focus}</h2>
                    <p>{selectedRoutine.day}</p>
                  </div>
                  <div className="macroCard">
                    <strong>{selectedRoutine.macros.calories} kcal</strong>
                    <span>P&nbsp;{selectedRoutine.macros.proteinG}g / C&nbsp;{selectedRoutine.macros.carbsG}g / F&nbsp;{selectedRoutine.macros.fatsG}g</span>
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
            )}

            {/* Log Workout Tab */}
            {activeTab === "log" && (
              <div className="logBoard">
                <h3>Log This Workout</h3>
                <div className="logGrid">
                  <label className="logField">
                    <span className="fieldLabel">Completed</span>
                    <div className="checkboxWrap">
                      <input type="checkbox" checked={logData.completed} onChange={(e) => setLogData({ ...logData, completed: e.target.checked })} />
                      <span>{logData.completed ? "✅ Completed" : "❌ Skipped"}</span>
                    </div>
                  </label>

                  <label className="logField">
                    <span className="fieldLabel">RPE (1–10)</span>
                    <input className="fieldInput" type="range" min={1} max={10} value={logData.rpe} onChange={(e) => setLogData({ ...logData, rpe: Number(e.target.value) })} />
                    <span className="rangeValue">{logData.rpe}</span>
                  </label>

                  <label className="logField">
                    <span className="fieldLabel">Fatigue (1–10)</span>
                    <input className="fieldInput" type="range" min={1} max={10} value={logData.fatigueScore} onChange={(e) => setLogData({ ...logData, fatigueScore: Number(e.target.value) })} />
                    <span className="rangeValue">{logData.fatigueScore}</span>
                  </label>

                  <label className="logField">
                    <span className="fieldLabel">Mood</span>
                    <select className="fieldInput" value={logData.mood} onChange={(e) => setLogData({ ...logData, mood: e.target.value as any })}>
                      <option value="energized">⚡ Energized</option>
                      <option value="good">😊 Good</option>
                      <option value="neutral">😐 Neutral</option>
                      <option value="tired">😴 Tired</option>
                      <option value="exhausted">💀 Exhausted</option>
                    </select>
                  </label>

                  <label className="logField logFieldFull">
                    <span className="fieldLabel">Notes</span>
                    <textarea className="fieldInput logTextarea" rows={3} placeholder="How did it feel?..." value={logData.notes} onChange={(e) => setLogData({ ...logData, notes: e.target.value })} />
                  </label>
                </div>

                <button className="button logSubmitBtn" onClick={handleLogSubmit} disabled={loading} type="button">
                  {loading ? "Saving..." : "Save Workout Log"}
                </button>
              </div>
            )}

            {/* Progress Tab */}
            {activeTab === "progress" && (
              <div className="progressBoard">
                <h3>Your Progress</h3>

                <div className="statsGrid">
                  <div className="statCard">
                    <div className="statNumber">{stats.total}</div>
                    <div className="statLabel">Total Sessions</div>
                  </div>
                  <div className="statCard">
                    <div className="statNumber statGreen">{stats.completed}</div>
                    <div className="statLabel">Completed</div>
                  </div>
                  <div className="statCard">
                    <div className="statNumber statBlue">{stats.avgRPE}</div>
                    <div className="statLabel">Avg RPE</div>
                  </div>
                  <div className="statCard">
                    <div className="statNumber statGold">{stats.streak} 🔥</div>
                    <div className="statLabel">Current Streak</div>
                  </div>
                </div>

                <div className="completionBarWrap">
                  <div className="completionLabel">
                    <span>Completion Rate</span>
                    <strong>{completionRate}%</strong>
                  </div>
                  <div className="completionBar">
                    <div className="completionFill" style={{ width: `${completionRate}%` }} />
                  </div>
                </div>

                <div className="recentSessions">
                  <h4>Recent Sessions</h4>
                  {sessions.length === 0 ? (
                    <p className="emptyText">No sessions logged yet.</p>
                  ) : (
                    <ol className="sessionList">
                      {sessions.map((s: any, i: number) => (
                        <li key={i} className="sessionItem">
                          <div className="sessionInfo">
                            <Badge color={s.log?.completed ? "green" : "gray"}>
                              {s.log?.completed ? "Done" : "Missed"}
                            </Badge>
                            <span className="sessionSport">{s.sport.replace("_", " ")}</span>
                            <span className="sessionDay">{s.day_label ?? s.session_date}</span>
                            <span className="sessionFocus">{s.focus}</span>
                          </div>
                          {s.log && (
                            <div className="sessionLogInfo">
                              <Badge color="blue">RPE {s.log.rpe ?? "—"}</Badge>
                              <Badge color="gold">{s.log.mood ?? "—"}</Badge>
                            </div>
                          )}
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}