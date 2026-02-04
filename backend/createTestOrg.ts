// Create test organization with email: bmmadhuchandra@gmail.com
import { createClient } from "npm:@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(supabaseUrl, serviceRoleKey);

console.log("Creating test admin user...");

// Create an admin user for authentication
const { data: authUser, error: authError } =
  await supabase.auth.admin.createUser({
    email: "testadmin@npa.test",
    password: "TestPassword123!",
    email_confirm: true,
  });

if (authError) {
  console.error("Error creating user:", authError);
  Deno.exit(1);
}

const userId = authUser.user.id;
console.log(`Admin user created: ${userId}`);

// Create admin profile
await supabase
  .from("profiles")
  .upsert({ user_id: userId, role: "admin" }, { onConflict: "user_id" });

console.log("Profile created");

// Get auth token
const { data: signInData, error: signInError } =
  await supabase.auth.signInWithPassword({
    email: "testadmin@npa.test",
    password: "TestPassword123!",
  });

if (signInError) {
  console.error("Error signing in:", signInError);
  Deno.exit(1);
}

const token = signInData.session.access_token;
console.log("Auth token obtained\n");

// Now create organization via API
console.log("Creating organization...");

const response = await fetch(
  "http://localhost:8000/make-server-60660975/organizations",
  {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      companyName: "Madhuchandra Test Company",
      pan: "ABCDE1234F67890",
      phoneNo: "9876543210",
      email: "bmmadhuchandra@gmail.com",
      gstNo: "18AABCU9603R1Z5",
      address: "Test Address, City",
    }),
  },
);

const result = await response.json();

if (!response.ok) {
  console.error("Error creating organization:", result);
  Deno.exit(1);
}

console.log("\n✅ Organization created successfully!");
console.log("Organization Details:");
console.log(`  Name: ${result.organization.name}`);
console.log(`  Code: ${result.organization.organization_code}`);
console.log(`  Email: ${result.organization.email}`);
console.log(`  ID: ${result.organization.id}`);

if (result.credentials) {
  console.log("\nPortal Credentials:");
  console.log(`  Email: ${result.credentials.email}`);
  console.log(`  Password: ${result.credentials.password}`);
  console.log(
    "\n📧 Organization welcome email should be sent to: bmmadhuchandra@gmail.com",
  );
}

Deno.exit(0);
