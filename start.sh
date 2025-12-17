#!/bin/bash

# Clean up any existing processes on ports 8000 and 5173
echo "🧹 Cleaning up existing processes..."
lsof -ti:8000 | xargs kill -9 2>/dev/null || true
lsof -ti:5173 | xargs kill -9 2>/dev/null || true
sleep 1

echo "🚀 Starting backend and frontend..."
echo ""

# Load backend envs (and pass Supabase config to Vite)
if [ -f backend/.env ]; then
  echo "🔐 Loading env from backend/.env"
  set -a
  source backend/.env
  set +a

  # Ensure frontend uses the same Supabase project as backend
  if [ -n "${SUPABASE_URL:-}" ]; then
    export VITE_SUPABASE_URL="$SUPABASE_URL"
  fi
  if [ -n "${SUPABASE_ANON_KEY:-}" ]; then
    export VITE_SUPABASE_ANON_KEY="$SUPABASE_ANON_KEY"
  fi
fi

# Trap to kill all background processes on Ctrl+C
trap 'echo ""; echo "🛑 Shutting down..."; kill 0; exit' SIGINT SIGTERM

# Start backend
(
  cd backend
  echo "📡 Backend starting on http://localhost:8000"
  deno run --allow-net --allow-env --allow-read index.ts
) &

# Start frontend
(
  cd frontend
  echo "🌐 Frontend starting on http://localhost:5173"
  npm run dev
) &

# Wait for both processes
wait
