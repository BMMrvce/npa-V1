import * as kv from "../../kv_store.ts";

console.log("🔍 Testing Supabase KV Store...");

try {
  // Set a value
  await kv.set("test_key", { message: "Hello from Deno!" });
  console.log("✅ Data set successfully!");

  // Get that value
  const data = await kv.get("test_key");
  console.log("📦 Retrieved data:", data);

  // Delete the key
  await kv.del("test_key");
  console.log("🗑️ Data deleted successfully!");

} catch (err) {
  console.error("❌ Error testing KV Store:", err);
}
