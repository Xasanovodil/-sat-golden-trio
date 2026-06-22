// ── One-time help tooltips + always-available "?" button ────────────────────
import { state } from "./db.js";
import { modal } from "./util.js";

const HELP = {
  today:   "Your home base. It shows today's study task, the flashcards you owe today, the live group activity feed, and questions nobody has answered yet.",
  plan:    "One shared calendar for the whole group. Anyone can edit future days or add tasks. Post what you learned in each day's notes feed, and set your own mastery % — everyone sees everyone's side by side. Past days are read-only.",
  questions:"Post questions you think could show up on the real SAT (with answer, explanation, and a skill tag). Filter by skill, comment to discuss, mark 'attempted', and flag each as solved or need-help.",
  vocab:   "Shared vocabulary. Add words (definition, example, optional image). Flashcards are auto-made from the list — review them and pick Again/Hard/Good/Easy to schedule the next review (1/3/7/21 days). Your schedule is yours; the counts are shared. There's also a shared prefixes & suffixes list and a search bar.",
  mistakes:"Log every practice question you miss: skill, the wrong answer you picked, the correct one, and one line on why you missed it. Comment on each other's mistakes. The charts show your weak skills and the group's most-missed skills.",
  tests:   "Log your Bluebook practice tests (R&W, Math, total, notes). The line chart overlays everyone's scores over time so you can see the whole group's trajectory. Comment on any test.",
  chat:    "Live group chat for the whole study room.",
  dashboard:"Everyone side by side — motto, goal vs current score, latest test, streak, vocab mastered, questions posted, and mastery. No ranking, just shared visibility.",
  reflections:"Every Sunday, write a short retrospective: what you learned, what you missed, and your plan for next week. All reflections are visible to the group.",
  formulas:"A quick static cheat-sheet of the math formulas you'll need: circles, triangles, slope, exponents, quadratics.",
};

function seenKey(section){ return `sgt_help_${state.user?.email}_${section}`; }

export function showHelp(section){
  modal(`<h2>About this section</h2><p>${HELP[section] || ""}</p>`);
}

// Returns the HTML for a "?" button; call wireHelp() after injecting it.
export function helpButton(section){
  return `<button class="help-btn" data-help="${section}" title="What is this?">?</button>`;
}

export function wireHelp(root, section){
  const btn = root.querySelector(`[data-help="${section}"]`);
  if (btn) btn.onclick = () => showHelp(section);
  // auto-show once per user per section
  if (state.user && !localStorage.getItem(seenKey(section))){
    localStorage.setItem(seenKey(section), "1");
    showHelp(section);
  }
}
