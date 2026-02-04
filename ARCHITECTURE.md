# Email System Architecture & Flow

## System Overview Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     ADMIN DASHBOARD                         │
└─────────────────────────────────────────────────────────────┘
                            ↓
            ┌───────────────────────────────────┐
            │  Create Organization / Technician │
            │  - Company Name                   │
            │  - Contact Info                   │
            │  - Official Email ⭐              │
            └───────────────────────────────────┘
                            ↓
            ┌───────────────────────────────────┐
            │    Backend Validation             │
            │  - Check official_email provided │
            │  - Validate email format         │
            └───────────────────────────────────┘
                            ↓
      ┌─────────────────────────────────────────────────┐
      │         Generate Credentials                    │
      │  ✓ NPA Email: npa021@npa.com                   │
      │  ✓ Password: npa021@companyname                │
      │  ✓ Auth User: Create in Supabase              │
      └─────────────────────────────────────────────────┘
                            ↓
      ┌─────────────────────────────────────────────────┐
      │      Save to Database                           │
      │  ✓ organizations.official_email                │
      │  ✓ organizations.auth_user_id                  │
      │  ✓ profiles.user_id + role                     │
      └─────────────────────────────────────────────────┘
                            ↓
      ┌─────────────────────────────────────────────────┐
      │   Send Email (Async)                            │
      │  📧 emailService.sendCredentialsEmail()         │
      │  ✓ Get Google OAuth Token                       │
      │  ✓ Generate HTML Template                       │
      │  ✓ Send via Gmail API                          │
      │  → To: official_email (admin@company.com)       │
      └─────────────────────────────────────────────────┘
                            ↓
      ┌─────────────────────────────────────────────────┐
      │   Return Success to Admin                       │
      │  {                                              │
      │    "success": true,                             │
      │    "organization": {...},                       │
      │    "credentials": {                             │
      │      "email": "npa021@npa.com",                │
      │      "password": "npa021@..."                  │
      │    }                                            │
      │  }                                              │
      └─────────────────────────────────────────────────┘
                            ↓
            ┌───────────────────────────────────┐
            │  Admin Gets Email in Inbox        │
            │  - Shows NPA Email                │
            │  - Shows Password                 │
            │  - Shows Organization Name        │
            │  - Includes Login Link            │
            └───────────────────────────────────┘
                            ↓
            ┌───────────────────────────────────┐
            │  Admin/Org Login                  │
            │  Email: npa021@npa.com           │
            │  Password: npa021@...            │
            └───────────────────────────────────┘
```

---

## Data Flow for Organization Creation

```
Frontend Form Input
↓
officialEmail: "ceo@acmecorp.com"
companyName: "Acme Corp"
email: "org@npa.com"
pan: "AAAPK5055K"
phoneNo: "9876543210"
gstNo: "27AABCB1234B1Z0"
↓
POST /organizations
↓
Backend Processing
├─ Validate officialEmail ✓
├─ Generate NPA Email (npa021@npa.com) ✓
├─ Generate Password (npa021@acmecorp) ✓
├─ Create Auth User in Supabase ✓
├─ Create Profile (RBAC) ✓
└─ Save to Database
   organizations {
     id: "abc123",
     name: "Acme Corp",
     email: "npa021@npa.com",
     official_email: "ceo@acmecorp.com" ⭐
   }
↓
Send Email (Non-blocking)
├─ Recipient: ceo@acmecorp.com
├─ Subject: "Your Organization Portal Account Credentials"
├─ Email: npa021@npa.com
├─ Password: npa021@acmecorp
└─ HTML Template with logo
↓
Response to Admin
{
  "success": true,
  "organization": {...},
  "credentials": {...}
}
```

---

## Database Schema Changes

### Organizations Table (NEW COLUMN)

```sql
CREATE TABLE organizations (
  id UUID PRIMARY KEY,
  name VARCHAR(255),
  organization_code VARCHAR(50),
  email VARCHAR(255),
  official_email VARCHAR(255) ⭐ NEW -- Where to send credentials
  pan VARCHAR(50),
  phone_no VARCHAR(20),
  gst_no VARCHAR(50),
  address TEXT,
  auth_user_id UUID,
  auth_email VARCHAR(255),
  archived BOOLEAN,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

CREATE INDEX idx_organizations_official_email
  ON organizations(official_email);
```

### Technicians Table (NEW COLUMN)

```sql
CREATE TABLE technicians (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255),
  code VARCHAR(50),
  email VARCHAR(255),
  official_email VARCHAR(255) ⭐ NEW -- Where to send credentials
  phone VARCHAR(20),
  pan VARCHAR(50),
  aadhar VARCHAR(50),
  auth_user_id UUID,
  auth_email VARCHAR(255),
  is_archived BOOLEAN,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

CREATE INDEX idx_technicians_official_email
  ON technicians(official_email);
```

---

## Email Service Architecture

```
┌──────────────────────────────────────────┐
│   emailService.ts (Backend Service)      │
└──────────────────────────────────────────┘
           ↓
    ┌──────────────────┐
    │ getGoogleAccess  │
    │ Token()          │
    └────────┬─────────┘
             ↓
    ┌──────────────────────────────┐
    │ Check cached token           │
    │ (Valid + expires_in > now)   │
    └────────┬─────────────────────┘
             ↓
    ┌──────────────────────────────┐
    │ OAuth 2.0 Refresh Token Flow │
    │ → Google OAuth Endpoint      │
    │ ← New Access Token           │
    └────────┬─────────────────────┘
             ↓
    ┌──────────────────────────────┐
    │ Cache Token                  │
    │ (Expires in 1 hour)          │
    └────────┬─────────────────────┘
             ↓
    ┌──────────────────────────────┐
    │ sendEmail()                  │
    │ - Get access token           │
    │ - Create MIME message        │
    │ - Base64 encode              │
    │ - Send via Gmail API         │
    └──────────────────────────────┘
```

---

## Sequence Diagram: Email Sending

```
Admin        Frontend      Backend       Supabase      Google API
  │             │            │              │             │
  ├──Submit────→│            │              │             │
  │             ├──POST /org→│              │             │
  │             │            ├─Validate────→│             │
  │             │            │              ├─Auth Create │
  │             │            │              ├─Return ID──→│
  │             │            ├─Save DB──────→│             │
  │             │            │              ├─OK────────→│
  │             │            │              │             │
  │             │            ├─Send Email────────────────→│
  │             │            │ (Non-blocking)             │
  │             │  Response  │                             │
  │             │←─Success──┤                             │
  │  ✓ Created  │←─────────┤                             │
  │             │            │                             │
  │             │            │  📧 Email Sent             │
  │             │            │←─Response────────────────→│
  │             │            │                             │
  │  (Async)    │            │                             │
  ├──Check Mail─────────────────────────────────────────→│
  │             │            │                             │
  │  ✅ Email   │            │                             │
  │  Received   │            │                             │
```

---

## API Call Flow

```
Frontend
  ↓
POST /organizations
  {
    "companyName": "Acme",
    "pan": "AAAPK5055K",
    "phoneNo": "9876543210",
    "email": "org@npa.com",
    "gstNo": "27AABCB1234B1Z0",
    "officialEmail": "ceo@acme.com" ⭐
  }
  ↓
Backend: index.ts (POST /organizations endpoint)
  ├─ Validate organizationEmail
  ├─ Generate NPA Email + Password
  ├─ Create Auth User in Supabase
  ├─ Create Profile (Role + Org Link)
  ├─ Save Organization with official_email
  ├─ Call sendCredentialsEmail(officialEmail, ...)
  │   ├─ Get Google Access Token
  │   ├─ Generate HTML
  │   ├─ Send to officialEmail via Gmail API
  │   └─ Log result
  └─ Return response
     {
       "success": true,
       "organization": {...},
       "credentials": {...}
     }
  ↓
Database Updated
  organizations.official_email = "ceo@acme.com"
  ↓
Email Sent (Async)
  To: ceo@acme.com
  Contains: NPA Email + Password
```

---

## Error Handling Flow

```
Request Received
  ↓
  ├─ officialEmail missing?
  │   └─ Return 400: "Official email required"
  │
  ├─ Invalid email format?
  │   └─ Continue (let backend handle)
  │
  ├─ Database save fails?
  │   └─ Return 500: "Failed to create organization"
  │
  ├─ Auth user creation fails?
  │   └─ Rollback DB + Return 500
  │
  ├─ Email send fails?
  │   └─ Organization still created ✅
  │   └─ Log error
  │   └─ Return success (email failed silently)
  │
  └─ All OK?
     └─ Return 200 success
```

---

## Database Queries Reference

### Insert with Official Email

```sql
INSERT INTO organizations (
  name, organization_code, email, official_email, pan, phone_no, gst_no
) VALUES (
  'Acme Corp', 'NPA-021', 'npa021@npa.com', 'ceo@acmecorp.com', 'AAAPK5055K', '9876543210', '27AABCB1234B1Z0'
);
```

### Query by Official Email

```sql
SELECT * FROM organizations WHERE official_email = 'ceo@acmecorp.com';
```

### Get Organization with Email Info

```sql
SELECT
  id, name, email, official_email,
  auth_user_id, auth_email
FROM organizations
WHERE id = 'abc123';
```

### Find All with Official Emails

```sql
SELECT id, name, email, official_email
FROM organizations
WHERE official_email IS NOT NULL;
```

---

## Integration Checklist

```
┌─────────────────────────────────────┐
│ BACKEND (Already Done ✅)           │
├─────────────────────────────────────┤
│ ✅ Validate officialEmail           │
│ ✅ Save to database                 │
│ ✅ Send email to officialEmail      │
│ ✅ Generate credentials             │
│ ✅ Error handling                   │
└─────────────────────────────────────┘
                ↓
┌─────────────────────────────────────┐
│ DATABASE (Need to Run ⏳)            │
├─────────────────────────────────────┤
│ ⏳ Add official_email column        │
│ ⏳ Create index                     │
│ ⏳ Add to technicians too           │
└─────────────────────────────────────┘
                ↓
┌─────────────────────────────────────┐
│ FRONTEND (Need to Update ⏳)         │
├─────────────────────────────────────┤
│ ⏳ Add form field                   │
│ ⏳ Collect officialEmail            │
│ ⏳ Send in API request              │
│ ⏳ Show in response                 │
└─────────────────────────────────────┘
                ↓
┌─────────────────────────────────────┐
│ CONFIG (Need to Setup ⏳)            │
├─────────────────────────────────────┤
│ ⏳ Google API credentials           │
│ ⏳ Environment variables            │
│ ⏳ Restart backend                  │
└─────────────────────────────────────┘
                ↓
┌─────────────────────────────────────┐
│ TEST (Need to Verify ⏳)             │
├─────────────────────────────────────┤
│ ⏳ Create organization              │
│ ⏳ Check email received             │
│ ⏳ Verify database                  │
│ ⏳ Test technician too              │
└─────────────────────────────────────┘
```

---

## Success Indicators

### ✅ Working System Should Show:

1. **Frontend:**
   - Form has "Official Email" field
   - Field is required
   - Email format validated

2. **Backend:**
   - Accepts officialEmail in request
   - Stores in database
   - Logs: "Credentials email sent to [email]"

3. **Database:**
   - `organizations.official_email` has value
   - `technicians.official_email` has value
   - Can query by official_email

4. **Email:**
   - Arrives in inbox within 5 minutes
   - Contains NPA system email
   - Contains auto-generated password
   - Shows organization/technician name

---

## What Happens Behind the Scenes

```
┌─ User fills form with official email
│
├─ Backend receives request
│
├─ Validates officialEmail format
│
├─ Generates NPA Email (npa021@npa.com)
│
├─ Generates Password (npa021@companyname)
│
├─ Creates Auth User in Supabase
│  └─ Sets metadata (name, org_id)
│
├─ Creates Profile in Supabase
│  └─ Links user_id + role + org_id (RBAC)
│
├─ Saves to organizations table
│  └─ Sets official_email column
│
├─ Returns success response (NOT waiting for email)
│
└─ Async: Sends credentials email
   ├─ Gets Google OAuth token
   ├─ Creates HTML email
   ├─ Sends to official_email
   └─ Logs result
```

---

**This architecture ensures:**

- ✅ Non-blocking: User gets response immediately
- ✅ Reliable: Email sends in background
- ✅ Secure: Official email verified by recipient
- ✅ Auditable: Everything logged to database
