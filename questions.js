// ── Section 2: Question Bank ─────────────────────────────────────────────────
import { supabase, state, logActivity } from "./db.js";
import { SKILLS } from "./config.js";
import { esc, timeAgo, $ } from "./util.js";
import { helpButton, wireHelp } from "./help.js";
import { renderComments } from "./comments.js";
import { reactionsHTML, wireReactions } from "./reactions.js";
import { uploadImage, thumb } from "./uploads.js";

export async function renderQuestions(view){
  view.innerHTML = `
    <div class="spread"><h1>❓ Question Bank</h1>${helpButton("questions")}</div>
    <p class="sub">Post questions that might show up on the real SAT. Tag, discuss, attempt.</p>

    <details class="card"><summary style="cursor:pointer;font-weight:600">➕ Post a question</summary>
      <form id="qForm">
        <label>Question</label><textarea name="question" required></textarea>
        <label>Correct answer</label><input name="answer" required />
        <label>Explanation</label><textarea name="explanation"></textarea>
        <label>Skill tag</label>
        <select name="skill_tag">${SKILLS.map(s => `<option>${s}</option>`).join("")}</select>
        <label>Screenshot (optional)</label><input name="image" type="file" accept="image/jpeg,image/png,image/webp" />
        <button style="margin-top:10px">Post question</button>
      </form>
    </details>

    <div class="row" style="margin:6px 0">
      <label style="margin:0">Filter:</label>
      <select id="filter" style="max-width:220px">
        <option value="">All skills</option>
        ${SKILLS.map(s => `<option>${s}</option>`).join("")}
      </select>
    </div>
    <div id="qList"></div>`;
  wireHelp(view, "questions");

  $("#qForm", view).onsubmit = async e => {
    e.preventDefault();
    const f = e.target;
    const btn = f.querySelector("button");
    let image_url = null;
    try {
      const file = f.image.files[0];
      if (file){ btn.disabled = true; btn.textContent = "Uploading…"; image_url = await uploadImage(file); }
    } catch { btn.disabled = false; btn.textContent = "Post question"; return; }
    await supabase.from("questions").insert({
      user_name: state.user.name,
      question: f.question.value.trim(),
      answer: f.answer.value.trim(),
      explanation: f.explanation.value.trim(),
      skill_tag: f.skill_tag.value, image_url,
    });
    await logActivity("question", `posted a ${f.skill_tag.value} question`);
    renderQuestions(view);
  };

  const [questions, attempts] = await Promise.all([
    supabase.from("questions").select("*").order("created_at", { ascending:false }).then(r => r.data || []),
    supabase.from("question_attempts").select("question_id,user_name").then(r => r.data || []),
  ]);

  const filter = $("#filter", view);
  const draw = () => drawList($("#qList", view), questions, attempts, filter.value, () => renderQuestions(view));
  filter.onchange = draw;
  draw();
}

function drawList(mount, questions, attempts, skill, reload){
  const list = skill ? questions.filter(q => q.skill_tag === skill) : questions;
  if (!list.length){ mount.innerHTML = `<p class="muted">No questions yet.</p>`; return; }

  mount.innerHTML = list.map(q => {
    const who = attempts.filter(a => a.question_id === q.id).map(a => a.user_name);
    const tried = who.includes(state.user.name);
    return `<div class="card" data-id="${q.id}">
      <div class="spread">
        <span class="tag">${esc(q.skill_tag || "Other")}</span>
        <span class="pill ${q.status}">${q.status.replace("_", " ")}</span>
      </div>
      <div style="margin:8px 0;white-space:pre-wrap">${esc(q.question)}</div>
      ${thumb(q.image_url)}
      <div class="muted">posted by ${esc(q.user_name)} · ${timeAgo(q.created_at)}</div>

      <details style="margin-top:8px"><summary style="cursor:pointer;color:var(--blue)">Show answer</summary>
        <div style="margin-top:6px"><b>Answer:</b> ${esc(q.answer)}</div>
        ${q.explanation ? `<div style="margin-top:4px"><b>Why:</b> ${esc(q.explanation)}</div>` : ""}
      </details>

      <div class="muted" style="margin-top:8px">Attempted by: ${who.length ? who.map(esc).join(", ") : "nobody yet"}</div>
      <div class="btn-row" style="margin-top:6px">
        <button class="tiny ${tried ? "soft" : ""}" data-act="attempt">${tried ? "✓ Attempted" : "I attempted this"}</button>
        <button class="tiny soft" data-act="solved">Mark solved</button>
        <button class="tiny soft" data-act="need_help">Need help</button>
        <button class="tiny soft" data-act="discuss">💬 Discuss</button>
      </div>
      ${reactionsHTML("question", q.id)}
      <div data-comments hidden></div>
    </div>`;
  }).join("");

  mount.querySelectorAll(".card[data-id]").forEach(card => {
    const id = +card.dataset.id;
    card.querySelector('[data-act="attempt"]').onclick = async () => {
      await supabase.from("question_attempts").upsert(
        { question_id:id, user_name:state.user.name }, { onConflict:"question_id,user_name" });
      reload();
    };
    card.querySelector('[data-act="solved"]').onclick = async () => {
      await supabase.from("questions").update({ status:"solved" }).eq("id", id); reload();
    };
    card.querySelector('[data-act="need_help"]').onclick = async () => {
      await supabase.from("questions").update({ status:"need_help" }).eq("id", id); reload();
    };
    const box = card.querySelector("[data-comments]");
    card.querySelector('[data-act="discuss"]').onclick = () => {
      box.hidden = !box.hidden;
      if (!box.hidden) renderComments("question_comments", "question_id", id, box);
    };
  });
  wireReactions(mount);
}
