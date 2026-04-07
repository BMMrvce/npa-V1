#!/bin/bash

# Backend-only startup script for Railway/production
# This only runs the Deno backend, frontend is on Vercel

cd /app

echo "🚀 Starting NPA Backend (Deno)..."
echo "📡 Backend listening on port ${PORT:-8000}"

deno run --allow-net --allow-env --allow-read index.ts
