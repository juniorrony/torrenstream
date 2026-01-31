#!/bin/bash

# Production Deployment Script for TorrentStream
# Usage: ./scripts/deploy.sh [production|staging]

set -e  # Exit on any error

ENVIRONMENT=${1:-production}
BUILD_DIR="build"
APP_NAME="torrentstream"

echo "🚀 Starting deployment for $ENVIRONMENT environment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed"
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        log_error "npm is not installed"
        exit 1
    fi
    
    if ! command -v ffmpeg &> /dev/null; then
        log_warning "FFmpeg not found - video transcoding will not work"
    fi
    
    log_success "Prerequisites check complete"
}

# Install dependencies
install_dependencies() {
    log_info "Installing server dependencies..."
    cd server
    npm ci --production
    cd ..
    
    log_info "Installing client dependencies..."
    cd client
    npm ci
    cd ..
    
    log_success "Dependencies installed"
}

# Build client for production
build_client() {
    log_info "Building client for production..."
    cd client
    
    # Create production build
    npm run build
    
    # Copy build files to server public directory
    rm -rf ../server/public
    mkdir -p ../server/public
    cp -r dist/* ../server/public/
    
    cd ..
    log_success "Client build complete"
}

# Setup directories and permissions
setup_directories() {
    log_info "Setting up directories..."
    
    # Create necessary directories
    mkdir -p logs
    mkdir -p data
    mkdir -p uploads
    mkdir -p temp
    
    # Set permissions (adjust as needed for your system)
    chmod 755 logs data uploads temp
    
    log_success "Directories setup complete"
}

# Database setup
setup_database() {
    log_info "Setting up database..."
    
    # Copy production environment
    if [ -f ".env.production" ]; then
        cp .env.production server/.env
        log_success "Production environment variables copied"
    else
        log_warning "No .env.production file found"
    fi
    
    # Database will be initialized automatically when server starts
    log_success "Database setup complete"
}

# Security setup
setup_security() {
    log_info "Setting up security configurations..."
    
    # Generate session secret if not exists
    if ! grep -q "SESSION_SECRET=" server/.env 2>/dev/null; then
        SESSION_SECRET=$(openssl rand -base64 32)
        echo "SESSION_SECRET=$SESSION_SECRET" >> server/.env
        log_success "Generated session secret"
    fi
    
    # Set file permissions
    chmod 600 server/.env 2>/dev/null || true
    
    log_success "Security setup complete"
}

# Health check
health_check() {
    log_info "Performing health check..."
    
    # Start server temporarily for health check
    cd server
    timeout 30s npm start &
    SERVER_PID=$!
    
    sleep 5
    
    # Check if server is responding
    if curl -f http://localhost:5000/api/health > /dev/null 2>&1; then
        log_success "Health check passed"
    else
        log_error "Health check failed"
        kill $SERVER_PID 2>/dev/null || true
        exit 1
    fi
    
    kill $SERVER_PID 2>/dev/null || true
    cd ..
}

# Main deployment process
main() {
    log_info "🎬 Deploying TorrentStream to $ENVIRONMENT"
    
    check_prerequisites
    install_dependencies
    build_client
    setup_directories
    setup_database
    setup_security
    
    log_success "✅ Deployment completed successfully!"
    log_info "📋 Next steps:"
    echo "   1. Start the application: pm2 start ecosystem.config.js --env $ENVIRONMENT"
    echo "   2. Setup nginx reverse proxy (see nginx configuration)"
    echo "   3. Configure SSL certificate"
    echo "   4. Set up monitoring"
    
    if [ "$ENVIRONMENT" = "production" ]; then
        echo ""
        log_warning "🔒 Security recommendations:"
        echo "   - Change default SESSION_SECRET in .env"
        echo "   - Configure firewall to only allow necessary ports"
        echo "   - Set up regular backups"
        echo "   - Configure log rotation"
        echo "   - Enable fail2ban for SSH protection"
    fi
}

# Run deployment
main