#!/bin/bash

# Script to configure system nginx as reverse proxy to Docker containers
# This approach uses system nginx on port 80 to proxy to Docker containers on other ports

echo "🔧 Setting up system nginx as reverse proxy to Docker containers..."

# First, modify docker-compose to use alternative ports
echo "📝 Updating Docker Compose to use alternative ports..."

# Create nginx config for system nginx
sudo mkdir -p /etc/nginx/sites-available /etc/nginx/sites-enabled

echo "📝 Creating nginx reverse proxy configuration..."

cat << 'EOF' | sudo tee /etc/nginx/sites-available/torrentstream > /dev/null
# TorrentStream Reverse Proxy Configuration
server {
    listen 80;
    server_name localhost 54.144.27.47;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Referrer-Policy "strict-origin-when-cross-origin";
    
    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=30r/s;
    limit_req_zone $binary_remote_addr zone=general:10m rate=10r/s;

    # Proxy to Docker nginx container
    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Port $server_port;
        
        # Rate limiting
        limit_req zone=general burst=30 nodelay;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # Buffer settings
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;
        proxy_busy_buffers_size 8k;
    }

    # API routes with different rate limiting
    location /api {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # API-specific rate limiting
        limit_req zone=api burst=50 nodelay;
        
        # Longer timeouts for API calls
        proxy_connect_timeout 120s;
        proxy_send_timeout 120s;
        proxy_read_timeout 120s;
    }

    # WebSocket support
    location /socket.io {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket timeouts
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }

    # Health check endpoint
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }

    # Logging
    access_log /var/log/nginx/torrentstream.access.log;
    error_log /var/log/nginx/torrentstream.error.log warn;
}

# HTTPS server (if SSL certificate is available)
server {
    listen 443 ssl http2;
    server_name localhost 54.144.27.47;

    # SSL configuration (you'll need to add your certificates)
    ssl_certificate /etc/nginx/ssl/torrentstream.crt;
    ssl_certificate_key /etc/nginx/ssl/torrentstream.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # Same proxy configuration as HTTP
    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Port $server_port;
        
        limit_req zone=general burst=30 nodelay;
        
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    location /api {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        
        limit_req zone=api burst=50 nodelay;
        
        proxy_connect_timeout 120s;
        proxy_send_timeout 120s;
        proxy_read_timeout 120s;
    }

    location /socket.io {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }

    access_log /var/log/nginx/torrentstream.ssl.access.log;
    error_log /var/log/nginx/torrentstream.ssl.error.log warn;
}
EOF

# Enable the site
sudo ln -sf /etc/nginx/sites-available/torrentstream /etc/nginx/sites-enabled/

# Remove default site if it exists
sudo rm -f /etc/nginx/sites-enabled/default

# Test nginx configuration
echo "🧪 Testing nginx configuration..."
if sudo nginx -t; then
    echo "✅ Nginx configuration is valid"
    
    # Start Docker with alternative ports
    echo "🐳 Starting Docker containers on alternative ports..."
    docker-compose -f docker-compose.yml -f docker-compose.override.yml up -d
    
    # Reload nginx
    echo "🔄 Reloading nginx..."
    sudo systemctl reload nginx
    
    echo ""
    echo "🎉 Setup complete!"
    echo "📊 System status:"
    echo "  - System nginx: Running on port 80/443"
    echo "  - Docker nginx: Running on port 8080/8443"
    echo "  - Proxy: System nginx → Docker nginx → App"
    echo ""
    echo "🌐 Access your application at:"
    echo "  http://localhost"
    echo "  http://54.144.27.47"
    echo ""
    echo "📋 Useful commands:"
    echo "  sudo nginx -t                    # Test configuration"
    echo "  sudo systemctl reload nginx     # Reload nginx"
    echo "  docker-compose logs -f          # View Docker logs"
    echo "  sudo tail -f /var/log/nginx/torrentstream.access.log  # View access logs"
    
else
    echo "❌ Nginx configuration has errors. Please check the configuration."
    sudo nginx -t
fi