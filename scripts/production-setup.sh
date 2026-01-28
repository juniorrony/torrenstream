#!/bin/bash

# TorrentStream Production Setup Script
# This script prepares the environment for production deployment

set -e

echo "🚀 TorrentStream Production Setup Starting..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    print_error "Please don't run this script as root"
    exit 1
fi

# Check for required commands
check_command() {
    if ! command -v $1 &> /dev/null; then
        print_error "$1 is required but not installed"
        exit 1
    fi
    print_status "$1 is available"
}

print_info "Checking required dependencies..."
check_command "docker"
check_command "docker-compose"
check_command "git"
check_command "curl"

# Create necessary directories
print_info "Creating directory structure..."
mkdir -p downloads data logs backups ssl monitoring scripts

# Set proper permissions
chmod 755 downloads data logs backups
chmod 700 ssl

print_status "Directory structure created"

# Copy environment configuration if it doesn't exist
if [ ! -f ".env" ]; then
    print_info "Creating .env file from template..."
    cp .env.example .env
    print_warning "Please edit .env file with your production settings"
else
    print_info ".env file already exists"
fi

# Create monitoring configuration
print_info "Setting up monitoring configuration..."
mkdir -p monitoring

cat > monitoring/prometheus.yml << 'EOF'
global:
  scrape_interval: 15s
  external_labels:
    monitor: 'torrentstream'

scrape_configs:
  - job_name: 'torrentstream-server'
    static_configs:
      - targets: ['server:5000']
    metrics_path: '/metrics'
    scrape_interval: 30s

  - job_name: 'nginx'
    static_configs:
      - targets: ['nginx:80']
    scrape_interval: 30s

  - job_name: 'node-exporter'
    static_configs:
      - targets: ['node-exporter:9100']
    scrape_interval: 30s
EOF

print_status "Monitoring configuration created"

# Create backup script
print_info "Setting up backup automation..."
cat > scripts/backup.sh << 'EOF'
#!/bin/bash

# TorrentStream Backup Script
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="./backups"
DATA_DIR="./data"
CONFIG_FILES=".env docker-compose.production.yml nginx.production.conf"

mkdir -p "$BACKUP_DIR"

echo "🔄 Starting backup at $(date)"

# Backup Database
if [ -f "$DATA_DIR/torrents.db" ]; then
    cp "$DATA_DIR/torrents.db" "$BACKUP_DIR/torrents_$DATE.db"
    echo "✅ Database backup created"
fi

# Backup Configuration
tar -czf "$BACKUP_DIR/config_$DATE.tar.gz" $CONFIG_FILES 2>/dev/null || true
echo "✅ Configuration backup created"

# Cleanup old backups (keep last 7 days)
find "$BACKUP_DIR" -name "*_*.db" -mtime +7 -delete 2>/dev/null || true
find "$BACKUP_DIR" -name "*_*.tar.gz" -mtime +7 -delete 2>/dev/null || true

echo "✅ Backup completed at $(date)"
EOF

chmod +x scripts/backup.sh
print_status "Backup script created"

# Create health check script
print_info "Setting up health monitoring..."
cat > scripts/health-check.sh << 'EOF'
#!/bin/bash

HEALTH_URL="http://localhost:5000/api/health"
LOG_FILE="./logs/health.log"

if ! curl -f -s $HEALTH_URL > /dev/null; then
    echo "$(date): Health check failed, restarting services" >> $LOG_FILE
    docker-compose -f docker-compose.production.yml restart server
    
    # Wait and check again
    sleep 30
    if ! curl -f -s $HEALTH_URL > /dev/null; then
        echo "$(date): Health check still failing after restart" >> $LOG_FILE
        # Add notification logic here (email, Slack, etc.)
    fi
else
    echo "$(date): Health check passed" >> $LOG_FILE
fi
EOF

chmod +x scripts/health-check.sh
print_status "Health check script created"

# Create log rotation configuration
print_info "Setting up log rotation..."
sudo tee /etc/logrotate.d/torrentstream > /dev/null << EOF
$(pwd)/logs/*.log {
    daily
    missingok
    rotate 14
    compress
    notifempty
    create 644 $(whoami) $(whoami)
    postrotate
        docker-compose -f $(pwd)/docker-compose.production.yml restart server nginx 2>/dev/null || true
    endscript
}
EOF

print_status "Log rotation configured"

# Set up systemd service (optional)
read -p "Do you want to create a systemd service for TorrentStream? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_info "Creating systemd service..."
    
    sudo tee /etc/systemd/system/torrentstream.service > /dev/null << EOF
[Unit]
Description=TorrentStream Application
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=$(pwd)
ExecStart=/usr/local/bin/docker-compose -f docker-compose.production.yml up -d
ExecStop=/usr/local/bin/docker-compose -f docker-compose.production.yml down
TimeoutStartSec=0
User=$(whoami)
Group=$(whoami)

[Install]
WantedBy=multi-user.target
EOF

    sudo systemctl daemon-reload
    sudo systemctl enable torrentstream.service
    print_status "Systemd service created and enabled"
fi

# Set up cron jobs
print_info "Setting up automated tasks..."
(crontab -l 2>/dev/null; echo "0 2 * * * cd $(pwd) && ./scripts/backup.sh >> ./logs/backup.log 2>&1") | crontab -
(crontab -l 2>/dev/null; echo "*/5 * * * * cd $(pwd) && ./scripts/health-check.sh") | crontab -

print_status "Cron jobs configured (backup at 2 AM, health check every 5 minutes)"

# Firewall setup
print_info "Checking firewall configuration..."
if command -v ufw &> /dev/null; then
    if ufw status | grep -q "Status: active"; then
        print_info "UFW is active, checking rules..."
        if ! ufw status | grep -q "80/tcp"; then
            print_warning "Port 80 not open, you may need to run: sudo ufw allow 80/tcp"
        fi
        if ! ufw status | grep -q "443/tcp"; then
            print_warning "Port 443 not open, you may need to run: sudo ufw allow 443/tcp"
        fi
    else
        print_warning "UFW is not active. Consider enabling it for security."
    fi
else
    print_warning "UFW not found. Consider installing and configuring a firewall."
fi

# Docker optimization
print_info "Optimizing Docker configuration..."
if [ ! -f "/etc/docker/daemon.json" ]; then
    sudo tee /etc/docker/daemon.json > /dev/null << 'EOF'
{
    "log-driver": "json-file",
    "log-opts": {
        "max-size": "10m",
        "max-file": "3"
    },
    "storage-driver": "overlay2"
}
EOF
    print_status "Docker daemon configuration optimized"
    print_warning "Please restart Docker daemon: sudo systemctl restart docker"
fi

# Performance tuning
print_info "Applying system optimizations..."
cat >> /tmp/sysctl_torrentstream.conf << 'EOF'
# TorrentStream optimizations
net.core.rmem_max = 16777216
net.core.wmem_max = 16777216
net.ipv4.tcp_rmem = 4096 87380 16777216
net.ipv4.tcp_wmem = 4096 65536 16777216
net.core.netdev_max_backlog = 5000
net.ipv4.tcp_congestion_control = bbr
EOF

sudo mv /tmp/sysctl_torrentstream.conf /etc/sysctl.d/99-torrentstream.conf
sudo sysctl -p /etc/sysctl.d/99-torrentstream.conf

print_status "System optimizations applied"

# Final checks
print_info "Running final checks..."

# Check Docker Compose file
if docker-compose -f docker-compose.production.yml config > /dev/null 2>&1; then
    print_status "Docker Compose configuration is valid"
else
    print_error "Docker Compose configuration has errors"
    exit 1
fi

# Check available disk space
AVAILABLE_SPACE=$(df . | awk 'NR==2 {print $4}')
if [ $AVAILABLE_SPACE -lt 10485760 ]; then  # 10GB in KB
    print_warning "Less than 10GB disk space available. Consider freeing up space."
else
    print_status "Sufficient disk space available"
fi

print_info "Setup completed! 🎉"
echo
echo "Next steps:"
echo "1. Edit .env file with your production settings"
echo "2. Run: docker-compose -f docker-compose.production.yml up -d"
echo "3. Check logs: docker-compose -f docker-compose.production.yml logs -f"
echo "4. Test health: curl http://localhost:5000/api/health"
echo "5. Visit: http://localhost"
echo
echo "Optional:"
echo "- Set up SSL certificates (see DEPLOYMENT_GUIDE.md)"
echo "- Configure domain name and DNS"
echo "- Set up external monitoring"
echo
print_status "Production setup completed successfully!"
EOF