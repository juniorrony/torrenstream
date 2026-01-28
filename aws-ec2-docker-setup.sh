#!/bin/bash

# AWS EC2 Docker Installation Script
# This script works for Amazon Linux 2, Ubuntu, and CentOS

echo "🚀 AWS EC2 Docker Setup for TorrentStream"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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

# Check if running as root or with sudo
if [ "$EUID" -eq 0 ]; then
    SUDO=""
else
    SUDO="sudo"
fi

# Detect OS
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$ID
    VERSION=$VERSION_ID
else
    print_error "Cannot detect OS. This script supports Amazon Linux 2, Ubuntu, and CentOS."
    exit 1
fi

print_info "Detected OS: $OS $VERSION"

# Update system packages
print_info "Updating system packages..."
case $OS in
    "amzn")
        $SUDO yum update -y
        ;;
    "ubuntu")
        $SUDO apt-get update -y
        $SUDO apt-get upgrade -y
        ;;
    "centos" | "rhel")
        $SUDO yum update -y
        ;;
    *)
        print_warning "Unknown OS: $OS. Attempting generic installation..."
        ;;
esac

print_status "System packages updated"

# Install Docker based on OS
print_info "Installing Docker..."

case $OS in
    "amzn")
        # Amazon Linux 2
        $SUDO amazon-linux-extras install docker -y
        ;;
    "ubuntu")
        # Ubuntu
        $SUDO apt-get install -y apt-transport-https ca-certificates curl software-properties-common
        curl -fsSL https://download.docker.com/linux/ubuntu/gpg | $SUDO apt-key add -
        $SUDO add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable"
        $SUDO apt-get update -y
        $SUDO apt-get install -y docker-ce docker-ce-cli containerd.io
        ;;
    "centos" | "rhel")
        # CentOS/RHEL
        $SUDO yum install -y yum-utils
        $SUDO yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
        $SUDO yum install -y docker-ce docker-ce-cli containerd.io
        ;;
esac

print_status "Docker installed"

# Start and enable Docker service
print_info "Starting Docker service..."
$SUDO systemctl start docker
$SUDO systemctl enable docker

print_status "Docker service started and enabled"

# Add current user to docker group
print_info "Adding user to docker group..."
$SUDO usermod -aG docker $USER

print_status "User added to docker group"

# Install Docker Compose
print_info "Installing Docker Compose..."

# Get latest version
COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep -Po '"tag_name": "\K.*?(?=")')
if [ -z "$COMPOSE_VERSION" ]; then
    COMPOSE_VERSION="v2.24.1"  # Fallback version
fi

print_info "Installing Docker Compose version: $COMPOSE_VERSION"

$SUDO curl -L "https://github.com/docker/compose/releases/download/$COMPOSE_VERSION/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
$SUDO chmod +x /usr/local/bin/docker-compose

# Create symlink for easier access
$SUDO ln -sf /usr/local/bin/docker-compose /usr/bin/docker-compose

print_status "Docker Compose installed"

# Install git if not present
if ! command -v git &> /dev/null; then
    print_info "Installing Git..."
    case $OS in
        "amzn" | "centos" | "rhel")
            $SUDO yum install -y git
            ;;
        "ubuntu")
            $SUDO apt-get install -y git
            ;;
    esac
    print_status "Git installed"
fi

# Configure firewall (if ufw is available)
if command -v ufw &> /dev/null; then
    print_info "Configuring UFW firewall..."
    $SUDO ufw allow ssh
    $SUDO ufw allow 80/tcp
    $SUDO ufw allow 443/tcp
    $SUDO ufw allow 5000/tcp
    $SUDO ufw --force enable
    print_status "Firewall configured"
fi

# Verify installations
print_info "Verifying installations..."

docker --version
if [ $? -eq 0 ]; then
    print_status "Docker verification successful"
else
    print_error "Docker verification failed"
fi

docker-compose --version
if [ $? -eq 0 ]; then
    print_status "Docker Compose verification successful"
else
    print_error "Docker Compose verification failed"
fi

# Test Docker (may require re-login for group membership)
print_info "Testing Docker access..."
if docker ps &>/dev/null; then
    print_status "Docker is working correctly"
else
    print_warning "Docker requires logout/login or run: newgrp docker"
fi

# Security group reminder
echo
print_info "AWS Security Group Configuration:"
echo "Make sure your EC2 Security Group allows:"
echo "• Port 22 (SSH) - for your IP"
echo "• Port 80 (HTTP) - for web access"
echo "• Port 443 (HTTPS) - for secure web access"
echo "• Port 5000 (API) - for development (optional)"
echo

print_status "Docker and Docker Compose installation completed!"
echo
echo "🚀 Next steps:"
echo "1. Logout and login again (or run: newgrp docker)"
echo "2. Clone your TorrentStream repository"
echo "3. Run: docker-compose -f docker-compose.yml up -d"
echo
print_warning "If you get permission denied errors, logout and login again to refresh group membership"