const base = "https://mttoicstadpjafzxgowq.functions.supabase.co";

export async function generatePlanViaEdge(payload: {
  name: string;
  age: number;
  heightCm: number;
  weightKg: number;
  trainingDaysPerWeek: number;
  level: "beginner" | "intermediate" | "advanced";
  sessionMinutes: 30 | 45 | 60 | 90;
}, token: string) {
  const response = await fetch(`${base}/generate-plan`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload)
  });
  if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error ?? "Failed to generate plan.");
  return response.json();
}

export async function getLatestPlanViaEdge(token: string) {
  const response = await fetch(`${base}/get-latest-plan`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error ?? "Failed to fetch plan.");
  return response.json();
}

export async function logWorkout(token: string, sessionId: string, data: {
  completed: boolean;
  rpe?: number;
  fatigueScore?: number;
  mood?: "energized" | "good" | "neutral" | "tired" | "exhausted";
  notes?: string;
}) {
  const response = await fetch(`${base}/log-workout`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ sessionId, ...data })
  });
  if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error ?? "Failed to log workout.");
  return response.json();
}

export async function getProgress(token: string) {
  const response = await fetch(`${base}/get-progress`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error ?? "Failed to fetch progress.");
  return response.json();
}
