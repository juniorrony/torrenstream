#!/bin/bash

# Docker Installation Script for macOS
echo "🐳 Installing Docker and Docker Compose on macOS..."

# Check if running on macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo "❌ This script is for macOS only"
    exit 1
fi

# Check if Homebrew is installed
if ! command -v brew &> /dev/null; then
    echo "❌ Homebrew is required but not installed"
    echo "Install Homebrew first: /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
    exit 1
fi

echo "✅ Homebrew found"

# Update Homebrew
echo "📦 Updating Homebrew..."
brew update

# Install Docker Desktop
echo "🐳 Installing Docker Desktop..."
brew install --cask docker

echo "🔧 Installing Docker Compose..."
brew install docker-compose

echo "✅ Installation completed!"
echo
echo "🚨 IMPORTANT NEXT STEPS:"
echo "1. Open Docker Desktop from Applications or Spotlight"
echo "2. Follow the setup wizard and sign in (or create account)"
echo "3. Wait for Docker Engine to start (whale icon in menu bar)"
echo "4. Run: docker --version"
echo "5. Run: docker-compose --version"
echo
echo "💡 Alternative: Use Docker Compose V2 syntax:"
echo "   docker compose up -d (instead of docker-compose up -d)"
echo
echo "🚀 Once Docker is running, you can start TorrentStream with:"
echo "   docker-compose -f docker-compose.yml up -d"