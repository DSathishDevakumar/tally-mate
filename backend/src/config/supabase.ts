import { createClient } from "@supabase/supabase-js";
import { env } from "./env";

// Service-role client for trusted server-side operations only:
// verifying user access tokens, admin user lookups, signed storage URLs, etc.
// NEVER expose the service role key to the mobile app.
export const supabaseAdmin = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
