// ── Section 5: Practice Test Tracker ────────────────────────────────────────
import Chart from "https://esm.sh/chart.js@4/auto";
import { supabase, state, logActivity } from "./db.js";
import { esc, timeAgo, todayStr, $ } from "./util.js";
import { helpButton, wireHelp } from "./help.js";
import { renderComments } from "./comments.js";

const PALETTE = ["#c79a3a","#3d6ea5","#3f8f5b","#c0563f","#8a6db9","#b9528a","#5a9bb9","#b98a52"];

export async function renderTests(view){
  const tests = (await supabase.from("practice_tests").select("*")
    .order("taken_on", { ascending:true })).data || [];

  view.innerHTML = `
    <div class="spread"><h1>📊 Practice Test Tracker</h1>${helpButton("tests")}</div>
    <p class="sub">Log Bluebook results. Everyone's trajectory on one chart.</p>

    <details class="card"><summary style="cursor:pointer;font-weight:600">➕ Log a practice test</summary>
      <form id="tForm">
        <label>Date</label><input name="taken_on" type="date" value="${todayStr()}" required />
        <div class="grid two">
          <div><label>R&amp;W score</label><input name="rw" type="number" min="200" max="800" /></div>
          <div><label>Math score</label><input name="math" type="number" min="200" max="800" /></div>
        </div>
        <label>Notes</label><textarea name="notes"></textarea>
        <button style="margin-top:8px">Save result</button>
      </form>
    </details>

    <div class="card"><h2 style="margin-top:0">Scores over time</h2>
      <canvas id="chart" height="220"></canvas></div>

    <div id="tlist"></div>`;
  wireHelp(view, "tests");

  $("#tForm", view).onsubmit = async e => {
    e.preventDefault();
    const f = e.target;
    const rw = +f.rw.value || 0, math = +f.math.value || 0;
    const total = rw + math;
    await supabase.from("practice_tests").insert({
      user_name: state.user.name, taken_on: f.taken_on.value,
      rw_score: rw, math_score: math, total, notes: f.notes.value.trim(),
    });
    await logActivity("test", `logged a practice test: ${total}`);
    renderTests(view);
  };

  drawChart(view, tests);
  drawList($("#tlist", view), tests);
}

function drawChart(view, tests){
  if (!tests.length){ $("#chart", view).replaceWith(Object.assign(document.createElement("p"), { className:"muted", textContent:"No tests logged yet." })); return; }
  const dates = [...new Set(tests.map(t => t.taken_on))].sort();
  const users = [...new Set(tests.map(t => t.user_name))];
  new Chart($("#chart", view), {
    type:"line",
    data:{
      labels: dates,
      datasets: users.map((u, i) => ({
        label: u,
        borderColor: PALETTE[i % PALETTE.length],
        backgroundColor: PALETTE[i % PALETTE.length],
        spanGaps: true, tension: 0.25,
        data: dates.map(d => { const t = tests.find(x => x.user_name === u && x.taken_on === d); return t ? t.total : null; }),
      })),
    },
    options:{ responsive:true, scales:{ y:{ suggestedMin:800, suggestedMax:1600 } },
      plugins:{ legend:{ labels:{ boxWidth:12, font:{ size:11 } } } } },
  });
}

function drawList(mount, tests){
  const list = [...tests].reverse();
  if (!list.length){ mount.innerHTML = ""; return; }
  mount.innerHTML = list.map(t => `
    <div class="card" data-id="${t.id}">
      <div class="spread"><b>${esc(t.user_name)}</b><span class="tag">${t.total}</span></div>
      <div class="muted">${t.taken_on} · R&W ${t.rw_score ?? "—"} · Math ${t.math_score ?? "—"} · ${timeAgo(t.created_at)}</div>
      ${t.notes ? `<div style="margin-top:6px">${esc(t.notes)}</div>` : ""}
      <button class="tiny soft" data-act="discuss" style="margin-top:6px">💬 Comment</button>
      <div data-comments hidden></div>
    </div>`).join("");

  mount.querySelectorAll(".card[data-id]").forEach(card => {
    const id = +card.dataset.id;
    const box = card.querySelector("[data-comments]");
    card.querySelector('[data-act="discuss"]').onclick = () => {
      box.hidden = !box.hidden;
      if (!box.hidden) renderComments("test_comments", "test_id", id, box);
    };
  });
}
