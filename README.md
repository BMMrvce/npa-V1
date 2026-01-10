# NPA Water Dispenser Management System

A comprehensive web-based management system for water dispenser maintenance, tracking, and administration with role-based access control for organizations and technicians.

## 🚀 Features

- **Multi-Role System**: Admin, Organization, and Technician portals with role-based access control
- **Device Management**: Track water dispensers with QR codes, maintenance history, and status monitoring
- **Ticketing System**: Create and manage maintenance tickets with assignment workflows
- **Organization Management**: Admin can create and manage organizations with auto-generated credentials
- **Technician Management**: Assign technicians to organizations and manage their access
- **Real-time Dashboard**: Overview of devices, tickets, and system status
- **Authentication**: Secure JWT-based authentication via Supabase Auth

## 🛠 Technology Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for build tooling
- **Tailwind CSS** for styling
- **React Router** for navigation
- **React Query** for state management
- **React Hook Form** for form handling

### Backend
- **Deno** runtime with TypeScript
- **Hono** web framework
- **Supabase** for database and authentication
- **PostgreSQL** database

### Deployment Options
- **Cloud**: Firebase Hosting + Google Cloud Run
- **Local VM**: Nginx + PM2 + Deno

## 📦 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Deno (latest stable)
- Git
- Supabase project with database and auth configured

### Local Development

1. **Clone the repository**
```bash
git clone https://github.com/BMMrvce/npa-V1.git
cd npa-V1
```

2. **Set up environment variables**
Create `backend/.env` with your Supabase credentials: [1](#0-0) 

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=public-anon-key
SUPABASE_SERVICE_ROLE_KEY=service-role-key
```

3. **Install dependencies and start services**
```bash
# Frontend dependencies
cd frontend && npm install && cd ..

# Start backend (Terminal 1)
cd backend
deno run --allow-net --allow-env --allow-read index.ts

# Start frontend (Terminal 2)
cd frontend
npm run dev
```

4. **Access the application**
    - Frontend: http://localhost:5173
    - Backend API: http://localhost:8000

### Docker Development (Recommended)

Use Docker Compose for quick setup: [2](#0-1) 

```bash
docker compose up --build
```

## 🏗 Project Structure

```
npa-V1/
├── backend/
│   ├── index.ts              # Main Deno server
│   ├── .env                  # Backend environment variables
│   └── migrations/           # SQL migration files
├── frontend/
│   ├── src/
│   │   ├── components/       # React components
│   │   ├── utils/           # Utility functions
│   │   └── utils/supabase/info.tsx  # Supabase configuration
│   ├── package.json
│   └── vite.config.ts
├── docker-compose.yml        # Docker development setup
├── firebase.json            # Firebase hosting configuration
└── SETUP.md                 # Detailed setup instructions
```

## 🔧 Database Setup

Run these migrations in your Supabase SQL editor: [3](#0-2) 

- `backend/migrations/2025-12-17-add-tickets-and-profiles.sql`
- `backend/migrations/2025-12-17-add-organization-auth-columns.sql`
- `backend/migrations/2025-12-17-add-technician-auth-columns.sql`

### Role Assignment

Create profiles for each auth user to assign roles: [4](#0-3) 

```sql
-- Admin
insert into profiles (user_id, role) values ('<auth_user_uuid>', 'admin');

-- Organization user
insert into profiles (user_id, role, organization_id)
values ('<auth_user_uuid>', 'organization', '<organization_uuid>');

-- Technician user
insert into profiles (user_id, role, technician_id)
values ('<auth_user_uuid>', 'technician', '<technician_uuid>');
```

## 🚀 Deployment

### Cloud Deployment (Primary)

Deploy to Firebase Hosting and Google Cloud Run: [5](#0-4) 

- **Frontend**: Firebase Hosting
- **Backend**: Google Cloud Run (containerized Deno)
- **Database**: Supabase PostgreSQL
- **Cost**: $30-75/month

### Local VM Deployment (Alternative)

Deploy on-premises with full control: [6](#0-5) 

- **Frontend**: Nginx static file server
- **Backend**: PM2-managed Deno processes
- **Database**: Self-hosted PostgreSQL or Supabase
- **Cost**: Higher upfront, lower recurring

### Deployment Commands

For cloud deployment, use the deploy script: [7](#0-6) 

```bash
bash deploy.sh
```

## 📱 Auto-Generated Credentials

### Organization Logins
When an admin creates an organization: [8](#0-7) 

- **Email**: `npa<ORGCODE>@npa.com`
- **Password**: `<ORGCODE_WITHOUT_DASHES>@<orgname>`

### Technician Logins
When an admin creates a technician: [9](#0-8) 

- **Email**: `techname@npa.com`
- **Password**: `techname@npa`

## 🔐 Security

- Never commit `backend/.env` to version control [10](#0-9) 
- Use environment-specific Supabase keys
- Implement proper CORS configuration
- Regular security updates for dependencies

## 🛠 Development Scripts

- `npm run dev` - Start frontend development server
- `npm run build` - Build frontend for production
- `docker compose up --build` - Start full development environment
- `bash start.sh` - Start both backend and frontend locally

## 📚 API Endpoints

The backend exposes RESTful APIs under the `/make-server-60660975/` prefix: [11](#0-10) 

- `GET /make-server-60660975/technicians` - List technicians
- `POST /make-server-60660975/devices` - Create device
- `GET /make-server-60660975/organizations` - List organizations
- `POST /make-server-60660975/tickets` - Create maintenance ticket

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Troubleshooting

- **401/500 errors**: Verify Supabase environment variables [12](#0-11) 
- **404 on auth endpoints**: Restart backend process [13](#0-12) 
- **Port conflicts**: Stop processes using ports 8000 or 5173, or change ports in configuration [14](#0-13) 

## 📞 Support

For support and questions:
- Create an issue in the GitHub repository
- Check the [Deployment Overview](https://github.com/BMMrvce/npa-V1/wiki/Deployment-Overview) wiki page
- Review the [SETUP.md](SETUP.md) file for detailed instructions

---

**Built with ❤️ for efficient water dispenser management**

## Notes
This README is generated based on the current codebase structure and deployment documentation. The project supports both cloud and on-premises deployment strategies, with comprehensive role-based access control and device management capabilities.

Wiki pages you might want to explore:
- [Deployment Overview (BMMrvce/npa-V1)](/wiki/BMMrvce/npa-V1#7.1)

### Citations

**File:** SETUP.md (L24-30)
```markdown
2. Create backend env file `backend/.env` with your Supabase credentials:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=public-anon-key
SUPABASE_SERVICE_ROLE_KEY=service-role-key
```
```

**File:** SETUP.md (L72-90)
```markdown
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
```

**File:** SETUP.md (L102-106)
```markdown
1. Run these migrations in the Supabase SQL editor:
  - `backend/migrations/2025-12-17-add-tickets-and-profiles.sql`
  - `backend/migrations/2025-12-17-add-organization-auth-columns.sql`
  - `backend/migrations/2025-12-17-add-technician-auth-columns.sql`

```

**File:** SETUP.md (L111-122)
```markdown
```sql
-- Admin (default if no row exists, but explicit is better)
insert into profiles (user_id, role) values ('<auth_user_uuid>', 'admin');

-- Organization user
insert into profiles (user_id, role, organization_id)
values ('<auth_user_uuid>', 'organization', '<organization_uuid>');

-- Technician user
insert into profiles (user_id, role, technician_id)
values ('<auth_user_uuid>', 'technician', '<technician_uuid>');
```
```

**File:** SETUP.md (L126-141)
```markdown
When an admin creates an organization via the app, the backend automatically creates an organization login:

- Email: `npa<ORGCODE>@npa.com` (normalized)
- Password: `<ORGCODE_WITHOUT_DASHES>@<orgname>` (sanitized)

The create-organization API response includes:

- `credentials.email`
- `credentials.password` (shown once so copy it)

Admin can manage org login from the Organizations page (key icon):

- View current email
- Update email
- Reset password (returns the new password so copy it)

```

**File:** SETUP.md (L142-153)
```markdown
## Technician portal credentials (auto-generated)

When an admin creates a technician via the app, the backend automatically creates a technician login:

- Email: `techname@npa.com` (derived from technician name; spaces/symbols removed)
- Password: `techname@npa`

Admin can manage technician login from the Technicians page (key icon):

- View/update login email
- Reset password (returns the new password so copy it)

```

**File:** SETUP.md (L154-155)
```markdown
## Troubleshooting
- If the backend returns 401/500, verify your Supabase env variables.
```

**File:** SETUP.md (L156-156)
```markdown
- If `GET/PUT /make-server-60660975/organizations/:id/auth` returns 404, you are almost certainly running an older backend process — restart `start.sh` (or kill port 8000 and start the backend again).
```

**File:** SETUP.md (L157-157)
```markdown
- If ports 8000 or 5173 are in use, either stop the process using them or change the ports in `docker-compose.yml` or `start.sh`.
```

**File:** SETUP.md (L160-161)
```markdown
## Security
- Do not commit `backend/.env` to source control.
```

**File:** .github/prompts/plan-localVmDeployment.prompt.md (L8-12)
```markdown
### Current Cloud Setup (Reference)
- **Frontend**: Firebase Hosting (https://npav1-3868c.web.app)
- **Backend**: Deno Deploy (https://npa-v1.bmmrvce.deno.net)
- **Database**: Supabase PostgreSQL (dhsmxdfzmixqqoqlnfka.supabase.co)
- **Authentication**: Supabase Auth
```

**File:** .github/prompts/plan-localVmDeployment.prompt.md (L14-19)
```markdown
### Target Local VM Setup
- **Frontend**: Nginx web server serving static React build
- **Backend**: Deno runtime with PM2/systemd for process management
- **Database**: Self-hosted PostgreSQL or continue using Supabase
- **Reverse Proxy**: Nginx with SSL/TLS termination
- **Domain**: Local domain or public domain with DNS pointing to VM
```

**File:** deploy.sh (L1-32)
```shellscript
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
```

**File:** frontend/src/components/OrganizationDetailPage.tsx (L164-186)
```typescript
      const response = await fetch(
        `${backendUrl}/make-server-60660975/technicians`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );
      const data = await response.json();
      if (response.ok) {
        setTechnicians(data.technicians || []);
      }
    } catch (error) {
      console.error('Error fetching technicians:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetch(
        `${backendUrl}/make-server-60660975/devices`,
```

<a href="https://deepwiki.com/BMMrvce/npa-V1"><img src="https://deepwiki.com/badge.svg" alt="Ask DeepWiki"></a>
