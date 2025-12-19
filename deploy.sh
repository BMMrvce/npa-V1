#!/bin/bash

echo "🚀 Deploying NPA Backend and Frontend fixes"
echo ""

# Add all changes
echo "📦 Staging changes..."
git add backend/index.ts
git add frontend/src/components/LoginPage.tsx
git add frontend/src/components/OrganizationsPage.tsx  
git add frontend/src/utils/supabase/info.tsx

# Commit
echo "💾 Committing changes..."
git commit -m "Fix: Organization creation error handling and optional auth user setup

- Made auth user creation non-blocking during org creation
- Improved error logging and messaging
- Fixed role-based access control fallback
- Added better session expiration handling"

# Push to trigger deployment
echo "☁️  Pushing to GitHub (will trigger Deno Deploy)..."
git push origin main

echo ""
echo "✅ Changes pushed! Deno Deploy will automatically deploy the backend."
echo "   Check https://dash.deno.com/ for deployment status"
echo ""
echo "📝 Note: If Deno Deploy is not connected to GitHub, you'll need to:"
echo "   1. Go to https://dash.deno.com/projects/npa-v1"
echo "   2. Manually trigger a deployment or reconnect to GitHub"
