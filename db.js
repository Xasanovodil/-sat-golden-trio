// ── Supabase client + shared app state ──────────────────────────────────────
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// The logged-in friend (set after login/onboarding). Email is the key.
export const state = { user: null, online: [] };

// Record something for the live activity feed (Section 8).
export async function logActivity(kind, description){
  if (!state.user) return;
  await supabase.from("activity").insert({
    user_name: state.user.name, kind, description,
  });
}
