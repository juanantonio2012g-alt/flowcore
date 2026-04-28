"use client";

import type { createClient } from "./client";

type BrowserSupabaseClient = ReturnType<typeof createClient>;

export async function getJsonAuthContext(supabase: BrowserSupabaseClient) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return {
    userId: session?.user?.id ?? null,
    actor: session?.user?.email ?? session?.user?.id ?? null,
    headers: {
      "Content-Type": "application/json",
      ...(session?.access_token
        ? {
            Authorization: `Bearer ${session.access_token}`,
          }
        : {}),
    },
  };
}
