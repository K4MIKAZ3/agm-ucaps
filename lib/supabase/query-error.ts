import type { PostgrestError } from "@supabase/supabase-js";

export function combineSupabaseErrors(
  errors: Array<PostgrestError | null | undefined>
): string | null {
  const messages = errors
    .map((error) => error?.message?.trim())
    .filter((message): message is string => Boolean(message));

  if (messages.length === 0) return null;
  return [...new Set(messages)].join(" · ");
}
