// SendGrid Email Service
// Handles all email notifications for organizations, technicians, and devices

const SENDGRID_API_KEY = Deno.env.get("SENDGRID_API_KEY");
const SENDER_EMAIL = Deno.env.get("SENDER_EMAIL") || "noreply@npa.com";

// SendGrid API endpoint
const SENDGRID_URL = "https://api.sendgrid.com/v3/mail/send";

interface EmailContent {
  subject: string;
  html: string;
  text: string;
}

/**
 * Send email using SendGrid
 */
async function sendEmail(
  to: string,
  subject: string,
  htmlContent: string,
  textContent: string,
): Promise<boolean> {
  if (!SENDGRID_API_KEY) {
    console.error("SENDGRID_API_KEY is not configured");
    return false;
  }

  try {
    const payload = {
      personalizations: [
        {
          to: [{ email: to }],
          subject: subject,
        },
      ],
      from: { email: SENDER_EMAIL },
      content: [
        {
          type: "text/plain",
          value: textContent,
        },
        {
          type: "text/html",
          value: htmlContent,
        },
      ],
    };

    const response = await fetch(SENDGRID_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SENDGRID_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`SendGrid API error (${response.status}):`, errorBody);
      return false;
    }

    console.log(`Email sent successfully to ${to}`);
    return true;
  } catch (error) {
    console.error("Error sending email:", error);
    return false;
  }
}

/**
 * Generate organization creation email content
 */
function generateOrganizationEmailContent(
  organizationName: string,
  authEmail: string,
  password: string,
  organizationCode: string,
): EmailContent {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #2c3e50; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
          .content { background-color: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; }
          .credentials { background-color: #e8f4f8; padding: 15px; border-left: 4px solid #3498db; margin: 20px 0; }
          .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
          .button { display: inline-block; background-color: #3498db; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to NPA Management System</h1>
          </div>
          <div class="content">
            <h2>Organization Created Successfully</h2>
            <p>Dear <strong>${organizationName}</strong>,</p>
            <p>Your organization has been successfully registered in the NPA Management System. Your organization code is: <strong>${organizationCode}</strong></p>
            
            <h3>Portal Login Credentials</h3>
            <div class="credentials">
              <p><strong>Email:</strong> ${authEmail}</p>
              <p><strong>Password:</strong> ${password}</p>
            </div>
            
            <p>You can now log in to the organization portal using these credentials. Please change your password after your first login for security purposes.</p>
            
            <p style="text-align: center; margin-top: 30px;">
              <a href="https://npa.example.com/login" class="button">Go to Login Portal</a>
            </p>
            
            <div class="footer">
              <p>If you did not request this account or have any questions, please contact our support team.</p>
              <p>&copy; 2026 NPA Management System. All rights reserved.</p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;

  const textContent = `
Welcome to NPA Management System

Organization Created Successfully

Dear ${organizationName},

Your organization has been successfully registered in the NPA Management System.
Organization Code: ${organizationCode}

Portal Login Credentials:
Email: ${authEmail}
Password: ${password}

You can now log in to the organization portal using these credentials. 
Please change your password after your first login for security purposes.

If you did not request this account or have any questions, please contact our support team.

© 2026 NPA Management System. All rights reserved.
  `;

  return {
    subject: `Welcome to NPA Management System - Organization Portal Access`,
    html: htmlContent,
    text: textContent,
  };
}

/**
 * Generate technician creation email content
 */
function generateTechnicianEmailContent(
  technicianName: string,
  authEmail: string,
  password: string,
  techCode: string,
): EmailContent {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #27ae60; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
          .content { background-color: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; }
          .credentials { background-color: #e8f8f0; padding: 15px; border-left: 4px solid #27ae60; margin: 20px 0; }
          .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
          .button { display: inline-block; background-color: #27ae60; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>NPA Technician Portal</h1>
          </div>
          <div class="content">
            <h2>Your Technician Account is Ready</h2>
            <p>Dear <strong>${technicianName}</strong>,</p>
            <p>Your technician account has been successfully created in the NPA Management System. Your technician code is: <strong>${techCode}</strong></p>
            
            <h3>Portal Login Credentials</h3>
            <div class="credentials">
              <p><strong>Email:</strong> ${authEmail}</p>
              <p><strong>Password:</strong> ${password}</p>
            </div>
            
            <p>You can now log in to the technician portal using these credentials. Please change your password after your first login for security purposes.</p>
            
            <p style="text-align: center; margin-top: 30px;">
              <a href="https://npa.example.com/tech-login" class="button">Go to Technician Portal</a>
            </p>
            
            <div class="footer">
              <p>If you did not request this account or have any questions, please contact the administrator.</p>
              <p>&copy; 2026 NPA Management System. All rights reserved.</p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;

  const textContent = `
NPA Technician Portal

Your Technician Account is Ready

Dear ${technicianName},

Your technician account has been successfully created in the NPA Management System.
Technician Code: ${techCode}

Portal Login Credentials:
Email: ${authEmail}
Password: ${password}

You can now log in to the technician portal using these credentials.
Please change your password after your first login for security purposes.

If you did not request this account or have any questions, please contact the administrator.

© 2026 NPA Management System. All rights reserved.
  `;

  return {
    subject: `Your NPA Technician Account is Ready`,
    html: htmlContent,
    text: textContent,
  };
}

/**
 * Generate device addition email content
 */
function generateDeviceAdditionEmailContent(
  organizationName: string,
  deviceName: string,
  deviceCode: string,
  serialNumber: string,
  model: string,
): EmailContent {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #e74c3c; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
          .content { background-color: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; }
          .device-info { background-color: #fef5e7; padding: 15px; border-left: 4px solid #f39c12; margin: 20px 0; }
          .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #ddd; }
          .info-label { font-weight: bold; color: #555; }
          .info-value { color: #333; }
          .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>New Device Added</h1>
          </div>
          <div class="content">
            <h2>Device Registration Confirmation</h2>
            <p>Dear <strong>${organizationName}</strong>,</p>
            <p>A new device has been successfully added to your organization account.</p>
            
            <h3>Device Details</h3>
            <div class="device-info">
              <div class="info-row">
                <span class="info-label">Device Name:</span>
                <span class="info-value">${deviceName}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Device Code:</span>
                <span class="info-value">${deviceCode}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Serial Number:</span>
                <span class="info-value">${serialNumber}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Model:</span>
                <span class="info-value">${model || "Not specified"}</span>
              </div>
            </div>
            
            <p>You can view and manage all your devices from the organization dashboard.</p>
            
            <div class="footer">
              <p>If you did not register this device or have any questions, please contact our support team.</p>
              <p>&copy; 2026 NPA Management System. All rights reserved.</p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;

  const textContent = `
New Device Added

Device Registration Confirmation

Dear ${organizationName},

A new device has been successfully added to your organization account.

Device Details:
Device Name: ${deviceName}
Device Code: ${deviceCode}
Serial Number: ${serialNumber}
Model: ${model || "Not specified"}

You can view and manage all your devices from the organization dashboard.

If you did not register this device or have any questions, please contact our support team.

© 2026 NPA Management System. All rights reserved.
  `;

  return {
    subject: `New Device Added - ${deviceName}`,
    html: htmlContent,
    text: textContent,
  };
}

/**
 * Send credentials email for organization
 */
export async function sendOrganizationCredentialsEmail(
  email: string,
  authEmail: string,
  password: string,
  organizationName: string,
  organizationCode: string,
): Promise<boolean> {
  const content = generateOrganizationEmailContent(
    organizationName,
    authEmail,
    password,
    organizationCode,
  );

  return sendEmail(email, content.subject, content.html, content.text);
}

/**
 * Send credentials email for technician
 */
export async function sendTechnicianCredentialsEmail(
  email: string,
  authEmail: string,
  password: string,
  technicianName: string,
  techCode: string,
): Promise<boolean> {
  const content = generateTechnicianEmailContent(
    technicianName,
    authEmail,
    password,
    techCode,
  );

  return sendEmail(email, content.subject, content.html, content.text);
}

/**
 * Send device addition notification email
 */
export async function sendDeviceAdditionEmail(
  organizationEmail: string,
  organizationName: string,
  deviceName: string,
  deviceCode: string,
  serialNumber: string,
  model: string,
): Promise<boolean> {
  const content = generateDeviceAdditionEmailContent(
    organizationName,
    deviceName,
    deviceCode,
    serialNumber,
    model,
  );

  return sendEmail(
    organizationEmail,
    content.subject,
    content.html,
    content.text,
  );
}

/**
 * Legacy function name for backward compatibility
 */
export async function sendCredentialsEmail(
  email: string,
  authEmail: string,
  password: string,
  name: string,
  type: "organization" | "technician",
  extraData?: any,
): Promise<boolean> {
  if (type === "organization") {
    return sendOrganizationCredentialsEmail(
      email,
      authEmail,
      password,
      name,
      extraData?.organizationCode || "ORG-000",
    );
  } else if (type === "technician") {
    return sendTechnicianCredentialsEmail(
      email,
      authEmail,
      password,
      name,
      extraData?.techCode || "TECH-000000",
    );
  }
  return false;
}
