// Test SendGrid email sending directly
import { sendOrganizationCredentialsEmail } from "./utils/emailService.ts";

console.log("Testing SendGrid email functionality...");
console.log("API Key exists:", !!Deno.env.get("SENDGRID_API_KEY"));
console.log("Sender Email:", Deno.env.get("SENDER_EMAIL"));

// Test sending email
const testEmail = Deno.env.get("TEST_EMAIL") || "test@example.com";

console.log(`\nAttempting to send test email to: ${testEmail}`);

await sendOrganizationCredentialsEmail(
  testEmail,
  "npa001@npa.com",
  "TestPassword123!",
  "Test Organization",
  "NPA-001",
)
  .then((success) => {
    console.log(`\nEmail send result: ${success ? "SUCCESS ✓" : "FAILED ✗"}`);
    if (success) {
      console.log("Check your inbox for the test email!");
    } else {
      console.log("Check the error messages above for details");
    }
    Deno.exit(success ? 0 : 1);
  })
  .catch((err) => {
    console.error("\nError sending email:", err);
    Deno.exit(1);
  });
