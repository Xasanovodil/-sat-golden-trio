// ── Shared emoji reactions (one table for every section) ────────────────────
import { supabase, state } from "./db.js";
import { esc } from "./util.js";

export const EMOJIS = ["👍", "🔥", "❤️", "😂", "😮", "👏"];

// id → name cache (small group, names rarely change)
let userMap = null;
async function names(){
  if (userMap) return userMap;
  const { data } = await supabase.from("users").select("id,name");
  userMap = {}; (data || []).forEach(u => { userMap[u.id] = u.name; });
  return userMap;
}

// Drop this placeholder into any card's HTML, then call wireReactions(container).
export function reactionsHTML(targetType, targetId){
  return `<div class="rx" data-rt="${targetType}" data-rid="${targetId}"></div>`;
}

// Find every placeholder under `root`, batch-load counts, render + wire clicks.
export async function wireReactions(root = document){
  initRealtime();
  const nodes = [...root.querySelectorAll(".rx[data-rt]")];
  if (!nodes.length) return;
  const map = await names();

  const byType = {};
  nodes.forEach(n => { (byType[n.dataset.rt] = byType[n.dataset.rt] || new Set()).add(Number(n.dataset.rid)); });

  let all = [];
  for (const [type, ids] of Object.entries(byType)){
    const { data } = await supabase.from("reactions")
      .select("user_id,emoji,target_id,target_type")
      .eq("target_type", type).in("target_id", [...ids]);
    if (data) all = all.concat(data);
  }
  nodes.forEach(n => draw(n, all, map));
}

function draw(node, all, map){
  const type = node.dataset.rt, id = Number(node.dataset.rid);
  const rows = all.filter(r => r.target_type === type && r.target_id === id);

  node.innerHTML = EMOJIS.map(em => {
    const list = rows.filter(r => r.emoji === em);
    const mine = list.some(r => r.user_id === state.user.id);
    const who  = list.map(r => map[r.user_id] || "?").join(", ");
    return `<button class="rx-btn${mine ? " on" : ""}" data-em="${em}"
      title="${esc(who) || "React"}">${em}${list.length ? `<span>${list.length}</span>` : ""}</button>`;
  }).join("");

  node.querySelectorAll(".rx-btn").forEach(b => b.onclick = async () => {
    const emoji = b.dataset.em;
    if (b.classList.contains("on")){
      await supabase.from("reactions").delete()
        .match({ user_id: state.user.id, target_type: type, target_id: id, emoji });
    } else {
      await supabase.from("reactions").insert({ user_id: state.user.id, target_type: type, target_id: id, emoji });
    }
    await refresh(node);
  });
}

async function refresh(node){
  const type = node.dataset.rt, id = Number(node.dataset.rid);
  const map = await names();
  const { data } = await supabase.from("reactions")
    .select("user_id,emoji,target_id,target_type")
    .eq("target_type", type).eq("target_id", id);
  draw(node, data || [], map);
}

// Live updates: when anyone reacts, refresh that card if it's on screen.
let realtimeOn = false;
function initRealtime(){
  if (realtimeOn) return; realtimeOn = true;
  supabase.channel("reactions")
    .on("postgres_changes", { event:"*", schema:"public", table:"reactions" }, p => {
      const row = p.new && p.new.target_id != null ? p.new : p.old;
      if (!row) return;
      const node = document.querySelector(`.rx[data-rt="${row.target_type}"][data-rid="${row.target_id}"]`);
      if (node) refresh(node);
    })
    .subscribe();
}
