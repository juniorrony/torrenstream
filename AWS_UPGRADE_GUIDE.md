# 🚀 TorrentStream v2.0 AWS Linux Upgrade Guide

## Step-by-Step Migration from Old Docker Version

This guide covers upgrading an existing TorrentStream Docker installation on AWS Linux to the new v2.0 with authentication, admin dashboard, and multi-user support.

---

## 📋 Prerequisites

- AWS Linux instance with existing TorrentStream Docker setup
- Root or sudo access
- At least 2GB free disk space
- Internet connectivity

---

## 🔍 Phase 1: Assessment & Backup

### Step 1: Check Current Installation
```bash
# Connect to your AWS instance
ssh -i your-key.pem ec2-user@your-instance-ip

# Check current Docker containers
sudo docker ps
sudo docker-compose ps

# Check current data volumes
sudo docker volume ls
```

### Step 2: Create Complete Backup
```bash
# Create backup directory
sudo mkdir -p /backup/torrentstream-$(date +%Y%m%d)
cd /backup/torrentstream-$(date +%Y%m%d)

# Backup Docker data volumes
sudo docker run --rm -v torrentstream_data:/data -v $(pwd):/backup alpine tar czf /backup/data-backup.tar.gz /data

# Backup configuration files (if any)
sudo cp -r /home/ec2-user/torrentstream ./old-config 2>/dev/null || echo "No config directory found"

# Backup any custom environment files
sudo find /home/ec2-user -name "*.env*" -exec cp {} . \; 2>/dev/null || echo "No .env files found"

# Test backup integrity
tar -tzf data-backup.tar.gz | head -10

echo "✅ Backup created in $(pwd)"
```

### Step 3: Document Current Settings
```bash
# Save current container configuration
sudo docker inspect $(sudo docker ps -q) > container-config.json

# Save current port mappings
sudo docker ps --format "table {{.Names}}\t{{.Ports}}" > port-mappings.txt

# Note current URLs
echo "Current frontend URL: http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4):3000" > current-urls.txt
echo "Current API URL: http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4):5000" >> current-urls.txt

echo "✅ Current configuration documented"
```

---

## 🛑 Phase 2: Graceful Shutdown

### Step 4: Stop Current Services
```bash
# Navigate to current installation
cd /home/ec2-user/torrenstream 2>/dev/null || cd /home/ec2-user

# Gracefully stop services
sudo docker-compose down --timeout 30

# Verify all containers stopped
sudo docker ps

# Keep data volumes (DO NOT run docker-compose down -v)
echo "✅ Services stopped, data preserved"
```

---

## 📥 Phase 3: Download & Prepare v2.0

### Step 5: Download TorrentStream v2.0
```bash
# Create new installation directory
sudo mkdir -p /home/ec2-user/torrentstream-v2
cd /home/ec2-user/torrentstream-v2

# Clone the new version
sudo git clone https://github.com/juniorrony/torrenstream.git .

# Or download if you have the files locally
# sudo wget your-torrentstream-v2-archive.tar.gz
# sudo tar -xzf torrentstream-v2-archive.tar.gz
```

### Step 6: Configure Environment Variables
```bash
# Create production environment file
sudo tee .env.production << 'EOF'
# Database
NODE_ENV=production
DATABASE_PATH=/data/torrentstream.db

# Authentication & Security
JWT_SECRET=$(openssl rand -base64 32)
SESSION_SECRET=$(openssl rand -base64 32)
BCRYPT_ROUNDS=12

# Email Configuration (REQUIRED for production)
SMTP_HOST=smtp.rooters.store
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=support@rooters.store
SMTP_PASS=Software00x
FROM_EMAIL=noreply@rooters.store
FROM_NAME=TorrentStream

# Application URLs
CLIENT_URL=http://54.144.27.47:3000
SERVER_URL=http://54.144.27.47:5000

# File Storage
DOWNLOADS_PATH=/app/downloads
MAX_UPLOAD_SIZE=100MB
EOF

# Replace with your actual public IP
AWS_PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)
sudo sed -i "s/54.144.27.47/$AWS_PUBLIC_IP/g" .env.production

echo "✅ Environment configured"
```

### Step 7: Set Email Provider (Choose One)

#### Option A: SendGrid (Recommended)
```bash
# Update .env.production with SendGrid settings
sudo tee -a .env.production << 'EOF'

# SendGrid Configuration
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
FROM_EMAIL=noreply@yourdomain.com
FROM_NAME=TorrentStream
EOF
```

#### Option B: Gmail (For Testing)
```bash
# Update .env.production with Gmail settings
sudo tee -a .env.production << 'EOF'

# Gmail Configuration (App Password Required)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=true
SMTP_USER=your-gmail@gmail.com
SMTP_PASS=your-app-password
FROM_EMAIL=your-gmail@gmail.com
FROM_NAME=TorrentStream
EOF
```

#### Option C: Disable Email (Development Mode)
```bash
# For testing without email setup
sudo sed -i 's/NODE_ENV=production/NODE_ENV=development/' .env.production
echo "⚠️ Email verification disabled for development mode"
```

---

## 🔄 Phase 4: Data Migration

### Step 8: Migrate Database
```bash
# The new version will automatically migrate the database
# But let's ensure data volume is correctly mapped

# Check if old data volume exists
sudo docker volume inspect torrentstream_data

# If volume exists, data will be automatically migrated
# The new version adds owner_id column and RBAC tables
echo "✅ Database will be migrated on first startup"
```

### Step 9: Preserve Downloads (If Applicable)
```bash
# If you have a separate downloads volume
sudo docker volume inspect torrentstream_downloads

# The volume mapping in docker-compose.yml will handle this automatically
echo "✅ Downloads directory will be preserved"
```

---

## 🚀 Phase 5: Deploy v2.0

### Step 10: Start New Services
```bash
cd /home/ec2-user/torrentstream-v2

# Copy production environment to standard name
sudo cp .env.production .env

# Start services using Docker Compose
sudo docker-compose up -d

# Check startup logs
sudo docker-compose logs -f

# Wait for services to be healthy (press Ctrl+C after seeing "Server running")
```

### Step 11: Verify Database Migration
```bash
# Check if migration was successful
sudo docker-compose exec server node -e "
const Database = require('./database.js').default;
(async () => {
  const db = new Database();
  await db.init();
  
  // Check if new columns exist
  db.db.get('PRAGMA table_info(torrents)', (err, result) => {
    if (err) console.log('Error:', err);
    else console.log('✅ Database structure updated');
  });
  
  // Check if RBAC tables exist
  db.db.get('SELECT count(*) as count FROM sqlite_master WHERE type=\"table\" AND name=\"roles\"', (err, result) => {
    if (err) console.log('Error:', err);
    else console.log('✅ RBAC tables created');
  });
  
  await db.close();
})();
"
```

---

## 👨‍💼 Phase 6: Admin Setup

### Step 12: Create Admin User
```bash
# The admin user is automatically created on first startup
# Default credentials are:
# Username: admin
# Password: TorrentStream2024!
# Email: admin@torrentstream.local

# Or create a custom admin user
sudo docker-compose exec server node create-admin-user.js

# List all users to verify
sudo docker-compose exec server node create-admin-user.js list
```

### Step 13: Assign RBAC Permissions
```bash
# The admin user gets full permissions automatically
# Verify permissions are assigned correctly
sudo docker-compose exec server node -e "
const Database = require('./database.js').default;
const RBACManager = require('./rbac/rbacManager.js').default;
(async () => {
  const db = new Database();
  await db.init();
  const rbac = new RBACManager(db);
  await rbac.initialize();
  
  const admin = await new Promise((resolve) => {
    db.db.get('SELECT * FROM users WHERE username = ?', ['admin'], (err, row) => {
      resolve(row);
    });
  });
  
  if (admin) {
    const permissions = await rbac.getUserPermissions(admin.id);
    console.log('✅ Admin permissions:', permissions.length);
  }
  
  await db.close();
})();
"
```

---

## 🌐 Phase 7: Verification & Testing

### Step 14: Test Frontend Access
```bash
AWS_PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)

echo "🌐 Access URLs:"
echo "Frontend: http://$AWS_PUBLIC_IP:3000"
echo "API: http://$AWS_PUBLIC_IP:5000/api"
echo "Admin Dashboard: http://$AWS_PUBLIC_IP:3000/admin"
echo ""
echo "🔐 Default Admin Login:"
echo "Username: admin"
echo "Password: TorrentStream2024!"
```

### Step 15: Test Core Functionality
```bash
# Test API health
curl -s http://localhost:5000/api/health | jq .

# Test authentication endpoint
curl -s http://localhost:5000/api/auth/config | jq .

# Test admin stats (should require auth)
curl -s http://localhost:5000/api/admin/stats

echo "✅ API endpoints responding"
```

### Step 16: Test User Registration
```bash
# Test user registration endpoint
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "TestPassword123!",
    "confirmPassword": "TestPassword123!"
  }' | jq .

echo "✅ User registration working"
```

---

## 🔒 Phase 8: Security & Production Setup

### Step 17: Configure AWS Security Group
```bash
# Your security group should allow:
# - Port 22 (SSH)
# - Port 3000 (Frontend)
# - Port 5000 (API)
# - Port 443 (HTTPS - for future SSL)

# Check current security group
aws ec2 describe-security-groups --filters "Name=group-name,Values=your-security-group-name"
```

### Step 18: Update DNS (If Using Domain)
```bash
# If you have a domain, update DNS records:
# A Record: yourdomain.com -> YOUR_AWS_PUBLIC_IP
# CNAME: www.yourdomain.com -> yourdomain.com

# Update environment variables with domain
sudo sed -i "s|http://$AWS_PUBLIC_IP|https://torrentstream.duckdns.org|g" /home/ec2-user/torrentstream-v2/.env.production

# Restart services to apply new URLs
cd /home/ec2-user/torrentstream-v2
sudo docker-compose restart
```

### Step 19: Set Up SSL (Recommended)
```bash
# Install Certbot for Let's Encrypt
sudo amazon-linux-extras install epel
sudo yum install certbot python3-certbot-nginx

# Set up reverse proxy with Nginx (outside Docker)
sudo yum install nginx
sudo systemctl enable nginx
sudo systemctl start nginx

# Configure Nginx reverse proxy
sudo tee /etc/nginx/conf.d/torrentstream.conf << 'EOF'
server {
    listen 80;
    server_name torrentstream.duckdns.org www.torrentstream.duckdns.org;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

# Test and reload Nginx
sudo nginx -t
sudo systemctl reload nginx

# Get SSL certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

---

## 📊 Phase 9: Monitoring & Maintenance

### Step 20: Set Up Log Monitoring
```bash
# Set up log rotation for Docker
sudo tee /etc/docker/daemon.json << 'EOF'
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
EOF

sudo systemctl restart docker

# Create log monitoring script
sudo tee /home/ec2-user/torrentstream-v2/monitor-logs.sh << 'EOF'
#!/bin/bash
# Monitor TorrentStream logs for errors

cd /home/ec2-user/torrentstream-v2

echo "=== TorrentStream v2.0 Status ==="
docker-compose ps

echo -e "\n=== Recent Errors ==="
docker-compose logs --tail=50 | grep -i error | tail -10

echo -e "\n=== System Resources ==="
df -h | grep -E "Filesystem|/dev"
free -h
EOF

chmod +x /home/ec2-user/torrentstream-v2/monitor-logs.sh
```

### Step 21: Set Up Automated Backups
```bash
# Create backup script
sudo tee /home/ec2-user/backup-torrentstream.sh << 'EOF'
#!/bin/bash
# Automated TorrentStream v2.0 backup

BACKUP_DIR="/backup/torrentstream"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

echo "Starting backup at $(date)"

# Backup database
docker run --rm -v torrentstream_data:/data -v $BACKUP_DIR:/backup alpine tar czf /backup/database-$DATE.tar.gz /data

# Backup configuration
cp -r /home/ec2-user/torrentstream-v2/.env* $BACKUP_DIR/ 2>/dev/null

# Cleanup old backups (keep last 7 days)
find $BACKUP_DIR -name "database-*.tar.gz" -mtime +7 -delete

echo "Backup completed: $BACKUP_DIR/database-$DATE.tar.gz"
EOF

chmod +x /home/ec2-user/backup-torrentstream.sh

# Add to cron for daily backups
(crontab -l 2>/dev/null; echo "0 2 * * * /home/ec2-user/backup-torrentstream.sh >> /var/log/torrentstream-backup.log 2>&1") | crontab -
```

---

## ✅ Phase 10: Final Verification

### Step 22: Complete System Test
```bash
# Run comprehensive test
cd /home/ec2-user/torrentstream-v2

echo "🧪 Running comprehensive tests..."

# Test all endpoints
./monitor-logs.sh

# Test admin login
echo -e "\n🔐 Testing admin functionality..."
echo "Visit: http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4):3000/admin"
echo "Login: admin / TorrentStream2024!"

# Test user features
echo -e "\n👥 Testing user functionality..."
echo "Visit: http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4):3000"
echo "Try registering a new user account"

echo -e "\n✅ TorrentStream v2.0 upgrade complete!"
echo "🎉 Your platform now supports:"
echo "   - Multi-user authentication"
echo "   - Admin dashboard"
echo "   - Private torrent libraries"
echo "   - Role-based access control"
echo "   - Email verification"
echo "   - Production-ready security"
```

### Step 23: Update Documentation
```bash
# Save upgrade information
cat > /home/ec2-user/torrentstream-v2/UPGRADE_INFO.txt << EOF
TorrentStream v2.0 Upgrade Completed: $(date)
===========================================

Backup Location: /backup/torrentstream-$(date +%Y%m%d)
Configuration: /home/ec2-user/torrentstream-v2/.env.production

URLs:
- Frontend: http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4):3000
- API: http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4):5000
- Admin: http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4):3000/admin

Default Admin:
- Username: admin
- Password: TorrentStream2024!

Important Commands:
- View logs: cd /home/ec2-user/torrentstream-v2 && sudo docker-compose logs -f
- Restart services: sudo docker-compose restart
- Create admin: sudo docker-compose exec server node create-admin-user.js
- Backup: /home/ec2-user/backup-torrentstream.sh

Security Reminders:
- Change default admin password
- Configure proper email SMTP
- Set up SSL/HTTPS for production
- Regular database backups
EOF

echo "✅ Upgrade documentation saved"
```

---

## 🚨 Troubleshooting

### Common Issues & Solutions

#### Issue: Email verification not working
```bash
# Check SMTP settings
sudo docker-compose exec server node -e "console.log(process.env.SMTP_HOST)"

# Test email functionality
sudo docker-compose exec server node -e "
const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransporter({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});
transporter.verify().then(() => console.log('✅ SMTP working')).catch(console.error);
"

# Disable email for testing
sudo sed -i 's/NODE_ENV=production/NODE_ENV=development/' .env.production
sudo docker-compose restart
```

#### Issue: Database migration failed
```bash
# Manual database fix
sudo docker-compose exec server node -e "
const Database = require('./database.js').default;
(async () => {
  const db = new Database();
  await db.init();
  
  // Manually add owner_id column if missing
  try {
    await new Promise((resolve, reject) => {
      db.db.run('ALTER TABLE torrents ADD COLUMN owner_id INTEGER REFERENCES users (id) ON DELETE CASCADE', (err) => {
        if (err && !err.message.includes('duplicate column')) reject(err);
        else resolve();
      });
    });
    console.log('✅ Database fixed');
  } catch (error) {
    console.log('ℹ️ Column already exists or other error:', error.message);
  }
  
  await db.close();
})();
"
```

#### Issue: Admin user not working
```bash
# Recreate admin user
sudo docker-compose exec server node create-admin-user.js

# Force admin permissions
sudo docker-compose exec server node -e "
const Database = require('./database.js').default;
const RBACManager = require('./rbac/rbacManager.js').default;
(async () => {
  const db = new Database();
  await db.init();
  const rbac = new RBACManager(db);
  await rbac.initialize();
  
  const admin = await new Promise((resolve) => {
    db.db.get('SELECT * FROM users WHERE username = ?', ['admin'], (err, row) => {
      resolve(row);
    });
  });
  
  if (admin) {
    await rbac.assignRoleToUser(admin.id, 'admin', admin.id, null);
    console.log('✅ Admin permissions restored');
  }
  
  await db.close();
})();
"
```

#### Issue: Services not starting
```bash
# Check logs
sudo docker-compose logs

# Check disk space
df -h

# Check memory
free -h

# Restart services
sudo docker-compose down
sudo docker-compose up -d

# Check Docker daemon
sudo systemctl status docker
```

---

## 📞 Support

If you encounter issues during the upgrade:

1. **Check the logs**: `sudo docker-compose logs -f`
2. **Verify environment**: `cat .env.production`
3. **Test connectivity**: `curl -s http://localhost:5000/api/health`
4. **Database check**: Run the database verification commands above
5. **Backup restore**: If needed, restore from `/backup/torrentstream-YYYYMMDD/`

---

## 🎯 Success Checklist

- [ ] ✅ Old version backup completed
- [ ] ✅ v2.0 services running
- [ ] ✅ Database migrated successfully
- [ ] ✅ Admin user created and working
- [ ] ✅ Frontend accessible
- [ ] ✅ API endpoints responding
- [ ] ✅ User registration working
- [ ] ✅ Email configuration tested
- [ ] ✅ SSL/HTTPS configured (if applicable)
- [ ] ✅ Monitoring and backups set up
- [ ] ✅ Security group updated
- [ ] ✅ DNS updated (if using domain)

**🎉 Congratulations! Your TorrentStream v2.0 upgrade is complete!**

Your platform now supports multiple users, has a complete admin dashboard, 
role-based access control, and enterprise-level security features.