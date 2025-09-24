export type EmotionEntry = {
  week: number;
  emotion: {
    stamina: number;
    knowledge: number;
    stress: number;
    happy: number;
    sleep: number;
    social: number;
  };
  lab_assessment: {
    score: number;
    max_score: number;
    topic: string;
    correct_answers: number;
    total_questions: number;
    week: number;
  };
  weekly_desc: string;
};

export type LocationRecord = {
  time: string;
  location?: string | null;
  location_des?: string | null;
  activity?: string | null;
};

// Use environment variable for API base URL, with smart detection for different environments
const API_BASE = (import.meta as any).env.VITE_API_BASE || (() => {
  const hostname = window.location.hostname;
  
  // GitHub Codespaces detection
  if (hostname.includes('preview.app.github.dev')) {
    // Extract codespace name from hostname and construct API URL
    const codespaceName = hostname.split('-')[0];
    return `https://${codespaceName}-8089.preview.app.github.dev`;
  }
  
  // Local development
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return "http://127.0.0.1:8089";
  }
  
  // GitHub Pages - you'll need to update this with your actual API server URL
  return "https://your-api-server.herokuapp.com";
})();

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(`API ${path} ${res.status}`);
  return (await res.json()) as T;
}

export async function listUsers(): Promise<string[]> {
  const data = await getJson<{ users: string[] }>("/api/users");
  return data.users;
}

export async function listWeeks(userId: string): Promise<number[]> {
  const data = await getJson<{ weeks: number[] }>(`/api/${userId}/weeks`);
  return data.weeks;
}

export async function getDays(userId: string, week: number): Promise<string[]> {
  const data = await getJson<{ days: string[] }>(`/api/${userId}/week/${week}/days`);
  return data.days;
}

export async function getLocations(
  userId: string,
  week: number,
  day?: string
): Promise<LocationRecord[]> {
  const q = day ? `?day=${encodeURIComponent(day)}` : "";
  const data = await getJson<{ records: LocationRecord[] }>(
    `/api/${userId}/week/${week}/locations${q}`
  );
  return data.records;
}

export async function getEmotions(userId: string): Promise<EmotionEntry[]> {
  const data = await getJson<{ entries: EmotionEntry[] }>(`/api/${userId}/emotions`);
  return data.entries;
}

export type StatusRecord = { time: string; value: number | null; week?: number | null; day_offset?: number | null };

export async function getStatus(
  userId: string,
  kind: "sleep" | "social" | "stress",
  opts?: { week?: number; day?: string }
): Promise<StatusRecord[]> {
  const q = new URLSearchParams();
  if (opts?.week != null) q.set("week", String(opts.week));
  if (opts?.day) q.set("day", opts.day);
  const qs = q.toString();
  const data = await getJson<{ records: StatusRecord[] }>(
    `/api/${userId}/status/${kind}${qs ? `?${qs}` : ""}`
  );
  return data.records;
}

export type UserProfile = {
  user_id: string;
  display_name: string;
  big_five: {
    openness: number;
    conscientiousness: number;
    extraversion: number;
    agreeableness: number;
    neuroticism: number;
  };
  enrolled_classes: Array<{
    code: string;
    name: string;
    credits: number;
  }>;
};

export async function getUserProfile(userId: string): Promise<UserProfile> {
  const data = await getJson<UserProfile>(`/api/${userId}/profile`);
  return data;
}


