// ── Homepage: Today's view (+ live activity feed) ───────────────────────────
import { supabase, state } from "../db.js";
import { esc, prettyDate, timeAgo, todayStr, $ } from "../util.js";
import { getDueWords } from "./vocab.js";

let feedChannel = null;

export async function renderToday(view){
  if (feedChannel){ supabase.removeChannel(feedChannel); feedChannel = null; }
  const today = todayStr();

  const [plan, due, openQs, activity] = await Promise.all([
    supabase.from("plan_days").select("*").eq("day", today).maybeSingle().then(r => r.data),
    getDueWords(),
    supabase.from("questions").select("*").neq("status", "solved").order("created_at", { ascending:false }).limit(5).then(r => r.data || []),
    supabase.from("activity").select("*").order("created_at", { ascending:false }).limit(40).then(r => r.data || []),
  ]);

  view.innerHTML = `
    <h1>Hi ${esc(state.user.name)} 👋</h1>
    <p class="sub">Here's your day, ${prettyDate(today)}.</p>

    <div class="card">
      <h2 style="margin-top:0">📅 Today's plan</h2>
      <div>${plan?.task ? esc(plan.task) : '<span class="muted">No task set yet — </span><a href="#/plan">add one</a>.'}</div>
    </div>

    <div class="card">
      <h2 style="margin-top:0">📖 Flashcards due today</h2>
      ${due.length
        ? `<div class="spread"><b>${due.length}</b> card(s) waiting<a href="#/vocab"><button class="tiny">Review now</button></a></div>`
        : '<span class="muted">You\'re all caught up. 🎉</span>'}
    </div>

    <div class="card">
      <h2 style="margin-top:0">❓ Unanswered questions</h2>
      ${openQs.length ? openQs.map(q => `
        <div class="feed-item"><span class="tag">${esc(q.skill_tag || "Other")}</span>
          ${esc(q.question.slice(0, 90))}${q.question.length > 90 ? "…" : ""}
          <div class="muted">by ${esc(q.user_name)}</div></div>`).join("")
        : '<span class="muted">Nothing open right now.</span>'}
      <div style="margin-top:8px"><a href="#/questions">Go to Question Bank →</a></div>
    </div>

    <div class="card">
      <h2 style="margin-top:0">📰 Activity feed</h2>
      <div id="feed">${activity.map(feedRow).join("") || '<span class="muted">No activity yet — be the first!</span>'}</div>
    </div>`;

  // live updates
  feedChannel = supabase.channel("feed")
    .on("postgres_changes", { event:"INSERT", schema:"public", table:"activity" },
        p => $("#feed", view).insertAdjacentHTML("afterbegin", feedRow(p.new)))
    .subscribe();
}

function feedRow(a){
  return `<div class="feed-item"><b>${esc(a.user_name)}</b> ${esc(a.description)}
    <span class="muted">· ${timeAgo(a.created_at)}</span></div>`;
}
