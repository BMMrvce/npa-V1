#!/bin/bash

# Clean up any existing processes on ports 8000 and 5173
echo "🧹 Cleaning up existing processes..."
lsof -ti:8000 | xargs kill -9 2>/dev/null || true
lsof -ti:5173 | xargs kill -9 2>/dev/null || true
sleep 1

echo "🚀 Starting backend and frontend..."
echo ""

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
