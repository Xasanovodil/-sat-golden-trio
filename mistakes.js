// ── Section 4: Shared Mistake Log ───────────────────────────────────────────
import Chart from "https://esm.sh/chart.js@4/auto";
import { supabase, state, logActivity } from "./db.js";
import { SKILLS } from "./config.js";
import { esc, timeAgo, downloadCSV, $ } from "./util.js";
import { helpButton, wireHelp } from "./help.js";
import { renderComments } from "./comments.js";

const PALETTE = ["#c79a3a","#3d6ea5","#3f8f5b","#c0563f","#8a6db9","#b9528a","#5a9bb9","#b98a52","#7a8a3a","#52b98a"];

export async function renderMistakes(view){
  const mistakes = (await supabase.from("mistakes").select("*")
    .order("created_at", { ascending:false })).data || [];

  view.innerHTML = `
    <div class="spread"><h1>❌ Shared Mistake Log</h1>${helpButton("mistakes")}</div>
    <p class="sub">Log every miss so the group learns the weak spots together.</p>

    <details class="card"><summary style="cursor:pointer;font-weight:600">➕ Log a mistake</summary>
      <form id="mForm">
        <label>Skill</label><select name="skill_tag">${SKILLS.map(s => `<option>${s}</option>`).join("")}</select>
        <label>Wrong answer I chose</label><input name="wrong_answer" />
        <label>Correct answer</label><input name="correct_answer" />
        <label>Why I missed it (one sentence)</label><input name="why" required />
        <button style="margin-top:8px">Save mistake</button>
      </form>
    </details>

    <div class="card"><h2 style="margin-top:0">Each person's mistakes by skill</h2>
      <canvas id="byUser" height="200"></canvas></div>
    <div class="card"><h2 style="margin-top:0">Group's most-missed skills</h2>
      <canvas id="bySkill" height="200"></canvas></div>

    <div class="spread"><span class="muted">${mistakes.length} logged</span>
      <button class="tiny soft" id="exp">⬇️ Export CSV</button></div>
    <div id="mlist"></div>`;
  wireHelp(view, "mistakes");

  $("#mForm", view).onsubmit = async e => {
    e.preventDefault();
    const f = e.target;
    await supabase.from("mistakes").insert({
      user_name: state.user.name, skill_tag: f.skill_tag.value,
      wrong_answer: f.wrong_answer.value.trim(),
      correct_answer: f.correct_answer.value.trim(),
      why: f.why.value.trim(),
    });
    await logActivity("mistake", `logged a ${f.skill_tag.value} mistake`);
    renderMistakes(view);
  };

  $("#exp", view).onclick = () => downloadCSV("mistakes.csv",
    [["skill", "wrong_answer", "correct_answer", "why", "who", "date"],
     ...mistakes.map(m => [m.skill_tag, m.wrong_answer, m.correct_answer, m.why, m.user_name, m.created_at?.slice(0,10)])]);

  drawCharts(view, mistakes);
  drawList($("#mlist", view), mistakes);
}

function drawCharts(view, mistakes){
  const users  = [...new Set(mistakes.map(m => m.user_name))];
  const skills = [...new Set(mistakes.map(m => m.skill_tag || "Other"))];

  // chart 1: stacked bar — one bar per user, segments per skill
  new Chart($("#byUser", view), {
    type:"bar",
    data:{
      labels: users,
      datasets: skills.map((sk, i) => ({
        label: sk,
        backgroundColor: PALETTE[i % PALETTE.length],
        data: users.map(u => mistakes.filter(m => m.user_name === u && (m.skill_tag || "Other") === sk).length),
      })),
    },
    options:{ responsive:true, scales:{ x:{ stacked:true }, y:{ stacked:true, ticks:{ precision:0 } } },
      plugins:{ legend:{ labels:{ boxWidth:12, font:{ size:10 } } } } },
  });

  // chart 2: most-missed skills
  const counts = skills.map(sk => mistakes.filter(m => (m.skill_tag || "Other") === sk).length);
  const order  = skills.map((sk, i) => [sk, counts[i]]).sort((a, b) => b[1] - a[1]);
  new Chart($("#bySkill", view), {
    type:"bar",
    data:{ labels: order.map(o => o[0]),
      datasets:[{ label:"Mistakes", backgroundColor:"#c0563f", data: order.map(o => o[1]) }] },
    options:{ responsive:true, indexAxis:"y", plugins:{ legend:{ display:false } },
      scales:{ x:{ ticks:{ precision:0 } } } },
  });
}

function drawList(mount, mistakes){
  if (!mistakes.length){ mount.innerHTML = `<p class="muted">No mistakes logged yet.</p>`; return; }
  mount.innerHTML = mistakes.map(m => `
    <div class="card" data-id="${m.id}">
      <div class="spread"><span class="tag">${esc(m.skill_tag || "Other")}</span>
        <span class="muted">${esc(m.user_name)} · ${timeAgo(m.created_at)}</span></div>
      <div style="margin-top:6px"><span class="muted">Chose:</span> ${esc(m.wrong_answer || "—")}
        &nbsp;→&nbsp; <span class="muted">Correct:</span> <b>${esc(m.correct_answer || "—")}</b></div>
      <div style="margin-top:4px"><i>“${esc(m.why)}”</i></div>
      <button class="tiny soft" data-act="discuss" style="margin-top:6px">💬 Comment</button>
      <div data-comments hidden></div>
    </div>`).join("");

  mount.querySelectorAll(".card[data-id]").forEach(card => {
    const id = +card.dataset.id;
    const box = card.querySelector("[data-comments]");
    card.querySelector('[data-act="discuss"]').onclick = () => {
      box.hidden = !box.hidden;
      if (!box.hidden) renderComments("mistake_comments", "mistake_id", id, box);
    };
  });
}
