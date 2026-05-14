export async function generatePlanViaEdge(payload: {
  name: string;
  age: number;
  heightCm: number;
  weightKg: number;
  trainingDaysPerWeek: number;
  level: "beginner" | "intermediate" | "advanced";
  sessionMinutes: 30 | 45 | 60 | 90;
}, token: string) {
  const response = await fetch("/api/plan", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error ?? "Failed to generate plan.");
  }

  return response.json();
}

export async function getLatestPlanViaEdge(token: string) {
  const response = await fetch("/api/plan", {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error ?? "Failed to fetch latest plan.");
  }

  return response.json();
}

export async function logWorkout(token: string, sessionId: string, data: {
  completed: boolean;
  rpe?: number;
  fatigueScore?: number;
  mood?: "energized" | "good" | "neutral" | "tired" | "exhausted";
  notes?: string;
}) {
  const response = await fetch("/api/log", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ sessionId, ...data })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error ?? "Failed to log workout.");
  }

  return response.json();
}

export async function getProgress(token: string) {
  const response = await fetch("/api/log", {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error ?? "Failed to fetch progress.");
  }

  return response.json();
}