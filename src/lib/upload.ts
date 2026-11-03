import { supabase } from "@/integrations/supabase/client";

function ext(name: string) {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i) : "";
}

/**
 * Uploads a file to the private `media` bucket and returns a very-long-lived
 * signed URL suitable for storing in the database and rendering with <img/video>.
 */
export async function uploadMedia(file: File, folder = "uploads"): Promise<string> {
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext(file.name)}`;
  const up = await supabase.storage.from("media").upload(path, file, {
    cacheControl: "31536000",
    upsert: false,
    contentType: file.type || undefined,
  });
  if (up.error) throw up.error;
  // 10 years
  const signed = await supabase.storage.from("media").createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
  if (signed.error || !signed.data?.signedUrl) throw signed.error ?? new Error("Failed to sign URL");
  return signed.data.signedUrl;
}