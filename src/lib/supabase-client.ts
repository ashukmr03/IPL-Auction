import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const createFallbackClient = () => ({
  auth: {
    signInWithPassword: async () => ({ data: null, error: null }),
    getSession: async () => ({ data: { session: null }, error: null }),
  },
});

export const supabase =
  supabaseUrl && supabasePublishableKey
    ? createClient(supabaseUrl, supabasePublishableKey)
    : (createFallbackClient() as ReturnType<typeof createFallbackClient>);
