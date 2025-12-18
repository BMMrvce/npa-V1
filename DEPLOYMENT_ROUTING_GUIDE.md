# NPA Deployment & Routing Guide

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                   Firebase Hosting (Frontend)                    │
│              https://my-npa-project.web.app                      │
│  (Vite React SPA, serves dist/ with HTML rewrites to /index.html)│
└─────────┬───────────────────────────────────────────────────────┘
          │ rewrites /make-server-60660975/** → Cloud Run
          │ rewrites /devices/** → Cloud Run
          │ rewrites /organizations/** → Cloud Run
          ▼
┌─────────────────────────────────────────────────────────────────┐
│           Google Cloud Run (Backend – Deno)                      │
│    https://npa-backend-[HASH].asia-south1.run.app/              │
│                  (Hono + Deno API)                               │
└─────────┬───────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Supabase (Database)                           │
│          PostgreSQL + Auth + Realtime (optional)                 │
└─────────────────────────────────────────────────────────────────┘
```

## Frontend Routing (Client-Side)

Your React app doesn't use React Router yet, but here's the role-based structure:

### Public Routes
- `/login/admin` → Admin login
- `/login/org` → Organization login
- `/login/tech` → Technician login

### Authenticated Routes (role-guarded)
- `/admin/*` → Admin dashboard (organizations, devices, technicians, tickets, maintenance)
- `/org/*` → Organization portal (dashboard, devices, tickets)
- `/tech/*` → Technician portal (dashboard, tickets)

### Current Implementation
Apps are mounted based on role after login:
```tsx
// frontend/src/App.tsx
if (!isAuthenticated) {
  return <LoginSelectPage /> or <AdminLoginPage /> etc.
}

switch (role) {
  case 'admin':
    return <Dashboard token={token} />
  case 'organization':
    return <OrgPortal token={token} />
  case 'technician':
    return <TechPortal token={token} />
}
```

To upgrade this to proper React Router, you'd add:
```bash
npm install react-router-dom
```

Then refactor App.tsx (see example at end of this file).

## Backend API Routing

All backend routes begin with `/` or `/make-server-60660975/`:

### Admin Routes
```
GET    /organizations                    → List all organizations
POST   /organizations                    → Create organization
GET    /organizations/:id                → Get organization details
PUT    /organizations/:id                → Update organization
GET    /organizations/:id/archive        → Archive organization
GET    /devices                          → List all devices
GET    /technicians                      → List all technicians
GET    /maintenance                      → List all maintenance records
GET    /make-server-60660975/tickets     → List all tickets
POST   /make-server-60660975/tickets/:id/assign         → Assign ticket to tech
PATCH  /make-server-60660975/tickets/:id/status        → Update ticket status
```

### Organization Routes
```
GET    /make-server-60660975/org/dashboard              → Organization stats
GET    /make-server-60660975/org/devices                → Org's devices
GET    /make-server-60660975/org/tickets                → Org's tickets
POST   /make-server-60660975/org/tickets                → Raise ticket
```

### Technician Routes
```
GET    /make-server-60660975/tech/dashboard             → Tech stats
GET    /make-server-60660975/tech/tickets               → Assigned tickets
PATCH  /make-server-60660975/tech/tickets/:id/status   → Mark ticket done
```

### Auth Routes
```
POST   /make-server-60660975/signup                     → Create admin user (internal)
GET    /make-server-60660975/me                         → Get current user role
POST   /make-server-60660975/organizations/:id/auth             → Generate org credentials
GET    /make-server-60660975/organizations/:id/auth             → Get org auth
POST   /make-server-60660975/organizations/:id/auth/reset-password → Reset org password
POST   /make-server-60660975/technicians/:id/auth               → Generate tech credentials
GET    /make-server-60660975/technicians/:id/auth               → Get tech auth
POST   /make-server-60660975/technicians/:id/auth/reset-password → Reset tech password
```

## Deployment Steps

### 1. Build Frontend
```bash
cd frontend
npm ci
npm run build
cd ..
```

### 2. Deploy Backend to Cloud Run
```bash
gcloud auth login
gcloud config set project [YOUR-PROJECT-ID]
gcloud builds submit --tag gcr.io/[YOUR-PROJECT-ID]/npa-backend ./backend
gcloud run deploy npa-backend \
  --image gcr.io/[YOUR-PROJECT-ID]/npa-backend \
  --region asia-south1 \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars \
    SUPABASE_URL=[YOUR-SUPABASE-URL],\
    SUPABASE_ANON_KEY=[YOUR-ANON-KEY],\
    SUPABASE_SERVICE_ROLE_KEY=[YOUR-SERVICE-ROLE-KEY],\
    CORS_ORIGIN=https://[YOUR-PROJECT-ID].web.app,\
    PORT=8080
```

### 3. Update Frontend Backend URL
```bash
# Edit frontend/src/utils/supabase/info.tsx
export const backendUrl = "https://npa-backend-[YOUR-HASH].asia-south1.run.app"

# Rebuild
cd frontend && npm run build && cd ..
```

### 4. Deploy Frontend to Firebase Hosting
```bash
firebase use [YOUR-PROJECT-ID]
firebase deploy --only hosting
```

### 5. Verify
- Visit `https://[YOUR-PROJECT-ID].web.app`
- Log in and verify API calls use rewrites

## Environment Variables

### Backend (Cloud Run)
```
SUPABASE_URL              → Your Supabase project URL
SUPABASE_ANON_KEY         → Supabase anon key
SUPABASE_SERVICE_ROLE_KEY → Supabase service role key
CORS_ORIGIN               → Your Firebase Hosting URL
PORT                      → 8080 (default)
```

### Frontend (build-time)
```
VITE_SUPABASE_URL         → Your Supabase project URL
VITE_SUPABASE_ANON_KEY    → Supabase anon key
(backendUrl in info.tsx)  → Cloud Run URL
```

## Example: Upgrading to React Router

If you want to add React Router for cleaner routing:

```bash
npm install react-router-dom
```

Then update `frontend/src/main.tsx`:
```tsx
import { BrowserRouter } from 'react-router-dom';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);
```

And `frontend/src/App.tsx`:
```tsx
import { Routes, Route, Navigate } from 'react-router-dom';
import { LoginSelectPage } from './components/LoginSelectPage';
import { AdminLoginPage } from './components/AdminLoginPage';
import { OrgLoginPage } from './components/OrgLoginPage';
import { TechLoginPage } from './components/TechLoginPage';
import { Dashboard } from './components/Dashboard';
import { OrgPortal } from './components/OrgPortal';
import { TechPortal } from './components/TechPortal';

function RoleGuard({ requiredRole, currentRole, loading, children }: any) {
  if (loading) return <div>Loading...</div>;
  if (!currentRole || currentRole !== requiredRole) {
    return <Navigate to="/" replace />;
  }
  return children;
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [token, setToken] = useState('');
  const [role, setRole] = useState<'admin' | 'organization' | 'technician' | null>(null);
  const [loading, setLoading] = useState(true);

  // ... existing auth check logic ...

  return (
    <Routes>
      <Route path="/" element={!isAuthenticated ? <LoginSelectPage /> : <Navigate to={`/${role}`} />} />
      <Route path="/login/admin" element={<AdminLoginPage onLoginSuccess={handleLoginSuccess} />} />
      <Route path="/login/org" element={<OrgLoginPage onLoginSuccess={handleLoginSuccess} />} />
      <Route path="/login/tech" element={<TechLoginPage onLoginSuccess={handleLoginSuccess} />} />

      <Route path="/admin/*" element={
        <RoleGuard requiredRole="admin" currentRole={role} loading={loading}>
          <Dashboard token={token} />
        </RoleGuard>
      } />
      <Route path="/org/*" element={
        <RoleGuard requiredRole="organization" currentRole={role} loading={loading}>
          <OrgPortal token={token} />
        </RoleGuard>
      } />
      <Route path="/tech/*" element={
        <RoleGuard requiredRole="technician" currentRole={role} loading={loading}>
          <TechPortal token={token} />
        </RoleGuard>
      } />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| API calls return 404 | Verify `firebase.json` rewrites match your API paths. Check Cloud Run is running: `gcloud run services list` |
| CORS errors | Update `CORS_ORIGIN` env var in Cloud Run to your Hosting domain |
| Login fails after deployment | Ensure Supabase URL & keys in backend env match production |
| Frontend doesn't load | Verify `npm run build` completed; check `firebase.json` public path is `frontend/dist` |
| Role verification fails | Ensure `/make-server-60660975/me` endpoint returns correct role; check `profiles` table is populated |

## Costs Estimate (Monthly, Approximate)

- **Firebase Hosting**: ~$0 (generous free tier: 10 GB/month)
- **Cloud Run**: ~$5–50 (depends on traffic; 2M requests/month free)
- **Supabase**: ~$25 (Pro tier) or $5–25 (hobby + usage)
- **Total**: $30–75/month for small-to-medium use

## Next Steps

1. Test locally: `cd frontend && npm run dev` (with backend at localhost:8000)
2. Deploy to Firebase: follow steps above
3. Monitor: use Firebase Console + Cloud Run logs
4. Scale: adjust Cloud Run memory/CPU as needed
