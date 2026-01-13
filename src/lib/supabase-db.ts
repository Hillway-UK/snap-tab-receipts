import { supabase } from "@/integrations/supabase/client";

// Helper to bypass strict typing for tables not yet in generated types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const db = {
  from: (table: "receipts" | "user_roles") => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return supabase.from(table as any) as any;
  },
};
