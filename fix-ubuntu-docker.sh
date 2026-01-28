#!/bin/bash

echo "🔧 Fixing Docker installation on Ubuntu..."

# Remove any existing Docker packages that might conflict
sudo apt-get remove -y docker docker-engine docker.io containerd runc

# Remove containerd if it exists and is causing conflicts
sudo apt-get remove -y containerd

# Clean up
sudo apt-get autoremove -y
sudo apt-get autoclean

# Update package list
sudo apt-get update -y

# Install prerequisites
sudo apt-get install -y apt-transport-https ca-certificates curl gnupg lsb-release

# Add Docker's official GPG key
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Add Docker repository
echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Update package list
sudo apt-get update -y

# Install Docker Engine
sudo apt-get install -y docker-ce docker-ce-cli containerd.io

# Start and enable Docker
sudo systemctl start docker
sudo systemctl enable docker

# Add user to docker group
sudo usermod -aG docker ubuntu

# Install Docker Compose separately
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Create symlink
sudo ln -sf /usr/local/bin/docker-compose /usr/bin/docker-compose

echo "✅ Docker installation completed!"
echo "🔄 Please run: newgrp docker"