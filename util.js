// ── Tiny DOM + formatting helpers (kept deliberately simple) ────────────────
export const $  = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

// Escape user text before putting it in innerHTML
export function esc(s){
  return String(s ?? "").replace(/[&<>"']/g, c =>
    ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
}

// Dates ----------------------------------------------------------------------
export function todayStr(){
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}
export function pad(n){ return String(n).padStart(2, "0"); }

export function addDays(dateStr, n){
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}

export function prettyDate(dateStr){
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString(undefined, { weekday:"short", month:"short", day:"numeric" });
}

export function timeAgo(ts){
  const s = Math.floor((Date.now() - new Date(ts).getTime())/1000);
  if (s < 60)    return "just now";
  if (s < 3600)  return Math.floor(s/60)  + "m ago";
  if (s < 86400) return Math.floor(s/3600)+ "h ago";
  if (s < 604800)return Math.floor(s/86400)+"d ago";
  return new Date(ts).toLocaleDateString();
}

// Toast ----------------------------------------------------------------------
let toastTimer;
export function toast(msg){
  const t = $("#toast");
  t.textContent = msg; t.classList.remove("hidden");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.add("hidden"), 2400);
}

// Modal (used by the "?" help buttons) ---------------------------------------
export function modal(html){
  const m = $("#modal");
  m.innerHTML = `<div class="modal">${html}<div style="margin-top:14px;text-align:right">
    <button class="soft" id="modalClose">Close</button></div></div>`;
  m.classList.remove("hidden");
  const close = () => m.classList.add("hidden");
  $("#modalClose", m).onclick = close;
  m.onclick = e => { if (e.target === m) close(); };
}

// CSV export -----------------------------------------------------------------
export function downloadCSV(filename, rows){
  const csv = rows.map(r => r.map(cell => {
    const v = String(cell ?? "");
    return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
  }).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type:"text/csv" }));
  const a = Object.assign(document.createElement("a"), { href:url, download:filename });
  a.click(); URL.revokeObjectURL(url);
}
