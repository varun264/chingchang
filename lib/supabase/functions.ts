const projectRef = "mttoicstadpjafzxgowq";
const baseUrl = `https://${projectRef}.functions.supabase.co`;

export async function generatePlanViaEdge(payload: {
  name: string;
  age: number;
  heightCm: number;
  weightKg: number;
  trainingDaysPerWeek: number;
  level: "beginner" | "intermediate" | "advanced";
  sessionMinutes: 30 | 45 | 60 | 90;
}) {
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const response = await fetch(`${baseUrl}/generate-plan`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: anon ?? "",
      Authorization: `Bearer ${anon ?? ""}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error ?? "Failed to generate plan.");
  }

  return response.json();
}

export async function getLatestPlanViaEdge(profileId: string) {
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const response = await fetch(`${baseUrl}/get-latest-plan?profileId=${encodeURIComponent(profileId)}`, {
    method: "GET",
    headers: {
      apikey: anon ?? "",
      Authorization: `Bearer ${anon ?? ""}`
    }
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error ?? "Failed to fetch latest plan.");
  }

  return response.json();
}
