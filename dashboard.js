// ── Section 7: Shared Dashboard (everyone side by side, no ranking) ─────────
import { supabase } from "../db.js";
import { esc, todayStr, addDays } from "../util.js";
import { helpButton, wireHelp } from "../help.js";

export async function renderDashboard(view){
  const [users, tests, activity, reviews, questions, mastery] = await Promise.all([
    supabase.from("users").select("*").order("created_at").then(r => r.data || []),
    supabase.from("practice_tests").select("user_name,total,taken_on").then(r => r.data || []),
    supabase.from("activity").select("user_name,created_at").then(r => r.data || []),
    supabase.from("vocab_reviews").select("user_name,status").then(r => r.data || []),
    supabase.from("questions").select("user_name").then(r => r.data || []),
    supabase.from("mastery").select("user_name,rate").then(r => r.data || []),
  ]);

  const card = u => {
    const name = u.name;
    const myTests = tests.filter(t => t.user_name === name).sort((a, b) => a.taken_on.localeCompare(b.taken_on));
    const latest  = myTests.length ? myTests[myTests.length - 1].total : "—";
    const mastered = reviews.filter(r => r.user_name === name && r.status === "mastered").length;
    const qPosted  = questions.filter(q => q.user_name === name).length;
    const myMast   = mastery.filter(m => m.user_name === name);
    const avgMast  = myMast.length ? Math.round(myMast.reduce((s, m) => s + m.rate, 0) / myMast.length) : 0;
    const days     = activity.filter(a => a.user_name === name).map(a => a.created_at.slice(0, 10));
    const s        = streak(days);

    return `<div class="card">
      <div class="spread"><b style="font-size:1.05rem">${esc(name)}</b><span class="chip">🔥 ${s}-day streak</span></div>
      ${u.motto ? `<div class="muted" style="font-style:italic">“${esc(u.motto)}”</div>` : ""}
      <div class="row" style="margin-top:8px;gap:14px;font-size:.85rem">
        <span><b>${u.current_score ?? "—"}</b><br><span class="muted">current</span></span>
        <span><b>${u.goal_score ?? "—"}</b><br><span class="muted">goal</span></span>
        <span><b>${latest}</b><br><span class="muted">latest test</span></span>
        <span><b>${mastered}</b><br><span class="muted">vocab mastered</span></span>
        <span><b>${qPosted}</b><br><span class="muted">questions</span></span>
      </div>
      <div class="barwrap" style="margin-top:10px"><span class="lab">Mastery</span>
        <div class="bar" style="width:${avgMast}%"></div><span>${avgMast}%</span></div>
    </div>`;
  };

  view.innerHTML = `
    <div class="spread"><h1>👥 Shared Dashboard</h1>${helpButton("dashboard")}</div>
    <p class="sub">Everyone side by side. No ranking — just how the group is doing.</p>
    ${users.map(card).join("") || '<p class="muted">No one has joined yet.</p>'}`;
  wireHelp(view, "dashboard");
}

// consecutive days (ending today or yesterday) with at least one activity
function streak(dates){
  const set = new Set(dates);
  let d = todayStr();
  if (!set.has(d)) d = addDays(d, -1);
  let s = 0;
  while (set.has(d)){ s++; d = addDays(d, -1); }
  return s;
}
