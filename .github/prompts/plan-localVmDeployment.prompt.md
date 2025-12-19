# Local VM Deployment Plan for NPA Water Dispenser Management System

## Overview
Deploy the NPA application on a client's local VM infrastructure with 24/7 uptime and accessibility for organizations and technicians.

## System Architecture

### Current Cloud Setup (Reference)
- **Frontend**: Firebase Hosting (https://npav1-3868c.web.app)
- **Backend**: Deno Deploy (https://npa-v1.bmmrvce.deno.net)
- **Database**: Supabase PostgreSQL (dhsmxdfzmixqqoqlnfka.supabase.co)
- **Authentication**: Supabase Auth

### Target Local VM Setup
- **Frontend**: Nginx web server serving static React build
- **Backend**: Deno runtime with PM2/systemd for process management
- **Database**: Self-hosted PostgreSQL or continue using Supabase
- **Reverse Proxy**: Nginx with SSL/TLS termination
- **Domain**: Local domain or public domain with DNS pointing to VM

---

## Phase 1: Infrastructure Setup

### 1.1 VM Requirements
**Minimum Specifications:**
- **OS**: Ubuntu 22.04 LTS or Debian 11/12
- **CPU**: 4 cores (2.0 GHz+)
- **RAM**: 8 GB minimum, 16 GB recommended
- **Storage**: 100 GB SSD minimum
- **Network**: Static IP address (public or private with port forwarding)
- **Firewall**: Ports 80, 443, 22 (SSH) accessible

### 1.2 Software Prerequisites
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install essential tools
sudo apt install -y curl wget git build-essential software-properties-common

# Install Nginx
sudo apt install -y nginx

# Install PostgreSQL (if self-hosting database)
sudo apt install -y postgresql postgresql-contrib

# Install Deno
curl -fsSL https://deno.land/install.sh | sh
echo 'export DENO_INSTALL="$HOME/.deno"' >> ~/.bashrc
echo 'export PATH="$DENO_INSTALL/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc

# Install Node.js and npm (for frontend build)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 (process manager)
sudo npm install -g pm2

# Install Certbot for SSL certificates
sudo apt install -y certbot python3-certbot-nginx
```

---

## Phase 2: Database Setup

### Option A: Self-Hosted PostgreSQL (Full Control)

#### 2.1 PostgreSQL Configuration
```bash
# Create database and user
sudo -u postgres psql

CREATE DATABASE npa_waterdispenser;
CREATE USER npa_admin WITH ENCRYPTED PASSWORD 'secure_password_here';
GRANT ALL PRIVILEGES ON DATABASE npa_waterdispenser TO npa_admin;
\q

# Configure PostgreSQL for remote connections (if needed)
sudo nano /etc/postgresql/14/main/postgresql.conf
# Set: listen_addresses = '*'

sudo nano /etc/postgresql/14/main/pg_hba.conf
# Add: host all all 0.0.0.0/0 md5

sudo systemctl restart postgresql
```

#### 2.2 Run Migrations
```bash
# Navigate to backend directory
cd /opt/npa-v1/backend

# Run all SQL migration files in order
for file in migrations/*.sql; do
    psql -U npa_admin -d npa_waterdispenser -f "$file"
done
```

### Option B: Continue Using Supabase (Easier)
- Keep existing Supabase connection
- No migration needed
- Requires internet connectivity
- Update `backend/.env` with Supabase credentials

---

## Phase 3: Backend Deployment

### 3.1 Deploy Backend Application
```bash
# Create application directory
sudo mkdir -p /opt/npa-v1
sudo chown $USER:$USER /opt/npa-v1

# Clone repository
cd /opt/npa-v1
git clone https://github.com/BMMrvce/npa-V1.git .

# Configure environment variables
cd backend
nano .env
```

**Backend `.env` file:**
```env
# Supabase Configuration
SUPABASE_URL=https://dhsmxdfzmixqqoqlnfka.supabase.co
SUPABASE_KEY=your_supabase_anon_key_here

# Or for self-hosted PostgreSQL:
DATABASE_URL=postgresql://npa_admin:secure_password_here@localhost:5432/npa_waterdispenser

# Server Configuration
PORT=8000
HOST=0.0.0.0

# CORS Configuration (update with actual domain)
ALLOWED_ORIGINS=https://npa.yourdomain.com,http://localhost:5173
```

### 3.2 Configure PM2 for Process Management
```bash
# Create PM2 ecosystem file
cd /opt/npa-v1/backend
nano ecosystem.config.js
```

**ecosystem.config.js:**
```javascript
module.exports = {
  apps: [{
    name: 'npa-backend',
    script: 'index.ts',
    interpreter: 'deno',
    interpreterArgs: 'run --allow-net --allow-read --allow-env',
    instances: 2,
    exec_mode: 'cluster',
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 8000
    }
  }]
};
```

### 3.3 Start Backend Service
```bash
# Start with PM2
cd /opt/npa-v1/backend
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup systemd
# Follow the command output instructions

# Check status
pm2 status
pm2 logs npa-backend
```

---

## Phase 4: Frontend Deployment

### 4.1 Build Frontend Application
```bash
cd /opt/npa-v1/frontend

# Install dependencies
npm install

# Update backend URL in info.tsx
nano src/utils/supabase/info.tsx
```

**Update `info.tsx`:**
```typescript
// Production URL - update with your VM's domain/IP
export const backendUrl = 'https://npa-api.yourdomain.com';
// Or for internal access: 'http://192.168.1.100:8000'

export const supabaseUrl = 'https://dhsmxdfzmixqqoqlnfka.supabase.co';
export const supabaseAnonKey = 'your_supabase_anon_key_here';
```

### 4.2 Build and Deploy
```bash
# Build for production
npm run build

# Deploy to Nginx web root
sudo mkdir -p /var/www/npa-frontend
sudo cp -r build/* /var/www/npa-frontend/
sudo chown -R www-data:www-data /var/www/npa-frontend
```

---

## Phase 5: Nginx Configuration

### 5.1 Configure Nginx for Frontend and Backend

**Create Nginx configuration:**
```bash
sudo nano /etc/nginx/sites-available/npa-app
```

**Nginx configuration file:**
```nginx
# Backend API Server
upstream npa_backend {
    server 127.0.0.1:8000;
    keepalive 64;
}

# Frontend Server
server {
    listen 80;
    listen [::]:80;
    server_name npa.yourdomain.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name npa.yourdomain.com;

    # SSL Certificates (will be configured with Certbot)
    ssl_certificate /etc/letsencrypt/live/npa.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/npa.yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Frontend - Serve static files
    location / {
        root /var/www/npa-frontend;
        index index.html;
        try_files $uri $uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # Backend API - Proxy to Deno backend
    location /api/ {
        rewrite ^/api/(.*) /$1 break;
        proxy_pass http://npa_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;

    # Client body size limit (for file uploads)
    client_max_body_size 50M;
}

# Backend API Server (separate subdomain)
server {
    listen 80;
    listen [::]:80;
    server_name npa-api.yourdomain.com;
    
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name npa-api.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/npa-api.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/npa-api.yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    location / {
        proxy_pass http://npa_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    client_max_body_size 50M;
}
```

### 5.2 Enable and Test Configuration
```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/npa-app /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
sudo systemctl enable nginx
```

---

## Phase 6: SSL/TLS Setup (HTTPS)

### 6.1 Obtain SSL Certificates

**For Public Domain:**
```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtain certificates for both domains
sudo certbot --nginx -d npa.yourdomain.com -d npa-api.yourdomain.com

# Test auto-renewal
sudo certbot renew --dry-run

# Certificates auto-renew via cron
```

**For Private/Internal Network:**
```bash
# Generate self-signed certificates
sudo mkdir -p /etc/ssl/private

sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/ssl/private/npa-selfsigned.key \
  -out /etc/ssl/certs/npa-selfsigned.crt \
  -subj "/C=IN/ST=Karnataka/L=Bangalore/O=NPA/CN=npa.local"

# Update Nginx config to use self-signed certificates
sudo nano /etc/nginx/sites-available/npa-app
# Update ssl_certificate and ssl_certificate_key paths
```

---

## Phase 7: Network and Access Configuration

### 7.1 Domain and DNS Setup

**Option A: Public Access (Recommended for 24/7)**
1. **Purchase Domain**: Register domain (e.g., npa-waterdispenser.com)
2. **DNS Configuration**:
   ```
   A Record: npa.yourdomain.com → VM_PUBLIC_IP
   A Record: npa-api.yourdomain.com → VM_PUBLIC_IP
   ```
3. **Firewall Rules**:
   ```bash
   # Open ports 80, 443
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   sudo ufw allow 22/tcp
   sudo ufw enable
   ```

**Option B: Local Network Access**
1. **Internal DNS or Hosts File**:
   - Add to client machines' `/etc/hosts` (Linux/Mac) or `C:\Windows\System32\drivers\etc\hosts` (Windows):
   ```
   192.168.1.100  npa.local
   192.168.1.100  npa-api.local
   ```
2. **VPN for Remote Access**: Setup OpenVPN or WireGuard for technicians

### 7.2 Router/Firewall Configuration (For Public Access)
```bash
# Port forwarding on router
# Forward external port 80 → VM IP:80
# Forward external port 443 → VM IP:443

# Or use Cloudflare Tunnel (no port forwarding needed)
# Install cloudflared
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared-linux-amd64.deb

# Authenticate and create tunnel
cloudflared tunnel login
cloudflared tunnel create npa-tunnel
cloudflared tunnel route dns npa-tunnel npa.yourdomain.com

# Create tunnel config
nano ~/.cloudflared/config.yml
```

**Cloudflare Tunnel config:**
```yaml
tunnel: <TUNNEL_ID>
credentials-file: /home/user/.cloudflared/<TUNNEL_ID>.json

ingress:
  - hostname: npa.yourdomain.com
    service: http://localhost:80
  - hostname: npa-api.yourdomain.com
    service: http://localhost:8000
  - service: http_status:404
```

```bash
# Run tunnel as service
sudo cloudflared service install
sudo systemctl start cloudflared
sudo systemctl enable cloudflared
```

---

## Phase 8: Monitoring and Maintenance

### 8.1 System Monitoring
```bash
# Install monitoring tools
sudo apt install -y htop iotop nethogs

# PM2 monitoring
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7

# View logs
pm2 logs npa-backend
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### 8.2 Backup Strategy
```bash
# Database backup script
nano /opt/npa-v1/backup.sh
```

**Backup script:**
```bash
#!/bin/bash
BACKUP_DIR="/opt/npa-backups"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

# Backup PostgreSQL database
pg_dump -U npa_admin npa_waterdispenser | gzip > "$BACKUP_DIR/db_backup_$DATE.sql.gz"

# Backup application code
tar -czf "$BACKUP_DIR/app_backup_$DATE.tar.gz" /opt/npa-v1

# Remove backups older than 30 days
find $BACKUP_DIR -name "*.gz" -mtime +30 -delete

echo "Backup completed: $DATE"
```

```bash
# Make executable
chmod +x /opt/npa-v1/backup.sh

# Add to crontab (daily backup at 2 AM)
crontab -e
# Add: 0 2 * * * /opt/npa-v1/backup.sh >> /var/log/npa-backup.log 2>&1
```

### 8.3 Auto-Update Script
```bash
nano /opt/npa-v1/update.sh
```

**Update script:**
```bash
#!/bin/bash
cd /opt/npa-v1

# Pull latest code
git pull origin main

# Update backend
cd backend
pm2 restart npa-backend

# Update frontend
cd ../frontend
npm install
npm run build
sudo cp -r build/* /var/www/npa-frontend/

echo "Update completed: $(date)"
```

### 8.4 Health Check and Uptime Monitoring
```bash
# Install UptimeRobot client or use systemd service monitoring
sudo nano /etc/systemd/system/npa-healthcheck.service
```

**Health check service:**
```ini
[Unit]
Description=NPA Health Check Service
After=network.target

[Service]
Type=simple
ExecStart=/usr/bin/curl -f http://localhost:8000/health || systemctl restart npa-backend
Restart=always
RestartSec=60

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable npa-healthcheck
sudo systemctl start npa-healthcheck
```

---

## Phase 9: User Access and Documentation

### 9.1 Access URLs

**For Organizations:**
- **Web Portal**: https://npa.yourdomain.com/org-login
- **Login Credentials**: Provided by admin (auto-generated organization codes)
- **Features**: View devices, maintenance history (read-only)

**For Technicians:**
- **Web Portal**: https://npa.yourdomain.com/tech-login
- **Login Credentials**: Provided by admin (auto-generated technician codes)
- **Features**: View assigned maintenance, update status, edit notes and charges

**For Administrators:**
- **Admin Panel**: https://npa.yourdomain.com/admin-login
- **Features**: Full access to manage devices, organizations, technicians, maintenance

### 9.2 Initial Setup Checklist
- [ ] Create admin user in Supabase dashboard
- [ ] Add organizations via Admin Dashboard
- [ ] Add technicians via Admin Dashboard
- [ ] Add devices and assign to organizations
- [ ] Test organization login and verify read-only access
- [ ] Test technician login and verify edit permissions
- [ ] Schedule test maintenance record
- [ ] Generate and download PDF report
- [ ] Verify email notifications (if configured)

### 9.3 User Training Documentation
```bash
# Create user guides
mkdir -p /opt/npa-v1/docs

# Organization User Guide
nano /opt/npa-v1/docs/organization-guide.md

# Technician User Guide
nano /opt/npa-v1/docs/technician-guide.md

# Admin User Guide
nano /opt/npa-v1/docs/admin-guide.md
```

---

## Phase 10: 24/7 Uptime Strategies

### 10.1 High Availability Setup

**Load Balancing (Optional for larger deployments):**
```nginx
upstream npa_backend_cluster {
    least_conn;
    server 127.0.0.1:8000;
    server 127.0.0.1:8001;
    server 127.0.0.1:8002;
    keepalive 64;
}
```

### 10.2 Automatic Restart on Failure
```bash
# PM2 already handles process crashes
pm2 startup systemd
pm2 save

# Monitor and restart services
sudo nano /etc/systemd/system/npa-monitor.service
```

**Monitor service:**
```ini
[Unit]
Description=NPA Application Monitor
After=network.target

[Service]
Type=simple
User=root
ExecStart=/opt/npa-v1/scripts/monitor.sh
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

**Monitor script:**
```bash
#!/bin/bash
while true; do
    # Check if backend is responding
    if ! curl -f http://localhost:8000/health > /dev/null 2>&1; then
        echo "Backend down, restarting..."
        pm2 restart npa-backend
    fi
    
    # Check if Nginx is running
    if ! systemctl is-active --quiet nginx; then
        echo "Nginx down, restarting..."
        sudo systemctl restart nginx
    fi
    
    sleep 60
done
```

### 10.3 Disaster Recovery
1. **Regular Backups**: Daily automated database and code backups
2. **Backup VM Snapshot**: Weekly VM image snapshots
3. **Off-site Backup**: Sync backups to external storage (S3, Google Drive)
4. **Recovery Time Objective (RTO)**: < 4 hours
5. **Documentation**: Maintain runbook for system restoration

---

## Security Hardening

### SSH Hardening
```bash
sudo nano /etc/ssh/sshd_config
# Disable root login: PermitRootLogin no
# Disable password auth: PasswordAuthentication no
# Use key-based authentication only
sudo systemctl restart sshd
```

### Firewall Rules
```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### Fail2Ban (Brute Force Protection)
```bash
sudo apt install -y fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### Regular Updates
```bash
# Auto-update security patches
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

---

## Troubleshooting Guide

### Backend Not Starting
```bash
# Check logs
pm2 logs npa-backend
deno run --allow-all backend/index.ts  # Test directly

# Check database connectivity
psql -U npa_admin -d npa_waterdispenser -h localhost
```

### Frontend Not Loading
```bash
# Check Nginx errors
sudo tail -f /var/log/nginx/error.log

# Verify build files
ls -la /var/www/npa-frontend

# Test Nginx config
sudo nginx -t
```

### Cannot Access from External Network
```bash
# Check firewall
sudo ufw status
sudo iptables -L -n

# Test connectivity
curl http://localhost:8000/health
curl http://localhost:80

# Check DNS resolution
nslookup npa.yourdomain.com
```

### SSL Certificate Issues
```bash
# Renew certificates manually
sudo certbot renew

# Check certificate expiry
sudo certbot certificates

# Test SSL
openssl s_client -connect npa.yourdomain.com:443
```

---

## Cost Comparison

### Cloud Deployment (Current)
- Firebase Hosting: Free tier or ~$25/month
- Deno Deploy: Free tier or ~$20/month
- Supabase: Free tier or ~$25/month
- **Total**: $0-70/month + scaling costs

### Local VM Deployment
- VM Instance: One-time hardware or cloud VM ($50-200/month)
- Domain + SSL: $10-20/year
- Electricity: Variable
- Maintenance: Time investment
- **Total**: Higher upfront, lower recurring
- **Benefit**: Full control, no vendor lock-in, data sovereignty

---

## Recommended Approach for 24/7 Uptime

### Best Solution: Hybrid Approach
1. **Keep Supabase for Database**: Managed, reliable, backed up
2. **Deploy Frontend + Backend on Local VM**: Full control
3. **Use Cloudflare Tunnel**: No port forwarding, DDoS protection, CDN
4. **Implement Monitoring**: UptimeRobot or Pingdom for alerts
5. **Automated Backups**: Daily database dumps to cloud storage

### Alternative: Fully Local with VPN
- Self-host everything including PostgreSQL
- Use WireGuard VPN for technician remote access
- Organizations access via local network or VPN
- **Trade-off**: More maintenance, higher complexity

---

## Timeline Estimate

- **Phase 1-2**: Infrastructure + Database (4-6 hours)
- **Phase 3-4**: Backend + Frontend Deployment (2-3 hours)
- **Phase 5-6**: Nginx + SSL Configuration (2-3 hours)
- **Phase 7**: Network Setup (1-2 hours, varies by approach)
- **Phase 8**: Monitoring + Backups (2-3 hours)
- **Phase 9-10**: Testing + Documentation (2-4 hours)

**Total Estimated Time**: 15-25 hours for complete setup

---

## Support and Maintenance

### Daily Tasks
- Monitor PM2 dashboard: `pm2 status`
- Check system resources: `htop`
- Review logs for errors

### Weekly Tasks
- Verify backups completed successfully
- Check SSL certificate expiry dates
- Review access logs for suspicious activity

### Monthly Tasks
- Apply security updates: `sudo apt update && sudo apt upgrade`
- Test disaster recovery procedures
- Review and rotate logs

---

## Conclusion

This plan provides a comprehensive roadmap for deploying the NPA Water Dispenser Management System on a local VM with 24/7 uptime. The hybrid approach (local VM + Supabase) offers the best balance of control, reliability, and ease of maintenance.

For production deployment, consider:
1. Using Cloudflare Tunnel for secure external access without port forwarding
2. Keeping Supabase for database (managed, backed up, reliable)
3. Implementing monitoring and automated backups
4. Providing VPN access for technicians if needed
5. Regular security updates and monitoring

**Key Success Factors:**
- Reliable internet connection at VM location
- Static IP or dynamic DNS
- Regular backups and monitoring
- Clear documentation for users
- Disaster recovery plan
