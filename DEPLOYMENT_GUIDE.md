# 🚀 TorrentStream Production Deployment Guide v2.0

## 🆕 Version 2.0 New Features
- **🔐 User Authentication System** - Registration, login, session management
- **👨‍💼 Admin Dashboard** - Complete user and system management
- **🏠 Private Torrent Libraries** - Users only see their own torrents
- **🛡️ Role-Based Access Control** - Granular permissions and roles
- **📧 Email Verification** - Account verification workflow (configurable)
- **🍪 Secure Authentication** - HTTP-only cookies, CSRF protection
- **👥 Multi-user Support** - Complete user isolation and privacy
- **📊 System Monitoring** - Real-time stats and health monitoring

## 📋 Table of Contents
- [Prerequisites & Environment Variables](#prerequisites--environment-variables)
- [Admin User Setup](#admin-user-setup)
- [Email Configuration](#email-configuration)
- [SSL/HTTPS Setup](#ssl-https-setup)
- [Database Management](#database-management)
- [Backup & Recovery Procedures](#backup--recovery-procedures)
- [Production Environment Setup](#production-environment-setup)
- [Security Best Practices](#security-best-practices)
- [Monitoring & Maintenance](#monitoring--maintenance)

---

## ⚙️ Prerequisites & Environment Variables

### Required Environment Variables

Create a `.env.production` file with the following essential variables:

```bash
# Database
NODE_ENV=production
DATABASE_PATH=/data/torrentstream.db

# Authentication & Security
JWT_SECRET=your-super-secure-jwt-secret-here-min-32-characters
SESSION_SECRET=your-session-secret-here-min-32-characters
BCRYPT_ROUNDS=12

# Email Configuration (Required for production)
SMTP_HOST=smtp.your-email-provider.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@domain.com
SMTP_PASS=your-email-password
FROM_EMAIL=noreply@yourdomain.com
FROM_NAME=TorrentStream

# Application URLs
CLIENT_URL=https://yourdomain.com
SERVER_URL=https://yourdomain.com

# File Storage
DOWNLOADS_PATH=/app/downloads
MAX_UPLOAD_SIZE=100MB
```

### Security Requirements
- **Strong JWT Secret**: Minimum 32 characters, use `openssl rand -base64 32`
- **HTTPS Required**: Production deployment requires SSL/TLS
- **Email Provider**: Configure SMTP for user verification
- **Database Backup**: Regular automated backups essential

---

## 👨‍💼 Admin User Setup

### Automatic Setup (Recommended)
The admin user is automatically created on first startup with default credentials:

```bash
Username: admin
Password: TorrentStream2024!
Email: admin@torrentstream.local
```

**⚠️ IMPORTANT**: Change the default password immediately after first login!

### Manual Admin Creation
```bash
# Create custom admin user
cd server
ADMIN_USERNAME=youradmin ADMIN_EMAIL=admin@yourdomain.com ADMIN_PASSWORD=YourSecurePassword123! node create-admin-user.js

# Reset admin password
node create-admin-user.js reset admin@yourdomain.com NewPassword123!

# List all users
node create-admin-user.js list
```

### Admin Capabilities
- **User Management**: Create, modify, suspend, delete users
- **System Monitoring**: View stats, health, performance metrics
- **RBAC Management**: Configure roles and permissions
- **Content Oversight**: View all user torrents (admin-only)
- **Export Functions**: Export user data and system logs

---

## 📧 Email Configuration

### Production Email Setup
Email is **required** for production to handle:
- User registration verification
- Password reset requests  
- Account notifications
- Admin alerts

### Recommended Email Providers
1. **SendGrid** (Recommended)
   ```bash
   SMTP_HOST=smtp.sendgrid.net
   SMTP_PORT=587
   SMTP_USER=apikey
   SMTP_PASS=your-sendgrid-api-key
   ```

2. **Mailgun**
   ```bash
   SMTP_HOST=smtp.mailgun.org
   SMTP_PORT=587
   SMTP_USER=your-username@mg.yourdomain.com
   SMTP_PASS=your-mailgun-password
   ```

3. **Custom SMTP**
   ```bash
   SMTP_HOST=mail.yourdomain.com
   SMTP_PORT=587
   SMTP_SECURE=true
   SMTP_USER=noreply@yourdomain.com
   SMTP_PASS=your-email-password
   ```

### Development vs Production
- **Development**: Email verification disabled by default
- **Production**: Email verification enforced for security

---

## 💾 Database Management

### SQLite Database Structure
TorrentStream uses SQLite with the following key tables:
- `users` - User accounts and profiles
- `torrents` - Torrent metadata with owner relationships
- `torrent_files` - Individual files within torrents
- `user_roles` - RBAC role assignments
- `roles` - Role definitions and permissions
- `watch_progress` - User viewing progress tracking

### Database Migrations
The database auto-migrates on startup:
- Adds `owner_id` column to torrents table
- Creates RBAC tables and default roles
- Sets up admin user and permissions

### Database Backup
```bash
# Manual backup
cp /data/torrentstream.db /backups/torrentstream-$(date +%Y%m%d).db

# Automated daily backup (add to cron)
0 2 * * * cp /data/torrentstream.db /backups/torrentstream-$(date +%Y%m%d).db
```

---

## 🔒 SSL/HTTPS Setup

### Option 1: Using Let's Encrypt (Recommended)

#### Prerequisites
- Domain name pointing to your server
- Ports 80 and 443 open
- Certbot installed

#### Step 1: Install Certbot
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install certbot python3-certbot-nginx

# CentOS/RHEL
sudo yum install certbot python3-certbot-nginx

# macOS
brew install certbot
```

#### Step 2: Obtain SSL Certificate
```bash
# Stop existing services
sudo systemctl stop nginx
docker-compose down

# Get certificate
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com

# Certificates will be saved to:
# /etc/letsencrypt/live/yourdomain.com/
```

#### Step 3: Configure Nginx with SSL
Create/update `nginx-ssl.conf`:
```nginx
events {
    worker_connections 1024;
}

http {
    upstream torrentstream_backend {
        server server:5000;
    }

    upstream torrentstream_frontend {
        server client:80;
    }

    # HTTP redirect to HTTPS
    server {
        listen 80;
        server_name yourdomain.com www.yourdomain.com;
        return 301 https://$server_name$request_uri;
    }

    # HTTPS configuration
    server {
        listen 443 ssl http2;
        server_name yourdomain.com www.yourdomain.com;

        # SSL Configuration
        ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384;
        ssl_prefer_server_ciphers off;
        ssl_session_cache shared:SSL:10m;
        ssl_session_timeout 10m;

        # Security Headers
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
        add_header X-Frame-Options DENY always;
        add_header X-Content-Type-Options nosniff always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header Referrer-Policy "strict-origin-when-cross-origin" always;

        # API routes
        location /api {
            proxy_pass http://torrentstream_backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
            proxy_read_timeout 86400;
        }

        # WebSocket support
        location /socket.io {
            proxy_pass http://torrentstream_backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Frontend
        location / {
            proxy_pass http://torrentstream_frontend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # File serving with range requests
        location /downloads {
            proxy_pass http://torrentstream_backend;
            proxy_set_header Range $http_range;
            proxy_set_header If-Range $http_if_range;
            proxy_cache_bypass $http_range;
        }
    }
}
```

#### Step 4: Update Docker Compose for SSL
Create `docker-compose.ssl.yml`:
```yaml
version: '3.8'

services:
  server:
    build:
      context: ./server
      dockerfile: Dockerfile
    ports:
      - "5000:5000"
    volumes:
      - ./downloads:/app/downloads
      - ./data:/app/data
      - ./logs:/app/logs
    environment:
      - NODE_ENV=production
      - PORT=5000
      - HTTPS_ENABLED=false  # Let nginx handle SSL
    restart: unless-stopped
    networks:
      - torrentstream

  client:
    build:
      context: ./client
      dockerfile: Dockerfile
    environment:
      - REACT_APP_API_URL=https://yourdomain.com
    restart: unless-stopped
    networks:
      - torrentstream

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx-ssl.conf:/etc/nginx/nginx.conf:ro
      - /etc/letsencrypt:/etc/letsencrypt:ro
    depends_on:
      - client
      - server
    restart: unless-stopped
    networks:
      - torrentstream

networks:
  torrentstream:
    driver: bridge

volumes:
  downloads:
  data:
  logs:
```

#### Step 5: Auto-renewal Setup
```bash
# Add to crontab
sudo crontab -e

# Add this line for auto-renewal
0 12 * * * /usr/bin/certbot renew --quiet && docker-compose restart nginx
```

### Option 2: Self-Signed Certificate (Development/Testing)

```bash
# Create SSL directory
mkdir -p ssl

# Generate private key
openssl genrsa -out ssl/key.pem 2048

# Generate certificate
openssl req -new -x509 -key ssl/key.pem -out ssl/cert.pem -days 365

# Update .env
echo "HTTPS_ENABLED=true" >> .env
echo "SSL_CERT_PATH=./ssl/cert.pem" >> .env
echo "SSL_KEY_PATH=./ssl/key.pem" >> .env
```

---

## 💾 Backup & Recovery Procedures

### Automated Backup Script

Create `scripts/backup.sh`:
```bash
#!/bin/bash

# TorrentStream Backup Script
# Run this script daily via cron

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="./backups"
DATA_DIR="./data"
DOWNLOADS_DIR="./downloads"
CONFIG_FILES=".env docker-compose.yml"

# Create backup directory
mkdir -p "$BACKUP_DIR"

echo "🔄 Starting backup at $(date)"

# 1. Backup Database
echo "📊 Backing up database..."
if [ -f "$DATA_DIR/torrents.db" ]; then
    cp "$DATA_DIR/torrents.db" "$BACKUP_DIR/torrents_$DATE.db"
    echo "✅ Database backup created: torrents_$DATE.db"
else
    echo "⚠️  Database not found!"
fi

# 2. Backup Configuration
echo "⚙️  Backing up configuration..."
tar -czf "$BACKUP_DIR/config_$DATE.tar.gz" $CONFIG_FILES
echo "✅ Configuration backup created: config_$DATE.tar.gz"

# 3. Backup Download Metadata (not actual files - too large)
echo "📁 Backing up download metadata..."
find "$DOWNLOADS_DIR" -name "*.json" -o -name "*.metadata" | tar -czf "$BACKUP_DIR/metadata_$DATE.tar.gz" -T -
echo "✅ Metadata backup created: metadata_$DATE.tar.gz"

# 4. Create comprehensive backup manifest
echo "📋 Creating backup manifest..."
cat > "$BACKUP_DIR/manifest_$DATE.txt" << EOF
TorrentStream Backup Manifest
Created: $(date)
Version: $(git rev-parse HEAD 2>/dev/null || echo "unknown")

Files included:
- Database: torrents_$DATE.db
- Configuration: config_$DATE.tar.gz
- Metadata: metadata_$DATE.tar.gz

Restore Instructions:
1. Stop TorrentStream: docker-compose down
2. Restore database: cp torrents_$DATE.db ./data/torrents.db
3. Restore config: tar -xzf config_$DATE.tar.gz
4. Restart: docker-compose up -d

System Info:
$(uname -a)
Docker Version: $(docker --version)
Disk Usage: $(df -h .)
EOF

# 5. Cleanup old backups (keep last 7 days)
echo "🧹 Cleaning up old backups..."
find "$BACKUP_DIR" -name "*_*.db" -mtime +7 -delete
find "$BACKUP_DIR" -name "*_*.tar.gz" -mtime +7 -delete
find "$BACKUP_DIR" -name "*_*.txt" -mtime +7 -delete

echo "✅ Backup completed successfully at $(date)"
echo "📍 Backup location: $BACKUP_DIR"
echo "📊 Backup size: $(du -sh $BACKUP_DIR)"
```

### Recovery Procedures

#### Quick Recovery (Same System)
```bash
# 1. Stop TorrentStream
docker-compose down

# 2. Restore from latest backup
LATEST_BACKUP=$(ls -t ./backups/torrents_*.db | head -n1)
cp "$LATEST_BACKUP" ./data/torrents.db

# 3. Restore configuration if needed
LATEST_CONFIG=$(ls -t ./backups/config_*.tar.gz | head -n1)
tar -xzf "$LATEST_CONFIG"

# 4. Restart services
docker-compose up -d

echo "✅ Recovery completed!"
```

#### Full System Recovery (New System)
```bash
# 1. Install Docker and Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
sudo systemctl enable docker
sudo systemctl start docker

# 2. Clone/copy TorrentStream code
git clone <your-repo> torrentstream
cd torrentstream

# 3. Restore backup files
# Copy your backup files to ./backups/

# 4. Restore database
cp ./backups/torrents_YYYYMMDD_HHMMSS.db ./data/torrents.db

# 5. Restore configuration
tar -xzf ./backups/config_YYYYMMDD_HHMMSS.tar.gz

# 6. Setup directories
mkdir -p downloads data logs

# 7. Start services
docker-compose up -d
```

### Backup Automation Setup
```bash
# Make backup script executable
chmod +x scripts/backup.sh

# Add to crontab for daily backups at 2 AM
crontab -e
# Add: 0 2 * * * cd /path/to/torrentstream && ./scripts/backup.sh >> ./logs/backup.log 2>&1

# For immediate backup
./scripts/backup.sh
```

### Cloud Backup Integration

#### AWS S3 Backup
```bash
# Install AWS CLI
sudo apt install awscli

# Configure AWS credentials
aws configure

# Sync backups to S3
aws s3 sync ./backups s3://your-bucket-name/torrentstream-backups/
```

#### Google Drive Backup (using rclone)
```bash
# Install rclone
curl https://rclone.org/install.sh | sudo bash

# Configure Google Drive
rclone config

# Sync to Google Drive
rclone sync ./backups gdrive:TorrentStream-Backups/
```

---

## 🏭 Production Environment Setup

### System Requirements
- **CPU**: 2+ cores recommended
- **RAM**: 4GB minimum, 8GB+ recommended
- **Storage**: 100GB+ for downloads
- **Network**: Stable connection, no P2P blocking
- **OS**: Ubuntu 20.04+, CentOS 8+, or Docker-compatible system

### Pre-deployment Checklist

#### 1. System Preparation
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install required packages
sudo apt install -y curl git htop iotop fail2ban ufw

# Configure firewall
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# Set up monitoring user (optional)
sudo adduser torrentstream
sudo usermod -aG docker torrentstream
```

#### 2. Docker Installation
```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
sudo systemctl enable docker
sudo systemctl start docker

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.15.1/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

#### 3. Application Setup
```bash
# Clone repository
git clone <your-repo> /opt/torrentstream
cd /opt/torrentstream

# Copy environment configuration
cp .env.example .env
# Edit .env with your production values

# Create necessary directories
mkdir -p downloads data logs backups ssl

# Set proper permissions
sudo chown -R 1000:1000 downloads data logs backups
chmod 755 downloads data logs backups
```

#### 4. Security Hardening
```bash
# Configure fail2ban
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local
sudo systemctl enable fail2ban
sudo systemctl start fail2ban

# Set up log rotation
sudo tee /etc/logrotate.d/torrentstream << EOF
/opt/torrentstream/logs/*.log {
    daily
    missingok
    rotate 14
    compress
    notifempty
    create 644 torrentstream torrentstream
    postrotate
        docker-compose restart server 2>/dev/null || true
    endscript
}
EOF
```

#### 5. Production Deployment
```bash
# Build and start services
docker-compose -f docker-compose.yml up -d

# Verify deployment
docker-compose ps
docker-compose logs -f

# Test health endpoint
curl http://localhost:5000/api/health
```

#### 6. Monitoring Setup
```bash
# Install monitoring tools
sudo apt install -y htop iotop netstat-nat

# Set up health monitoring script
cat > scripts/health-check.sh << 'EOF'
#!/bin/bash
HEALTH_URL="http://localhost:5000/api/health"
if ! curl -f -s $HEALTH_URL > /dev/null; then
    echo "$(date): Health check failed, restarting services"
    docker-compose restart
    # Optional: send notification (email, Slack, etc.)
fi
EOF

chmod +x scripts/health-check.sh

# Add to crontab (check every 5 minutes)
echo "*/5 * * * * cd /opt/torrentstream && ./scripts/health-check.sh >> ./logs/health.log 2>&1" | crontab -
```

---

## 🔐 Security Best Practices

### 1. Network Security
- Use HTTPS only in production
- Configure firewall (UFW/iptables)
- Set up VPN if accessing from public networks
- Use strong passwords and SSH keys

### 2. Application Security
- Regular security updates
- Monitor logs for suspicious activity
- Implement rate limiting
- Use environment variables for secrets

### 3. Data Protection
- Regular automated backups
- Encrypt sensitive data
- Secure file permissions
- Monitor disk usage

### 4. Access Control
- Limit SSH access
- Use non-root containers
- Implement API authentication (future feature)
- Regular security audits

---

## 📊 Monitoring & Maintenance

### Daily Tasks (Automated)
- ✅ Health checks every 5 minutes
- ✅ Log rotation
- ✅ Backup creation

### Weekly Tasks
- [ ] Review logs for errors
- [ ] Check disk usage
- [ ] Verify backups
- [ ] Update security patches

### Monthly Tasks
- [ ] Full system backup
- [ ] Performance review
- [ ] Security audit
- [ ] Dependency updates

### Emergency Procedures

#### Service Down
```bash
# Check service status
docker-compose ps

# View recent logs
docker-compose logs --tail=100

# Restart specific service
docker-compose restart server

# Full restart
docker-compose down && docker-compose up -d
```

#### Disk Full
```bash
# Check disk usage
df -h

# Clean up old downloads
find ./downloads -type f -mtime +30 -delete

# Clean Docker images
docker system prune -af
```

#### Performance Issues
```bash
# Monitor resources
htop
iotop
docker stats

# Check active torrents
curl http://localhost:5000/api/torrents

# Restart if needed
docker-compose restart
```

---

## 🆘 Troubleshooting

### Common Issues

1. **Port Already in Use**
   ```bash
   sudo netstat -tulpn | grep :5000
   sudo kill -9 <PID>
   ```

2. **Permission Denied**
   ```bash
   sudo chown -R 1000:1000 downloads data
   ```

3. **SSL Certificate Issues**
   ```bash
   sudo certbot renew --dry-run
   ```

4. **Database Locked**
   ```bash
   docker-compose restart server
   ```

### Support Resources
- [Docker Documentation](https://docs.docker.com/)
- [Let's Encrypt](https://letsencrypt.org/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [Project Issues](https://github.com/your-repo/issues)

---

## 🎯 Next Steps

After successful deployment:
1. Set up monitoring and alerting
2. Configure automated backups
3. Plan for scaling (load balancers, multiple instances)
4. Implement user authentication (future feature)
5. Set up CI/CD pipeline for updates

---

**📞 Need Help?**
If you encounter issues during deployment, please check the troubleshooting section or create an issue in the project repository.