// ── Weekly Reflections (Sunday retrospective) ───────────────────────────────
import { supabase, state, logActivity } from "./db.js";
import { esc, prettyDate, pad, $ } from "./util.js";
import { helpButton, wireHelp } from "./help.js";
import { reactionsHTML, wireReactions } from "./reactions.js";

function thisWeekStart(){
  const d = new Date();
  d.setDate(d.getDate() - d.getDay()); // back to Sunday
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}

export async function renderReflections(view){
  const week = thisWeekStart();
  const isSunday = new Date().getDay() === 0;

  const all = (await supabase.from("retrospectives").select("*")
    .order("week_start", { ascending:false }).order("created_at")).data || [];
  const mine = all.find(r => r.week_start === week && r.user_name === state.user.name);

  // group by week
  const weeks = [...new Set(all.map(r => r.week_start))];

  view.innerHTML = `
    <div class="spread"><h1>📝 Weekly Reflections</h1>${helpButton("reflections")}</div>
    ${isSunday ? `<div class="card" style="background:var(--gold-soft)">🌅 It's Sunday — time for your weekly retrospective!</div>` : ""}

    <div class="card">
      <h2 style="margin-top:0">Your reflection · week of ${prettyDate(week)}</h2>
      <form id="rForm">
        <label>What I learned</label><textarea name="learned">${esc(mine?.learned || "")}</textarea>
        <label>What I missed / struggled with</label><textarea name="missed">${esc(mine?.missed || "")}</textarea>
        <label>Plan for next week</label><textarea name="plan_next">${esc(mine?.plan_next || "")}</textarea>
        <button style="margin-top:8px">${mine ? "Update" : "Post"} reflection</button>
      </form>
    </div>

    ${weeks.map(w => `
      <h2>Week of ${prettyDate(w)}</h2>
      ${all.filter(r => r.week_start === w).map(r => `
        <div class="card">
          <b>${esc(r.user_name)}</b>
          ${r.learned   ? `<div style="margin-top:4px"><span class="muted">Learned:</span> ${esc(r.learned)}</div>` : ""}
          ${r.missed    ? `<div><span class="muted">Missed:</span> ${esc(r.missed)}</div>` : ""}
          ${r.plan_next ? `<div><span class="muted">Next week:</span> ${esc(r.plan_next)}</div>` : ""}
          ${reactionsHTML("reflection", r.id)}
        </div>`).join("")}`).join("") || ""}`;
  wireHelp(view, "reflections");
  wireReactions(view);

  $("#rForm", view).onsubmit = async e => {
    e.preventDefault();
    const f = e.target;
    const row = {
      user_name: state.user.name, week_start: week,
      learned: f.learned.value.trim(), missed: f.missed.value.trim(), plan_next: f.plan_next.value.trim(),
    };
    if (mine) await supabase.from("retrospectives").update(row).eq("id", mine.id);
    else { await supabase.from("retrospectives").insert(row); await logActivity("reflection", "posted a weekly reflection"); }
    renderReflections(view);
  };
}
