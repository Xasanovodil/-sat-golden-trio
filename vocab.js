// ── Section 3: Vocabulary (words + flashcards + affixes + search) ───────────
import { supabase, state, logActivity } from "./db.js";
import { esc, timeAgo, todayStr, addDays, downloadCSV, toast, $ } from "./util.js";
import { helpButton, wireHelp } from "./help.js";
import { reactionsHTML, wireReactions } from "./reactions.js";

const INTERVALS = { Again:1, Hard:3, Good:7, Easy:21 };
const STATUS    = { Again:"struggling", Hard:"learning", Good:"learning", Easy:"mastered" };

// Words due for the logged-in user (also used by the Today view).
export async function getDueWords(){
  const today = todayStr();
  const [words, reviews] = await Promise.all([
    supabase.from("vocab_words").select("*").then(r => r.data || []),
    supabase.from("vocab_reviews").select("*").eq("user_email", state.user.email).then(r => r.data || []),
  ]);
  return words.filter(w => {
    const r = reviews.find(x => x.word_id === w.id);
    return !r || (r.due_date && r.due_date <= today);
  });
}

export async function renderVocab(view){
  view.innerHTML = `
    <div class="spread"><h1>📖 Vocabulary</h1>${helpButton("vocab")}</div>
    <input id="search" placeholder="🔍 Search all vocab (words + affixes)…" />
    <div class="row" style="margin:8px 0">
      <button class="tiny" data-tab="words">Words</button>
      <button class="tiny soft" data-tab="cards">Flashcards</button>
      <button class="tiny soft" data-tab="affix">Prefixes &amp; Suffixes</button>
    </div>
    <div id="panel"></div>`;
  wireHelp(view, "vocab");

  const panel = $("#panel", view);
  const tabs = view.querySelectorAll("[data-tab]");
  let active = "words";

  const show = name => {
    active = name;
    tabs.forEach(b => b.classList.toggle("soft", b.dataset.tab !== name));
    if (name === "words") panelWords(panel);
    if (name === "cards") panelCards(panel);
    if (name === "affix") panelAffix(panel);
  };
  tabs.forEach(b => b.onclick = () => { $("#search", view).value = ""; show(b.dataset.tab); });

  $("#search", view).oninput = e => {
    const q = e.target.value.trim().toLowerCase();
    if (q) panelSearch(panel, q); else show(active);
  };

  show("words");
}

// ── Words tab ────────────────────────────────────────────────────────────────
async function panelWords(panel){
  const words = (await supabase.from("vocab_words").select("*")
    .order("created_at", { ascending:false })).data || [];

  panel.innerHTML = `
    <details class="card"><summary style="cursor:pointer;font-weight:600">➕ Add a word</summary>
      <form id="wForm">
        <label>Word</label><input name="word" required />
        <label>Definition (English)</label><textarea name="definition" required></textarea>
        <label>Example sentence</label><input name="example" />
        <label>Image URL (optional)</label><input name="image_url" placeholder="https://…" />
        <button style="margin-top:8px">Add word</button>
      </form>
    </details>
    <div class="spread"><span class="muted">${words.length} words shared</span>
      <button class="tiny soft" id="exp">⬇️ Export CSV</button></div>
    <div id="wlist">${words.map(wordCard).join("") || '<p class="muted">No words yet.</p>'}</div>`;

  $("#wForm", panel).onsubmit = async e => {
    e.preventDefault();
    const f = e.target;
    await supabase.from("vocab_words").insert({
      user_name: state.user.name,
      word: f.word.value.trim(),
      definition: f.definition.value.trim(),
      example: f.example.value.trim(),
      image_url: f.image_url.value.trim() || null,
    });
    await logActivity("vocab", `added the word “${f.word.value.trim()}”`);
    panelWords(panel);
  };

  $("#exp", panel).onclick = () => downloadCSV("vocab.csv",
    [["word", "definition", "example", "added_by"],
     ...words.map(w => [w.word, w.definition, w.example, w.user_name])]);

  wireReactions(panel);
}

function wordCard(w){
  return `<div class="card">
    <b style="font-size:1.05rem">${esc(w.word)}</b>
    <div>${esc(w.definition || "")}</div>
    ${w.example ? `<div class="muted" style="font-style:italic">“${esc(w.example)}”</div>` : ""}
    ${w.image_url ? `<img src="${esc(w.image_url)}" alt="" style="max-width:100%;border-radius:8px;margin-top:6px" />` : ""}
    <div class="muted" style="margin-top:4px">added by ${esc(w.user_name)} · ${timeAgo(w.created_at)}</div>
    ${reactionsHTML("vocab", w.id)}
  </div>`;
}

// ── Flashcards tab (spaced repetition) ──────────────────────────────────────
async function panelCards(panel){
  const today = todayStr();
  const [words, reviews] = await Promise.all([
    supabase.from("vocab_words").select("*").then(r => r.data || []),
    supabase.from("vocab_reviews").select("*").then(r => r.data || []),
  ]);
  const mine = reviews.filter(r => r.user_email === state.user.email);
  const due = words.filter(w => {
    const r = mine.find(x => x.word_id === w.id);
    return !r || (r.due_date && r.due_date <= today);
  });

  // group progress table (everyone)
  const users = [...new Set(reviews.map(r => r.user_name))];
  const progress = users.map(name => {
    const rs = reviews.filter(r => r.user_name === name);
    return { name,
      reviewed: rs.length,
      mastered: rs.filter(r => r.status === "mastered").length,
      struggling: rs.filter(r => r.status === "struggling").length };
  });

  panel.innerHTML = `
    <div class="card" id="review"></div>
    <div class="card">
      <h2 style="margin-top:0">Group review progress</h2>
      <div class="scroll-x"><table>
        <tr><th>Friend</th><th>Reviewed</th><th>Mastered</th><th>Struggling</th></tr>
        ${progress.map(p => `<tr><td>${esc(p.name)}</td><td>${p.reviewed}</td><td>${p.mastered}</td><td>${p.struggling}</td></tr>`).join("")
          || `<tr><td colspan="4" class="muted">No reviews yet.</td></tr>`}
      </table></div>
    </div>`;

  let queue = [...due];
  const reviewEl = $("#review", panel);

  const next = () => {
    if (!queue.length){
      reviewEl.innerHTML = `<div class="flash"><div>🎉 All caught up!<div class="hintline">No cards due today.</div></div></div>`;
      return;
    }
    const w = queue[0];
    reviewEl.innerHTML = `
      <div class="spread"><span class="muted">${queue.length} card(s) due</span></div>
      <div class="flash" id="card"><div><b>${esc(w.word)}</b><div class="hintline">tap to flip</div></div></div>
      <div class="btn-row" id="rate" hidden>
        <button class="tiny" data-r="Again">Again · 1d</button>
        <button class="tiny" data-r="Hard">Hard · 3d</button>
        <button class="tiny" data-r="Good">Good · 7d</button>
        <button class="tiny" data-r="Easy">Easy · 21d</button>
      </div>`;
    const cardEl = $("#card", reviewEl);
    cardEl.onclick = () => {
      cardEl.innerHTML = `<div><div>${esc(w.definition || "")}</div>
        ${w.example ? `<div class="hintline">“${esc(w.example)}”</div>` : ""}
        ${w.image_url ? `<img src="${esc(w.image_url)}" style="max-width:100%;border-radius:8px;margin-top:8px"/>` : ""}</div>`;
      $("#rate", reviewEl).hidden = false;
    };
    reviewEl.querySelectorAll("[data-r]").forEach(b => b.onclick = async () => {
      const choice = b.dataset.r;
      await supabase.from("vocab_reviews").upsert({
        word_id: w.id, user_email: state.user.email, user_name: state.user.name,
        due_date: addDays(today, INTERVALS[choice]),
        interval_days: INTERVALS[choice], status: STATUS[choice],
        last_reviewed: new Date().toISOString(),
      }, { onConflict: "word_id,user_email" });
      queue.shift();
      next();
    });
  };
  next();
}

// ── Prefixes & Suffixes tab ─────────────────────────────────────────────────
async function panelAffix(panel){
  const affixes = (await supabase.from("affixes").select("*").order("kind").order("affix")).data || [];
  const row = a => `<tr><td><b>${esc(a.affix)}</b></td><td>${esc(a.meaning || "")}</td><td class="muted">${esc(a.example || "")}</td></tr>`;
  const group = kind => affixes.filter(a => a.kind === kind);

  panel.innerHTML = `
    <details class="card"><summary style="cursor:pointer;font-weight:600">➕ Add a prefix / suffix</summary>
      <form id="aForm">
        <label>Type</label><select name="kind"><option value="prefix">Prefix</option><option value="suffix">Suffix</option></select>
        <label>Affix</label><input name="affix" placeholder="un-, -tion" required />
        <label>Meaning</label><input name="meaning" />
        <label>Example</label><input name="example" />
        <button style="margin-top:8px">Add</button>
      </form>
    </details>
    <div class="card"><h2 style="margin-top:0">Prefixes</h2>
      <div class="scroll-x"><table>${group("prefix").map(row).join("")}</table></div></div>
    <div class="card"><h2 style="margin-top:0">Suffixes</h2>
      <div class="scroll-x"><table>${group("suffix").map(row).join("")}</table></div></div>`;

  $("#aForm", panel).onsubmit = async e => {
    e.preventDefault();
    const f = e.target;
    await supabase.from("affixes").insert({
      kind: f.kind.value, affix: f.affix.value.trim(),
      meaning: f.meaning.value.trim(), example: f.example.value.trim(),
      added_by: state.user.name,
    });
    panelAffix(panel);
  };
}

// ── Search across all vocab ─────────────────────────────────────────────────
async function panelSearch(panel, q){
  const [words, affixes] = await Promise.all([
    supabase.from("vocab_words").select("*").then(r => r.data || []),
    supabase.from("affixes").select("*").then(r => r.data || []),
  ]);
  const hit = (...vals) => vals.some(v => String(v || "").toLowerCase().includes(q));
  const w = words.filter(x => hit(x.word, x.definition, x.example));
  const a = affixes.filter(x => hit(x.affix, x.meaning, x.example));

  panel.innerHTML = `
    <p class="muted">${w.length + a.length} match(es) for “${esc(q)}”</p>
    ${w.map(wordCard).join("")}
    ${a.map(x => `<div class="card"><b>${esc(x.affix)}</b> <span class="chip">${esc(x.kind)}</span>
       <div>${esc(x.meaning || "")}</div><div class="muted">${esc(x.example || "")}</div></div>`).join("")}
    ${(w.length + a.length) ? "" : '<p class="muted">Nothing found.</p>'}`;

  wireReactions(panel);
}
