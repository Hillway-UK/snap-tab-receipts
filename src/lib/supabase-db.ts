import { supabase } from "@/integrations/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";

// Helper to bypass strict typing for tables not yet in generated types
// Cast to unknown first, then to a generic SupabaseClient
const untypedSupabase = supabase as unknown as SupabaseClient;

export const db = {
  from: (table: "receipts" | "user_roles") => {
    return untypedSupabase.from(table);
  },
};
