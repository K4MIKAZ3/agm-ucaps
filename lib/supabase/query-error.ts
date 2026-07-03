import type { PostgrestError } from "@supabase/supabase-js";

export function formatSupabaseError(error: PostgrestError | null | undefined): string | null {
  if (!error) return null;
  return error.message;
}

export function combineSupabaseErrors(
  errors: Array<PostgrestError | null | undefined>
): string | null {
  const messages = errors
    .map((error) => error?.message?.trim())
    .filter((message): message is string => Boolean(message));

  if (messages.length === 0) return null;
  return [...new Set(messages)].join(" · ");
}
