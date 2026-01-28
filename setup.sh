#!/bin/bash

# TorrentStream Setup Script
# This script sets up the complete torrent streaming platform

echo "🧲 TorrentStream Setup"
echo "===================="

# Check if Docker is installed
if command -v docker &> /dev/null; then
    echo "✅ Docker found"
    DOCKER_AVAILABLE=true
else
    echo "❌ Docker not found"
    DOCKER_AVAILABLE=false
fi

# Check if Node.js is installed
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    echo "✅ Node.js found: $NODE_VERSION"
    NODE_AVAILABLE=true
else
    echo "❌ Node.js not found"
    NODE_AVAILABLE=false
fi

echo ""
echo "Setup Options:"
echo "1. Docker Setup (Recommended)"
echo "2. Manual Setup"
echo "3. Development Setup"
read -p "Choose setup type (1-3): " choice

case $choice in
    1)
        if [ "$DOCKER_AVAILABLE" = true ]; then
            echo ""
            echo "🐳 Starting Docker setup..."
            
            # Create necessary directories
            mkdir -p downloads data
            
            # Set proper permissions
            chmod 755 downloads data
            
            # Start services
            docker-compose up -d
            
            echo ""
            echo "✅ Docker setup complete!"
            echo "🌐 Access the application at: http://localhost:3000"
            echo "📊 API available at: http://localhost:5000/api"
            echo ""
            echo "View logs: docker-compose logs -f"
            echo "Stop services: docker-compose down"
        else
            echo "❌ Docker is required for this setup option"
            exit 1
        fi
        ;;
    2)
        if [ "$NODE_AVAILABLE" = true ]; then
            echo ""
            echo "🔧 Starting manual setup..."
            
            # Create directories
            mkdir -p downloads data
            
            # Install dependencies
            echo "Installing dependencies..."
            npm run install-all
            
            echo ""
            echo "✅ Manual setup complete!"
            echo "Start the application:"
            echo "1. npm run server    (in one terminal)"
            echo "2. npm run client    (in another terminal)"
            echo "3. Open http://localhost:3000"
        else
            echo "❌ Node.js 18+ is required for manual setup"
            exit 1
        fi
        ;;
    3)
        if [ "$NODE_AVAILABLE" = true ]; then
            echo ""
            echo "🛠️  Starting development setup..."
            
            # Create directories
            mkdir -p downloads data
            
            # Install dependencies
            echo "Installing dependencies..."
            npm run install-all
            
            echo ""
            echo "✅ Development setup complete!"
            echo "Start development servers: npm run dev"
            echo "🌐 Frontend: http://localhost:3000"
            echo "📊 Backend: http://localhost:5000"
        else
            echo "❌ Node.js 18+ is required for development setup"
            exit 1
        fi
        ;;
    *)
        echo "❌ Invalid choice"
        exit 1
        ;;
esac