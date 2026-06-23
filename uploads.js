// ── Image uploads to Supabase Storage (bucket: "uploads") + click-to-enlarge ─
import { supabase, state } from "./db.js";
import { toast, modal, esc } from "./util.js";

const OK_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 5 * 1024 * 1024; // 5MB

// Validate + upload one File, return its public URL. Throws on failure.
export async function uploadImage(file){
  if (!file) return null;
  if (!OK_TYPES.includes(file.type)){ toast("Use a JPG, PNG, or WebP image"); throw new Error("bad-type"); }
  if (file.size > MAX_BYTES){ toast("Image must be under 5MB"); throw new Error("too-big"); }

  const ext = (file.name.split(".").pop() || "img").toLowerCase().replace(/[^a-z0-9]/g, "");
  const path = `${state.user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext || "img"}`;

  const { error } = await supabase.storage.from("uploads")
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error){ toast("Upload failed — is the 'uploads' bucket public?"); throw error; }

  return supabase.storage.from("uploads").getPublicUrl(path).data.publicUrl;
}

// Inline thumbnail markup (click to enlarge via the zoom handler below).
export function thumb(url){
  return url ? `<img class="zoomable" src="${esc(url)}" alt="attachment" loading="lazy" />` : "";
}

// One delegated listener: click any .zoomable image to open it big in the modal.
let zoomOn = false;
export function initImageZoom(){
  if (zoomOn) return; zoomOn = true;
  document.addEventListener("click", e => {
    const img = e.target.closest("img.zoomable");
    if (img) modal(`<img src="${esc(img.src)}" style="max-width:100%;border-radius:8px" />`);
  });
}
initImageZoom();
