# SendGrid Email Integration Setup Guide

## Overview

The NPA Management System now uses **SendGrid** for sending automated emails to organizations, technicians, and device notifications. This replaces the previous SMTP-based email system.

## Email Scenarios

The system automatically sends emails in the following scenarios:

### 1. **Organization Creation**

- **Recipient**: Organization's official email address
- **Content**: Portal login credentials and organization code
- **Trigger**: When a new organization is created via the admin panel

### 2. **Technician Creation**

- **Recipient**: Technician's email address
- **Content**: Portal login credentials and technician code
- **Trigger**: When a new technician is created via the admin panel

### 3. **Device Addition**

- **Recipient**: Organization's official email address
- **Content**: Device details including name, code, serial number, and model
- **Trigger**: When a new device is added to an organization

---

## Setup Instructions

### Step 1: Create a SendGrid Account

1. Go to [SendGrid](https://sendgrid.com)
2. Sign up for a free account
3. Verify your email address

### Step 2: Create an API Key

1. Log in to your SendGrid account
2. Navigate to **Settings > API Keys**
3. Click **Create API Key**
4. Give it a name: `NPA-Management-System`
5. Select permissions: **Mail Send** (full access)
6. Click **Create & Continue**
7. Copy the API key (you won't be able to see it again)

### Step 3: Configure Environment Variables

Add the following environment variables to your `.env` file in the backend directory:

```env
# SendGrid Configuration
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SENDER_EMAIL=noreply@npa.com
```

**Important Notes:**

- Replace `SG.xxxx...` with your actual SendGrid API key
- Set `SENDER_EMAIL` to a verified sender email address in SendGrid
- Keep the API key secure and never commit it to version control

### Step 4: Verify Sender Email (Required for Production)

1. In SendGrid account, go to **Settings > Sender Authentication**
2. Click **Create New Sender**
3. Fill in the form with your organization details
4. SendGrid will send a verification email
5. Click the verification link in the email
6. Once verified, use this email as `SENDER_EMAIL`

For testing/development, you can use the default SendGrid sandbox email.

### Step 5: Deploy and Test

1. Update your `.env` file with valid credentials
2. Restart the backend server
3. Test by:
   - Creating a new organization
   - Creating a new technician
   - Adding a new device to an organization

Check your email inbox for the automated emails.

---

## Email Templates

### Organization Welcome Email

**Subject:** Welcome to NPA Management System - Organization Portal Access

**Includes:**

- Organization name and code
- Portal login email
- Temporary password (user should change after login)
- Link to login portal
- Professional styling with company branding

### Technician Welcome Email

**Subject:** Your NPA Technician Account is Ready

**Includes:**

- Technician name and code
- Portal login email
- Temporary password (user should change after login)
- Link to technician portal
- Professional styling

### Device Notification Email

**Subject:** New Device Added - [Device Name]

**Includes:**

- Device name
- Device code
- Serial number
- Model information
- Confirmation message

---

## Troubleshooting

### Email Not Sending?

1. **Check API Key**
   - Verify `SENDGRID_API_KEY` is correctly set in `.env`
   - Make sure it's a valid, active API key from SendGrid

2. **Check Sender Email**
   - Ensure `SENDER_EMAIL` is verified in SendGrid
   - For production, use an authenticated sender

3. **Check Backend Logs**
   - Look for SendGrid API error messages in console
   - Check if email was rejected due to invalid recipient

4. **Verify Email Format**
   - Ensure recipient email addresses are valid
   - SendGrid rejects invalid email formats

### Common SendGrid Errors

| Error                 | Solution                                         |
| --------------------- | ------------------------------------------------ |
| 401 Unauthorized      | API key is invalid or expired. Create a new one. |
| 403 Forbidden         | API key doesn't have Mail Send permission.       |
| 400 Bad Request       | Invalid email format or missing required fields. |
| 429 Too Many Requests | Rate limited. Wait before retrying.              |

### Testing Locally

```bash
# Check if emails are being sent (look for log messages)
# In backend console output, you should see:
# "Email sent successfully to user@example.com"
# or
# "Failed to send email: [error message]"
```

---

## SendGrid Pricing

- **Free Tier**: 100 emails/day (perfect for testing)
- **Paid Plans**: Starting from $19.95/month for unlimited emails
- **Pay-As-You-Go**: $0.0001 per email after free tier

---

## Security Best Practices

1. **Never commit API keys** to version control
2. **Use environment variables** for all sensitive data
3. **Rotate API keys** periodically
4. **Use domain authentication** in production
5. **Monitor SendGrid activity** for unusual patterns

---

## API Reference

### SendGrid Mail Send API

The system uses SendGrid's Mail Send API v3:

- **Endpoint**: `https://api.sendgrid.com/v3/mail/send`
- **Method**: POST
- **Authentication**: Bearer token (API key)

### Email Service Functions

Located in `backend/utils/emailService.ts`:

```typescript
// Send organization credentials
sendOrganizationCredentialsEmail(
  email: string,
  authEmail: string,
  password: string,
  organizationName: string,
  organizationCode: string
): Promise<boolean>

// Send technician credentials
sendTechnicianCredentialsEmail(
  email: string,
  authEmail: string,
  password: string,
  technicianName: string,
  techCode: string
): Promise<boolean>

// Send device notification
sendDeviceAdditionEmail(
  organizationEmail: string,
  organizationName: string,
  deviceName: string,
  deviceCode: string,
  serialNumber: string,
  model: string
): Promise<boolean>
```

---

## FAQ

**Q: Can I use my own email domain?**
A: Yes! Use SendGrid's domain authentication feature to send from your own domain.

**Q: What if an email fails to send?**
A: The system logs the error but doesn't fail the operation. Check SendGrid activity log for details.

**Q: Can I customize email templates?**
A: Yes! Edit the `generateOrganizationEmailContent()`, `generateTechnicianEmailContent()`, and `generateDeviceAdditionEmailContent()` functions in `backend/utils/emailService.ts`

**Q: How are passwords handled?**
A: Passwords are generated during user creation and sent via email. Users are encouraged to change them after first login.

**Q: Is there a way to resend credentials?**
A: Currently, you can manually send credentials through the admin panel's password reset feature.

---

## Migration Notes

If you were previously using SMTP:

1. All SMTP configuration can be removed
2. `emailService.ts` now uses SendGrid exclusively
3. No database changes needed
4. Email sending is non-blocking (fire-and-forget)

---

## Support

For SendGrid support:

- Visit: https://support.sendgrid.com
- Documentation: https://docs.sendgrid.com
- Status: https://status.sendgrid.com
