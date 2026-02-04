# Email Functionality Setup - Simple Steps 🚀

## Quick Overview

The system now:
✅ Asks for official email when creating organizations/technicians  
✅ Stores the official email in the database  
✅ Sends credentials to that official email  
✅ Keeps both NPA system email and official email separate

---

## Step 1: Run Database Migrations

### What This Does

Adds `official_email` column to both `organizations` and `technicians` tables in Supabase.

### SQL Migrations Created

Two new migration files have been added:

```
backend/migrations/2026-02-03-add-official-email-organizations.sql
backend/migrations/2026-02-03-add-official-email-technicians.sql
```

### How to Apply

#### Option A: Using Supabase Console (Easiest)

1. Go to [https://supabase.com](https://supabase.com)
2. Open your project
3. Go to **SQL Editor**
4. Click **New Query**
5. Copy and paste the first SQL:

   ```sql
   ALTER TABLE organizations
   ADD COLUMN official_email VARCHAR(255);

   CREATE INDEX idx_organizations_official_email ON organizations(official_email);

   COMMENT ON COLUMN organizations.official_email IS 'Official email address where account credentials are sent';
   ```

6. Click **Run**
7. Repeat steps 3-6 with the second SQL:

   ```sql
   ALTER TABLE technicians
   ADD COLUMN official_email VARCHAR(255);

   CREATE INDEX idx_technicians_official_email ON technicians(official_email);

   COMMENT ON COLUMN technicians.official_email IS 'Official email address where account credentials are sent';
   ```

#### Option B: Using Command Line

If you have Supabase CLI installed:

```bash
cd backend
supabase db push  # This will run all pending migrations
```

---

## Step 2: Update Google API Credentials

### Have You Set Up Google API Yet?

**If NO:**

1. Follow [GOOGLE_EMAIL_SETUP.md](./GOOGLE_EMAIL_SETUP.md) (30-45 minutes)
2. Come back to this guide when done

**If YES:**
✅ Skip to Step 3

---

## Step 3: Set Environment Variables

### Add to `backend/.env`

```env
# Google OAuth2 Credentials (from Google Cloud Console)
GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REFRESH_TOKEN=your_refresh_token

# Gmail sender address
GMAIL_FROM_ADDRESS=noreply@yourcompany.com

# Frontend login URL
APP_LOGIN_URL=https://your-app-domain.com/login
```

### Where to Get These Values

See [GOOGLE_EMAIL_SETUP.md](./GOOGLE_EMAIL_SETUP.md) Section 7 for detailed instructions.

---

## Step 4: Update Frontend Forms

### For Organization Creation

Add this field to your organization creation form:

```jsx
// React Example
const [officialEmail, setOfficialEmail] = useState("");

<div className="form-group">
  <label>Official Email Address *</label>
  <input
    type="email"
    placeholder="Where to send credentials (e.g., admin@company.com)"
    value={officialEmail}
    onChange={(e) => setOfficialEmail(e.target.value)}
    required
  />
  <small>Credentials will be sent to this email address</small>
</div>;
```

### For Technician Creation

Add this field to your technician creation form:

```jsx
// React Example
const [officialEmail, setOfficialEmail] = useState("");

<div className="form-group">
  <label>Official Email Address *</label>
  <input
    type="email"
    placeholder="Technician's email (where to send credentials)"
    value={officialEmail}
    onChange={(e) => setOfficialEmail(e.target.value)}
    required
  />
  <small>Credentials will be sent to this email address</small>
</div>;
```

---

## Step 5: Update API Calls

### Organization Creation API Call

```javascript
const createOrganization = async (formData) => {
  const response = await fetch("/make-server-60660975/organizations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify({
      companyName: formData.companyName,
      pan: formData.pan,
      phoneNo: formData.phoneNo,
      email: formData.email,
      gstNo: formData.gstNo,
      address: formData.address,
      officialEmail: formData.officialEmail, // ✅ Add this
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    console.error("Error:", error.error);
    return null;
  }

  const data = await response.json();
  console.log("Organization created:", data);
  return data;
};
```

### Technician Creation API Call

```javascript
const createTechnician = async (formData) => {
  const response = await fetch("/make-server-60660975/technicians", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify({
      name: formData.name,
      contactNo: formData.contactNo,
      email: formData.email,
      pan: formData.pan,
      aadhar: formData.aadhar,
      officialEmail: formData.officialEmail, // ✅ Add this
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    console.error("Error:", error.error);
    return null;
  }

  const data = await response.json();
  console.log("Technician created:", data);
  return data;
};
```

---

## Step 6: Test Everything

### Test Organization Creation

1. Go to Organizations page
2. Click "Create Organization"
3. Fill in the form **including** the new "Official Email Address" field
4. Submit

**Expected Result:**

- Organization created in database
- `official_email` stored in database
- Email sent to the official email address with credentials

### Test Technician Creation

1. Go to Technicians page
2. Click "Create Technician"
3. Fill in the form **including** the new "Official Email Address" field
4. Submit

**Expected Result:**

- Technician created in database
- `official_email` stored in database
- Email sent to the official email address with credentials

### Verify Email Was Sent

Check:

1. **Backend logs** for: `Credentials email sent to [email]`
2. **Email inbox** for the credentials email
3. **Database** - Query: `SELECT * FROM organizations WHERE id = 'xxx';` - should show `official_email`

---

## What The Flow Looks Like

```
┌─────────────────────────────────────┐
│ 1. Admin fills form                 │
│    - Company Name: Acme Corp        │
│    - Official Email: admin@acme.com │
└─────────────────────────────────────┘
                ↓
┌─────────────────────────────────────┐
│ 2. System generates                 │
│    - NPA Email: npa005@npa.com      │
│    - Password: npa005@acmecorp      │
└─────────────────────────────────────┘
                ↓
┌─────────────────────────────────────┐
│ 3. Save to database                 │
│    - organizations table            │
│    - official_email: admin@acme.com │
└─────────────────────────────────────┘
                ↓
┌─────────────────────────────────────┐
│ 4. Send email                       │
│    To: admin@acme.com               │
│    Email: npa005@npa.com            │
│    Password: npa005@acmecorp        │
└─────────────────────────────────────┘
```

---

## Database Schema

### Organizations Table

```sql
Column Name       | Type      | Description
------------------+-----------+------------------------------------------
id                | UUID      | Primary key
name              | VARCHAR   | Company name
organization_code| VARCHAR   | NPA organization code
official_email    | VARCHAR   | Official email for credentials ⭐
email             | VARCHAR   | Organization system email
pan               | VARCHAR   | PAN number
gst_no            | VARCHAR   | GST number
phone_no          | VARCHAR   | Phone number
... (other fields)
```

### Technicians Table

```sql
Column Name       | Type      | Description
------------------+-----------+------------------------------------------
id                | BIGINT    | Primary key
name              | VARCHAR   | Technician name
code              | VARCHAR   | Technician code
official_email    | VARCHAR   | Official email for credentials ⭐
email             | VARCHAR   | Technician system email
phone             | VARCHAR   | Phone number
pan               | VARCHAR   | PAN number
aadhar            | VARCHAR   | Aadhar number
... (other fields)
```

---

## Troubleshooting

### Issue: "Official email address is required"

**Solution:** Make sure you're sending the `officialEmail` field in your API request

### Issue: Email not arriving

**Solution:**

1. Check backend logs for: `Failed to send credentials email`
2. Verify Google credentials are set correctly in `.env`
3. Check Gmail API is enabled in Google Cloud Console

### Issue: Database migration error

**Solution:**

1. Check if column already exists: `SELECT * FROM information_schema.columns WHERE table_name='organizations' AND column_name='official_email';`
2. If it exists, skip that migration
3. If it doesn't, manually run the SQL in Supabase console

### Issue: Official email not stored in database

**Solution:** Make sure you're sending `officialEmail` in the request body

---

## Complete Checklist

- [ ] Run database migrations (add `official_email` columns)
- [ ] Set up Google API credentials (if not done already)
- [ ] Add environment variables to `.env`
- [ ] Update frontend forms to include "Official Email" field
- [ ] Update API calls to send `officialEmail` parameter
- [ ] Restart backend server
- [ ] Test organization creation with email
- [ ] Verify email arrives at official email
- [ ] Verify email is stored in database
- [ ] Test technician creation with email
- [ ] Verify technician email stored in database

---

## API Request Examples

### Working Organization Creation Request

```bash
curl -X POST http://localhost:8000/make-server-60660975/organizations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "companyName": "Acme Corporation",
    "pan": "AAAPK5055K",
    "phoneNo": "9999999999",
    "email": "org@npa.com",
    "gstNo": "27AABCB1234B1Z0",
    "address": "123 Main St",
    "officialEmail": "ceo@acmecorp.com"
  }'
```

**Expected Response:**

```json
{
  "success": true,
  "organization": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "name": "Acme Corporation",
    "official_email": "ceo@acmecorp.com",
    ...
  },
  "credentials": {
    "email": "npa021@npa.com",
    "password": "npa021@acmecorporation"
  }
}
```

### Working Technician Creation Request

```bash
curl -X POST http://localhost:8000/make-server-60660975/technicians \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "Rajesh Kumar",
    "contactNo": "9876543210",
    "email": "rajesh@npa.com",
    "pan": "AABPK1234K",
    "aadhar": "123456789012",
    "officialEmail": "rajesh.kumar@techcompany.com"
  }'
```

**Expected Response:**

```json
{
  "success": true,
  "technician": {
    "id": 1,
    "name": "Rajesh Kumar",
    "official_email": "rajesh.kumar@techcompany.com",
    ...
  },
  "credentials": {
    "email": "tech_npa045@npa.com",
    "password": "npa045@rajeshkumar"
  }
}
```

---

## Summary

You now have a complete email system that:

1. ✅ Collects official email when creating org/technician
2. ✅ Stores it in the database
3. ✅ Sends credentials to that email
4. ✅ Keeps records for future reference

**Total Setup Time:** ~1-2 hours

- 15 min: Run migrations
- 30-45 min: Set up Google API (if not done)
- 15-20 min: Update frontend
- 10 min: Test

Let's go! 🎉
