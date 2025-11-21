import { supabase } from "./client.ts";

const { data, error } = await supabase.from("devices").select("*").limit(1);

if (error) {
  console.error("❌ Connection failed:", error);
} else {
  console.log("✅ Connected to Supabase! Sample data:", data);
}
