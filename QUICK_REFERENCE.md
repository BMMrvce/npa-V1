# Email Setup - Quick Reference Card 📋

## 6 Simple Steps

### Step 1️⃣: Database (5 minutes)

**Run these SQL queries in Supabase SQL Editor:**

Organizations:

```sql
ALTER TABLE organizations ADD COLUMN official_email VARCHAR(255);
CREATE INDEX idx_organizations_official_email ON organizations(official_email);
```

Technicians:

```sql
ALTER TABLE technicians ADD COLUMN official_email VARCHAR(255);
CREATE INDEX idx_technicians_official_email ON technicians(official_email);
```

### Step 2️⃣: Google API (30-45 minutes)

- Go to [Google Cloud Console](https://console.cloud.google.com)
- Enable Gmail API
- Create OAuth 2.0 credentials
- Get: `CLIENT_ID`, `CLIENT_SECRET`, `REFRESH_TOKEN`
- (See [GOOGLE_EMAIL_SETUP.md](./GOOGLE_EMAIL_SETUP.md) for detailed steps)

### Step 3️⃣: Environment Variables (2 minutes)

Add to `backend/.env`:

```env
GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_secret
GOOGLE_REFRESH_TOKEN=your_token
GMAIL_FROM_ADDRESS=noreply@yourcompany.com
APP_LOGIN_URL=https://your-app-domain.com/login
```

### Step 4️⃣: Frontend Form (10 minutes)

Add field to Organization/Technician forms:

```jsx
<input
  type="email"
  placeholder="Where to send credentials"
  onChange={(e) => setOfficialEmail(e.target.value)}
  required
/>
```

### Step 5️⃣: API Call (5 minutes)

Include in request:

```javascript
body: JSON.stringify({
  ...otherFields,
  officialEmail: formData.officialEmail, // ✅ Add this
});
```

### Step 6️⃣: Test (5 minutes)

1. Create organization/technician with official email
2. Check email inbox
3. Verify credentials email arrived
4. Done! 🎉

---

## What Gets Sent

```
TO: admin@company.com (official email)

Subject: Your Organization Portal Account Credentials

Email: npa005@npa.com
Password: npa005@companyname

⚠️ Change password after first login
```

---

## Database Storage

```sql
-- See stored official email
SELECT name, official_email FROM organizations WHERE id = 'xxx';

-- Find by official email
SELECT * FROM technicians WHERE official_email = 'john@company.com';
```

---

## Troubleshooting Quick Fixes

| Problem                   | Fix                                |
| ------------------------- | ---------------------------------- |
| "Official email required" | Add `officialEmail` to API request |
| Email not sent            | Check Google credentials in `.env` |
| Email not in database     | Restart backend server             |
| Column doesn't exist      | Run SQL migration                  |

---

## Code Changes Made

✅ Backend validates `officialEmail` is provided
✅ Backend stores `official_email` in database
✅ Email service sends to official email
✅ Credentials show NPA system email

---

## Files Updated

- `backend/index.ts` - Added email validation & storage
- `backend/utils/emailService.ts` - Updated email sending
- `backend/migrations/2026-02-03-*.sql` - Database schema

---

## API Endpoints

### POST `/make-server-60660975/organizations`

```json
{
  "companyName": "Acme Corp",
  "pan": "AAAPK5055K",
  "phoneNo": "9999999999",
  "email": "org@npa.com",
  "gstNo": "27AABCB1234B1Z0",
  "officialEmail": "admin@acmecorp.com" // ⭐ NEW
}
```

### POST `/make-server-60660975/technicians`

```json
{
  "name": "John Doe",
  "contactNo": "9999999999",
  "email": "john@npa.com",
  "pan": "AABPK1234K",
  "aadhar": "123456789012",
  "officialEmail": "john@company.com" // ⭐ NEW
}
```

---

## Email Flow Diagram

```
User fills form
    ↓
officialEmail + other data
    ↓
Backend validates & generates credentials
    ↓
Save to database:
  - official_email: admin@company.com
  - email: npa005@npa.com
  - password: npa005@...
    ↓
Send email to official address
  - To: admin@company.com
  - Email: npa005@npa.com
  - Password: npa005@...
    ↓
User receives credentials in inbox ✅
```

---

## Useful Commands

**Restart backend:**

```bash
bash start.sh
```

**View backend logs:**

```bash
# In another terminal
tail -f backend/logs.txt
```

**Test email sending:**

```bash
curl -X POST http://localhost:8000/make-server-60660975/organizations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"companyName":"Test","pan":"AAAPK5055K","phoneNo":"9999999999","email":"test@npa.com","gstNo":"27AABCB1234B1Z0","officialEmail":"test@example.com"}'
```

---

## Support

- Email setup: See [GOOGLE_EMAIL_SETUP.md](./GOOGLE_EMAIL_SETUP.md)
- Full guide: See [EMAIL_SETUP_GUIDE.md](./EMAIL_SETUP_GUIDE.md)
- Code details: See [OFFICIAL_EMAIL_IMPLEMENTATION.md](./OFFICIAL_EMAIL_IMPLEMENTATION.md)

---

**Status:** ✅ Ready to Deploy
**Estimated Time:** 1-2 hours
**Difficulty:** Easy 🟢
