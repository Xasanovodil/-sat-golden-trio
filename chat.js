// ── Section 6: Group Chat (realtime) ────────────────────────────────────────
import { supabase, state } from "./db.js";
import { esc, timeAgo, $ } from "./util.js";
import { helpButton, wireHelp } from "./help.js";
import { reactionsHTML, wireReactions } from "./reactions.js";
import { uploadImage, thumb } from "./uploads.js";

let channel = null;

export async function renderChat(view){
  if (channel){ supabase.removeChannel(channel); channel = null; }

  view.innerHTML = `
    <div class="spread"><h1>💬 Group Chat</h1>${helpButton("chat")}</div>
    <div class="card" id="log" style="height:60vh;overflow-y:auto"></div>
    <form id="chatForm" class="chat-form">
      <input name="content" placeholder="Message the group…" autocomplete="off" />
      <label class="chat-clip" title="Attach image">📎
        <input name="image" type="file" accept="image/jpeg,image/png,image/webp" hidden />
      </label>
      <button>Send</button>
    </form>`;
  wireHelp(view, "chat");

  const log = $("#log", view);
  const add = m => {
    const mine = m.user_name === state.user.name;
    log.insertAdjacentHTML("beforeend",
      `<div class="feed-item"><b style="color:${mine ? "var(--gold)" : "inherit"}">${esc(m.user_name)}</b>
        <span class="muted">${timeAgo(m.created_at)}</span>
        ${m.content ? `<div>${esc(m.content)}</div>` : ""}
        ${thumb(m.image_url)}
        ${reactionsHTML("chat", m.id)}</div>`);
    wireReactions(log.lastElementChild);
    log.scrollTop = log.scrollHeight;
  };

  const { data } = await supabase.from("chat_messages").select("*")
    .order("created_at", { ascending:true }).limit(200);
  (data || []).forEach(add);

  channel = supabase.channel("chat")
    .on("postgres_changes", { event:"INSERT", schema:"public", table:"chat_messages" },
        p => add(p.new))
    .subscribe();

  $("#chatForm", view).onsubmit = async e => {
    e.preventDefault();
    const f = e.target;
    const content = f.content.value.trim();
    const file = f.image.files[0];
    if (!content && !file) return;
    const btn = f.querySelector("button");
    let image_url = null;
    try {
      if (file){ btn.disabled = true; btn.textContent = "…"; image_url = await uploadImage(file); }
    } catch { btn.disabled = false; btn.textContent = "Send"; return; }
    f.reset(); btn.disabled = false; btn.textContent = "Send";
    await supabase.from("chat_messages").insert({ user_name: state.user.name, content, image_url });
  };
}
