# Firebase Deployment Guide

## Prerequisites
- Node.js 18+
- gcloud CLI
- Firebase CLI
- A Firebase project
- Deno environment (or use Cloud Run image)

## Step 1: Create Firebase Project
```bash
firebase projects:create my-npa-project
firebase use my-npa-project
```

Or use an existing project:
```bash
firebase use my-existing-project
```

## Step 2: Build Frontend
```bash
cd frontend
npm install
npm run build
cd ..
```

## Step 3: Update `info.tsx` for Production

Edit `frontend/src/utils/supabase/info.tsx` with your production backend URL:
```tsx
export const backendUrl = "https://npa-backend-xxxxxxxxxx.asia-south1.run.app"  // Cloud Run URL after deployment
```

Then rebuild the frontend:
```bash
cd frontend && npm run build && cd ..
```

## Step 4: Deploy Backend to Cloud Run

First, ensure your backend can read environment variables. Update `backend/index.ts` to load from `Deno.env`:
```ts
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const CORS_ORIGIN = Deno.env.get('CORS_ORIGIN');
```

Then deploy:
```bash
gcloud auth login
gcloud config set project my-npa-project

# Build Docker image (adjust region as needed)
gcloud builds submit --tag gcr.io/my-npa-project/npa-backend ./backend

# Deploy to Cloud Run
gcloud run deploy npa-backend \
  --image gcr.io/my-npa-project/npa-backend \
  --region asia-south1 \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars \
    SUPABASE_URL=https://dhsmxdfzmixqqoqlnfka.supabase.co,\
    SUPABASE_ANON_KEY=<your_anon_key>,\
    SUPABASE_SERVICE_ROLE_KEY=<your_service_role_key>,\
    CORS_ORIGIN=https://my-npa-project.web.app,\
    PORT=8080
```

Copy the resulting Cloud Run URL (e.g., `https://npa-backend-xxxxxxxxxx.asia-south1.run.app`).

## Step 5: Update Frontend with Cloud Run URL

Edit `frontend/src/utils/supabase/info.tsx`:
```tsx
export const backendUrl = "https://npa-backend-xxxxxxxxxx.asia-south1.run.app"
```

Rebuild frontend:
```bash
cd frontend && npm run build && cd ..
```

## Step 6: Deploy Frontend to Firebase Hosting

```bash
firebase init hosting  # If not already done; choose dist/ for public dir, say yes to SPA

firebase deploy --only hosting
```

## Step 7: Verify Deployment
- Visit your Hosting URL: `https://my-npa-project.web.app`
- Ensure API calls are proxied to Cloud Run via rewrite rules in `firebase.json`
- Check browser Network tab; API calls should go to `/make-server-60660975/**` and be rewritten to Cloud Run

## Troubleshooting

**CORS errors?**  
- Update `CORS_ORIGIN` env var in Cloud Run to your Hosting URL

**API calls return 404?**  
- Ensure `firebase.json` rewrites are correct  
- Verify backend is running: `gcloud run services list`

**Build fails?**  
- Run `npm ci && npm run build` to ensure clean builds  
- Check Node version: `node --version`

## Local Development
For local testing before deployment:
```bash
# Keep backend at http://localhost:8000
cd frontend && npm run dev

# Backend keeps default:
# backendUrl = "http://localhost:8000"
```

## Notes
- Deno backend runs as a single container; adjust memory as needed in gcloud (default 256MB).
- Firebase Hosting has generous free tier; Cloud Run charges per invocation + CPU.
- To reduce latency, deploy backend to a region closer to your users.
