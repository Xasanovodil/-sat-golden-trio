// ── Section 1: Shared Study Plan ────────────────────────────────────────────
import { supabase, state, logActivity } from "./db.js";
import { SAT_DATE } from "./config.js";
import { esc, prettyDate, timeAgo, todayStr, addDays, modal, $ } from "./util.js";
import { helpButton, wireHelp } from "./help.js";

export async function renderPlan(view){
  const today  = todayStr();
  const satDay = SAT_DATE.slice(0, 10);

  const [users, days, notes, mastery] = await Promise.all([
    supabase.from("users").select("email,name").then(r => r.data || []),
    supabase.from("plan_days").select("*").then(r => r.data || []),
    supabase.from("plan_notes").select("*").order("created_at").then(r => r.data || []),
    supabase.from("mastery").select("*").then(r => r.data || []),
  ]);

  const taskFor = d => days.find(x => x.day === d);
  const notesFor = d => notes.filter(n => n.day === d);
  const mastFor = d => mastery.filter(m => m.day === d);

  // upcoming = today → SAT (capped); past = existing days before today
  const upcoming = [];
  let d = today;
  while (d <= satDay && upcoming.length < 200){ upcoming.push(d); d = addDays(d, 1); }
  const past = days.map(x => x.day).filter(x => x < today).sort().reverse();

  const card = (day, readonly) => {
    const t = taskFor(day);
    const ns = notesFor(day);
    const ms = mastFor(day);
    const mine = ms.find(m => m.user_email === state.user.email);
    return `<div class="card" data-day="${day}">
      <div class="spread">
        <b>${prettyDate(day)}${day === today ? " · Today" : ""}</b>
        ${readonly ? '<span class="chip">past · read-only</span>' : ""}
      </div>
      <div>${t?.task ? esc(t.task) : '<span class="muted">No task set yet.</span>'}</div>
      ${t?.last_edited_by ? `<div class="muted">last edited by ${esc(t.last_edited_by)} · ${timeAgo(t.last_edited_at)}</div>` : ""}
      ${readonly ? "" : `<div class="btn-row" style="margin-top:6px"><button class="tiny soft" data-act="edit">✏️ Edit task</button></div>`}

      <h2 style="font-size:.9rem">Notes learned</h2>
      <div>${ns.map(n => `<div class="feed-item"><b>${esc(n.user_name)}</b>: ${esc(n.content)} <span class="muted">${timeAgo(n.created_at)}</span></div>`).join("") || '<div class="muted">No notes yet.</div>'}</div>
      ${readonly ? "" : `<form class="comment-form" data-act="note"><input name="content" placeholder="What did you learn?" required /><button class="tiny">Post</button></form>`}

      <h2 style="font-size:.9rem">Mastery</h2>
      ${users.map(u => {
        const m = ms.find(x => x.user_email === u.email);
        const v = m ? m.rate : 0;
        return `<div class="barwrap"><span class="lab">${esc(u.name)}</span><div class="bar" style="width:${v}%"></div><span>${m ? v + "%" : "—"}</span></div>`;
      }).join("")}
      ${readonly ? "" : `<div class="row" style="margin-top:6px">
        <input type="number" min="0" max="100" data-act="mastery-input" value="${mine ? mine.rate : ""}" placeholder="My %" style="max-width:110px" />
        <button class="tiny" data-act="mastery-save">Save my %</button></div>`}
    </div>`;
  };

  view.innerHTML = `
    <div class="spread"><h1>📅 Shared Study Plan</h1>${helpButton("plan")}</div>
    <p class="sub">One calendar for the whole group. Edit future days, post notes, set your mastery.</p>
    ${card(today, false)}
    <details open><summary style="cursor:pointer;margin:8px 0;font-weight:600">Upcoming days (${upcoming.length - 1})</summary>
      ${upcoming.slice(1).map(day => card(day, false)).join("")}
    </details>
    ${past.length ? `<details><summary style="cursor:pointer;margin:8px 0;font-weight:600">Past days (${past.length})</summary>
      ${past.map(day => card(day, true)).join("")}</details>` : ""}
  `;
  wireHelp(view, "plan");
  wireCards(view, () => renderPlan(view));
}

function wireCards(view, reload){
  view.querySelectorAll(".card[data-day]").forEach(cardEl => {
    const day = cardEl.dataset.day;

    const editBtn = cardEl.querySelector('[data-act="edit"]');
    if (editBtn) editBtn.onclick = () => editTask(day, reload);

    const noteForm = cardEl.querySelector('[data-act="note"]');
    if (noteForm) noteForm.onsubmit = async e => {
      e.preventDefault();
      const content = e.target.content.value.trim();
      if (!content) return;
      await supabase.from("plan_notes").insert({ day, user_name: state.user.name, content });
      await logActivity("plan", `shared a note on ${prettyDate(day)}`);
      reload();
    };

    const saveBtn = cardEl.querySelector('[data-act="mastery-save"]');
    if (saveBtn) saveBtn.onclick = async () => {
      const input = cardEl.querySelector('[data-act="mastery-input"]');
      const rate = Math.max(0, Math.min(100, +input.value || 0));
      await supabase.from("mastery").upsert(
        { day, user_email: state.user.email, user_name: state.user.name, rate },
        { onConflict: "day,user_email" });
      await logActivity("mastery", `marked ${prettyDate(day)} as ${rate}% mastered`);
      reload();
    };
  });
}

function editTask(day, reload){
  const current = "";
  modal(`<h2>Task — ${prettyDate(day)}</h2>
    <form id="etf"><textarea name="task" placeholder="e.g. Boundaries + Inferences + Circles/Triangles revision">${esc(current)}</textarea>
    <div style="text-align:right;margin-top:8px"><button class="tiny">Save</button></div></form>`);
  // preload existing text
  supabase.from("plan_days").select("task").eq("day", day).maybeSingle()
    .then(r => { if (r.data?.task) $("#etf").task.value = r.data.task; });

  $("#etf").onsubmit = async e => {
    e.preventDefault();
    await supabase.from("plan_days").upsert({
      day, task: e.target.task.value.trim(),
      last_edited_by: state.user.name, last_edited_at: new Date().toISOString(),
    });
    await logActivity("plan", `updated the plan for ${prettyDate(day)}`);
    $("#modal").classList.add("hidden");
    reload();
  };
}
