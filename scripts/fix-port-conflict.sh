#!/bin/bash

# Script to fix port 80 conflict for Docker nginx setup
# This will stop any conflicting services and start your Docker stack

echo "🔍 Checking what's using port 80..."

# Find what's using port 80
PORT_80_PROCESS=$(sudo lsof -i :80 2>/dev/null | grep LISTEN)
if [ -n "$PORT_80_PROCESS" ]; then
    echo "Found process using port 80:"
    echo "$PORT_80_PROCESS"
    
    # Check if it's nginx
    if echo "$PORT_80_PROCESS" | grep -q nginx; then
        echo "🛑 Stopping system nginx service..."
        sudo systemctl stop nginx
        sudo systemctl disable nginx  # Prevent auto-start
        echo "✅ System nginx stopped"
    fi
    
    # Check if it's Apache
    if echo "$PORT_80_PROCESS" | grep -q apache; then
        echo "🛑 Stopping Apache service..."
        sudo systemctl stop apache2 2>/dev/null || sudo systemctl stop httpd 2>/dev/null
        echo "✅ Apache stopped"
    fi
    
    # Check for other Docker containers
    if echo "$PORT_80_PROCESS" | grep -q docker; then
        echo "⚠️  Another Docker container is using port 80"
        echo "🔍 Checking running containers..."
        docker ps --format "table {{.Names}}\t{{.Ports}}" | grep ":80"
        echo ""
        echo "Consider stopping conflicting containers with:"
        echo "  docker stop <container_name>"
    fi
else
    echo "✅ Port 80 is available"
fi

echo ""
echo "🔍 Checking what's using port 443..."
PORT_443_PROCESS=$(sudo lsof -i :443 2>/dev/null | grep LISTEN)
if [ -n "$PORT_443_PROCESS" ]; then
    echo "Found process using port 443:"
    echo "$PORT_443_PROCESS"
else
    echo "✅ Port 443 is available"
fi

echo ""
echo "🚀 Starting Docker stack..."

# Start the Docker stack
docker-compose down 2>/dev/null  # Stop any existing stack
docker-compose up -d

echo ""
echo "📊 Docker container status:"
docker-compose ps

echo ""
echo "🌐 Your application should now be available at:"
echo "  HTTP:  http://localhost"
echo "  HTTPS: https://localhost (if SSL configured)"
echo ""
echo "📝 Logs can be viewed with:"
echo "  docker-compose logs -f nginx"
echo "  docker-compose logs -f server"
echo "  docker-compose logs -f client"