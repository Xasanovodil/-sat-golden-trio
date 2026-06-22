// ── Reusable comment thread (used by questions, mistakes, tests) ─────────────
import { supabase, state } from "./db.js";
import { esc, timeAgo } from "./util.js";

export async function renderComments(table, fkCol, fkVal, mount){
  const { data } = await supabase.from(table).select("*")
    .eq(fkCol, fkVal).order("created_at", { ascending:true });

  mount.innerHTML = `
    <div class="comments">
      ${(data || []).map(c => `
        <div class="comment">
          <b>${esc(c.user_name)}</b> <span class="muted">${timeAgo(c.created_at)}</span>
          <div>${esc(c.content)}</div>
        </div>`).join("") || `<div class="muted">No comments yet.</div>`}
      <form class="comment-form">
        <input name="content" placeholder="Add a comment…" required maxlength="500" />
        <button class="tiny">Send</button>
      </form>
    </div>`;

  mount.querySelector(".comment-form").onsubmit = async e => {
    e.preventDefault();
    const content = e.target.content.value.trim();
    if (!content) return;
    await supabase.from(table).insert({ [fkCol]: fkVal, user_name: state.user.name, content });
    renderComments(table, fkCol, fkVal, mount);
  };
}
