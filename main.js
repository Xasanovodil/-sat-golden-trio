// ── Boot, login/onboarding, top bar (countdown + presence), router ──────────
import { supabase, state } from "./db.js";
import { SAT_DATE } from "./config.js";
import { $, $$, esc, toast } from "./util.js";

import { renderToday }       from "./sections/today.js";
import { renderPlan }        from "./sections/plan.js";
import { renderQuestions }   from "./sections/questions.js";
import { renderVocab }       from "./sections/vocab.js";
import { renderMistakes }    from "./sections/mistakes.js";
import { renderTests }       from "./sections/tests.js";
import { renderChat }        from "./sections/chat.js";
import { renderDashboard }   from "./sections/dashboard.js";
import { renderReflections } from "./sections/reflections.js";
import { renderFormulas }    from "./sections/formulas.js";

const ROUTES = {
  today:       { label:"🏠 Today",      render:renderToday },
  plan:        { label:"📅 Plan",       render:renderPlan },
  questions:   { label:"❓ Questions",  render:renderQuestions },
  vocab:       { label:"📖 Vocab",      render:renderVocab },
  mistakes:    { label:"❌ Mistakes",   render:renderMistakes },
  tests:       { label:"📊 Tests",      render:renderTests },
  chat:        { label:"💬 Chat",       render:renderChat },
  dashboard:   { label:"👥 Dashboard",  render:renderDashboard },
  reflections: { label:"📝 Reflections",render:renderReflections },
  formulas:    { label:"📐 Formulas",   render:renderFormulas },
};

// ── Startup ─────────────────────────────────────────────────────────────────
init();

async function init(){
  const email = localStorage.getItem("sgt_email");
  if (email){
    const { data } = await supabase.from("users").select("*").eq("email", email).maybeSingle();
    if (data){ state.user = data; return startApp(); }
    localStorage.removeItem("sgt_email");
  }
  showLogin();
}

// ── Login + onboarding (email is the key) ───────────────────────────────────
function showLogin(){
  const auth = $("#auth");
  auth.classList.remove("hidden");
  auth.innerHTML = `
    <div class="box">
      <h1>SAT <span class="gold">Golden Trio</span></h1>
      <p class="sub" style="text-align:center">Enter your email to join the study room.</p>
      <form id="loginForm">
        <input name="email" type="email" placeholder="you@email.com" required autofocus />
        <button style="width:100%;margin-top:8px">Continue</button>
      </form>
    </div>`;

  $("#loginForm").onsubmit = async e => {
    e.preventDefault();
    const email = e.target.email.value.trim().toLowerCase();
    const { data } = await supabase.from("users").select("*").eq("email", email).maybeSingle();
    if (data){
      state.user = data;
      localStorage.setItem("sgt_email", email);
      auth.classList.add("hidden");
      startApp();
    } else {
      showOnboarding(email);
    }
  };
}

function showOnboarding(email){
  const auth = $("#auth");
  auth.innerHTML = `
    <div class="box">
      <h1>Welcome! 👋</h1>
      <p class="sub" style="text-align:center">First time here — set up your profile.</p>
      <form id="onbForm">
        <label>Name</label><input name="name" required />
        <div class="grid two">
          <div><label>Goal score</label><input name="goal" type="number" min="400" max="1600" placeholder="1500" /></div>
          <div><label>Current score</label><input name="current" type="number" min="400" max="1600" placeholder="1300" /></div>
        </div>
        <label>Your motto (shior)</label><input name="motto" placeholder="No excuses, only progress." />
        <button style="width:100%;margin-top:12px">Join the room</button>
      </form>
    </div>`;

  $("#onbForm").onsubmit = async e => {
    e.preventDefault();
    const f = e.target;
    const row = {
      email,
      name: f.name.value.trim(),
      goal_score: f.goal.value ? +f.goal.value : null,
      current_score: f.current.value ? +f.current.value : null,
      motto: f.motto.value.trim() || null,
    };
    const { data, error } = await supabase.from("users").insert(row).select().single();
    if (error){ toast("Could not save — check Supabase keys"); return; }
    state.user = data;
    localStorage.setItem("sgt_email", email);
    auth.classList.add("hidden");
    startApp();
  };
}

// ── App shell ───────────────────────────────────────────────────────────────
function startApp(){
  $("#app").classList.remove("hidden");
  buildNav();
  startCountdown();
  startPresence();
  window.addEventListener("hashchange", route);
  if (!location.hash) location.hash = "#/today";
  else route();
}

function buildNav(){
  $("#nav").innerHTML = Object.entries(ROUTES)
    .map(([k, r]) => `<a href="#/${k}" data-k="${k}">${r.label}</a>`).join("");
}

function route(){
  const key = (location.hash.replace("#/", "") || "today");
  const r = ROUTES[key] || ROUTES.today;
  $$("#nav a").forEach(a => a.classList.toggle("active", a.dataset.k === key));
  const view = $("#view");
  view.innerHTML = `<p class="muted">Loading…</p>`;
  Promise.resolve(r.render(view)).catch(err => {
    view.innerHTML = `<div class="card">Something went wrong loading this section.<br>
      <span class="muted">${esc(err.message || err)}</span></div>`;
  });
  window.scrollTo(0, 0);
}

// ── Countdown to the SAT ─────────────────────────────────────────────────────
function startCountdown(){
  const target = new Date(SAT_DATE).getTime();
  const el = $("#countdown");
  const tick = () => {
    let diff = Math.max(0, target - Date.now());
    const d = Math.floor(diff/864e5); diff -= d*864e5;
    const h = Math.floor(diff/36e5);  diff -= h*36e5;
    const m = Math.floor(diff/6e4);   diff -= m*6e4;
    const s = Math.floor(diff/1e3);
    el.innerHTML = [["Days",d],["Hrs",h],["Min",m],["Sec",s]]
      .map(([lab,n]) => `<div class="cd-unit"><div class="cd-num">${n}</div><div class="cd-lab">${lab}</div></div>`)
      .join("");
  };
  tick(); setInterval(tick, 1000);
}

// ── Live presence (who's online right now) ──────────────────────────────────
function startPresence(){
  const ch = supabase.channel("online", { config:{ presence:{ key: state.user.email } } });
  ch.on("presence", { event:"sync" }, () => {
    const names = Object.values(ch.presenceState()).map(arr => arr[0]?.name).filter(Boolean);
    state.online = names;
    $("#presence").innerHTML =
      `<span class="dot"></span> Live now: ${names.length ? names.map(esc).join(", ") : "just you"}`;
  });
  ch.subscribe(async status => {
    if (status === "SUBSCRIBED") await ch.track({ name: state.user.name, email: state.user.email });
  });
}
