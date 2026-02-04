# Email Service Update - Official Email Configuration

## What Changed

The email service now sends credentials to the **admin's official email address** instead of the NPA system email.

## How It Works Now

### Organization Creation

**Required Fields:**

- `companyName` - Company name
- `pan` - PAN number
- `phoneNo` - Phone number
- `email` - Organization email
- `gstNo` - GST number
- `officialEmail` ⭐ **NEW** - Official email to send credentials to

**Credentials Sent:**

```
Email: npa005@npa.com          (auto-generated NPA system email)
Password: npaxxx@companyname   (auto-generated password)
Sent to: admin@officialmail.com (user-provided official email)
```

### Technician Creation

**Required Fields:**

- `name` - Technician name
- `contactNo` - Contact number
- `email` - Technician email
- `pan` - PAN number
- `aadhar` - Aadhar number
- `officialEmail` ⭐ **NEW** - Official email to send credentials to

**Credentials Sent:**

```
Email: tech_npa009@npa.com     (auto-generated NPA system email)
Password: npaxxx@companyname   (auto-generated password)
Sent to: manager@officialmail.com (user-provided official email)
```

## API Changes

### POST `/make-server-60660975/organizations`

**Before:**

```json
{
  "companyName": "Acme Corp",
  "pan": "AAAPK5055K",
  "phoneNo": "9999999999",
  "email": "org@npa.com",
  "gstNo": "27AABCB1234B1Z0"
}
```

**After (Updated):**

```json
{
  "companyName": "Acme Corp",
  "pan": "AAAPK5055K",
  "phoneNo": "9999999999",
  "email": "org@npa.com",
  "gstNo": "27AABCB1234B1Z0",
  "officialEmail": "admin@acmecorp.com"
}
```

### POST `/make-server-60660975/technicians`

**Before:**

```json
{
  "name": "John Doe",
  "contactNo": "9999999999",
  "email": "john@npa.com",
  "pan": "AABPK1234K",
  "aadhar": "123456789012"
}
```

**After (Updated):**

```json
{
  "name": "John Doe",
  "contactNo": "9999999999",
  "email": "john@npa.com",
  "pan": "AABPK1234K",
  "aadhar": "123456789012",
  "officialEmail": "john.doe@companymail.com"
}
```

## What The User Receives

The email template shows:

```
Hello [Name],

We're excited to welcome you onboard as a [Organization/Technician]...

Your Login Credentials:
Email: npa005@npa.com
Password: npaxxx@companyname

⚠️ Important Security Notice
Please change your password after logging in...

[Go to Login Button]
```

## Error Handling

- If `officialEmail` is not provided → Returns 400 error: "Official email address is required to send credentials"
- If email sending fails → Account creation still succeeds, error is logged

## Benefits

✅ Credentials sent to actual admin/manager email  
✅ NPA system email is used only for login  
✅ Professional email delivery  
✅ No emails sent to auto-generated NPA addresses  
✅ Better security (credentials don't go to system email)

## Implementation Details

### Files Modified

- `backend/index.ts` - Updated organization and technician endpoints
- `backend/utils/emailService.ts` - Updated sendCredentialsEmail function signature

### Key Changes

1. Added `officialEmail` parameter to both endpoints
2. Email sent to `officialEmail` instead of system email
3. System email shown in credentials but sent to official email
4. Validation that officialEmail is provided

## Frontend Updates Needed

When creating Organization/Technician, add a field for "Official Email" and include it in the request:

```typescript
// Example
const response = await fetch("/make-server-60660975/organizations", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    companyName,
    pan,
    phoneNo,
    email,
    gstNo,
    address,
    officialEmail: "admin@company.com", // ⭐ Add this
  }),
});
```

## Testing

Test the updated endpoints:

```bash
# Organization
curl -X POST http://localhost:8000/make-server-60660975/organizations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "companyName": "Test Corp",
    "pan": "AAAPK5055K",
    "phoneNo": "9999999999",
    "email": "test@npa.com",
    "gstNo": "27AABCB1234B1Z0",
    "officialEmail": "admin@testcorp.com"
  }'

# Technician
curl -X POST http://localhost:8000/make-server-60660975/technicians \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "John Tech",
    "contactNo": "9999999999",
    "email": "john@npa.com",
    "pan": "AABPK1234K",
    "aadhar": "123456789012",
    "officialEmail": "john@gmail.com"
  }'
```

## Backwards Compatibility

❌ **Breaking Change** - `officialEmail` is now required

- Update frontend forms to collect this field
- Update all API calls to include `officialEmail`

## Summary

- ✅ Credentials now sent to official email (not NPA system email)
- ✅ NPA system email shown in credentials for login
- ✅ Password still auto-generated in format: npaxxx@companyname
- ✅ Works for both Organization and Technician creation
- ⚠️ Requires frontend update to collect official email address
