# Setup — NPA2 (local development)

This file describes how to get the project running on a new machine. It covers both local (native) development and an easy Docker-based development setup.

## Prerequisites
- Git
- Node.js (recommended v18 or v20) and npm
- Deno (latest stable)
- Docker & Docker Compose (optional, for containerized setup)
- A Supabase project (or equivalent endpoints) with these keys:
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`

## Quick local setup (native)

1. Clone the repo and change directory:

```bash
git clone <repo-url> npa-V1
cd npa-V1
```

2. Create backend env file `backend/.env` with your Supabase credentials:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=public-anon-key
SUPABASE_SERVICE_ROLE_KEY=service-role-key
```

3. Install frontend dependencies:

```bash
cd frontend
npm install
cd ..
```

4. Start backend and frontend (two terminals recommended):

Terminal A — Backend:

```bash
# export envs from backend/.env into your shell
export $(grep -v '^#' backend/.env | xargs)
cd backend
deno run --allow-net --allow-env --allow-read index.ts
```

Terminal B — Frontend:

```bash
cd fronten
npm run dev
# open http://localhost:5173
```

The project also includes `start.sh` which attempts to start both locally. Make sure envs are exported in the shell before running `bash start.sh`.

## Docker-based development (recommended for quick setup)

1. Make sure Docker and Docker Compose are installed.
2. Copy your `backend/.env` into the repo (or create it).
3. Start services:

```bash
docker compose up --build
```

This will:
- Run the backend Deno server on `http://localhost:8000`
- Run the frontend dev server on `http://localhost:5173`

To stop:

```bash
docker compose down
```

## Build frontend for production

```bash
cd frontend
npm run build
# serve the static output via your preferred static server
```

## Troubleshooting
- If the backend returns 401/500, verify your Supabase env variables.
- If ports 8000 or 5173 are in use, either stop the process using them or change the ports in `docker-compose.yml` or `start.sh`.
- Deno does not auto-load `.env` — ensure envs are exported to the shell or provided by Docker.

## Security
- Do not commit `backend/.env` to source control.

---
If you'd like, I can also add a `Makefile` or automate env loading in `start.sh`. Tell me which you'd prefer next.
