import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://pxwwtwcbkecjyaneedhv.supabase.co";
const supabaseAnonKey = "sb_publishable_r3OlolMVFraZ_Zf4iawQFw_o2j9n2oZ";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
