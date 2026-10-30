import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://ogupvtgecatorflvzvrq.supabase.co";
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  "";

let clientInstance: SupabaseClient | null = null;

/**
 * Returns a robust Supabase browser client with error boundaries.
 * Does not crash if keys are missing or invalid; returns null safely.
 */
export function getSupabaseClient(): SupabaseClient | null {
  if (clientInstance) return clientInstance;

  try {
    if (supabaseUrl && supabaseAnonKey) {
      clientInstance = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
        global: {
          headers: {
            "x-application-name": "wanderledger",
          },
        },
      });
      return clientInstance;
    }
  } catch (err) {
    console.warn("Supabase client initialization warning (operating in resilient fallback mode):", err);
    return null;
  }

  return null;
}

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  !supabaseAnonKey.includes("placeholder")
);

/**
 * Executes a Supabase query promise with an error boundary.
 * If the table is empty, doesn't exist yet, or network is unreachable,
 * it returns fallbackData instead of throwing an unhandled rejection.
 */
export async function safeSupabaseQuery<T>(
  queryPromise: PromiseLike<any>,
  fallbackData: T
): Promise<{ data: T; error: any | null }> {
  try {
    const result = await queryPromise;
    if (result && result.error) {
      console.warn("Supabase query error boundary caught:", result.error.message || result.error);
      return { data: fallbackData, error: result.error };
    }
    return {
      data: (result && result.data !== null && result.data !== undefined ? result.data : fallbackData) as T,
      error: null,
    };
  } catch (err: any) {
    console.warn("Supabase network/runtime error boundary caught:", err?.message || err);
    return { data: fallbackData, error: err };
  }
}
