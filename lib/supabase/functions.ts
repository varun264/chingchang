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
