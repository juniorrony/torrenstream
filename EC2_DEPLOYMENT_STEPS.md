# 🚀 AWS EC2 TorrentStream Deployment Guide

## 📋 Prerequisites
- AWS EC2 instance running (Amazon Linux 2, Ubuntu 18.04+, or CentOS 7+)
- SSH access to your EC2 instance
- Security group configured (see below)

## 🔐 Step 1: Configure AWS Security Group

In your AWS Console, ensure your EC2 Security Group allows:

| Type | Protocol | Port Range | Source | Description |
|------|----------|------------|---------|-------------|
| SSH | TCP | 22 | Your IP | SSH access |
| HTTP | TCP | 80 | 0.0.0.0/0 | Web access |
| HTTPS | TCP | 443 | 0.0.0.0/0 | Secure web access |
| Custom TCP | TCP | 5000 | 0.0.0.0/0 | API access (optional) |

## 🖥️ Step 2: Connect to Your EC2 Instance

From your local terminal (macOS):

```bash
# Replace with your actual key file and EC2 public IP/DNS
ssh -i "your-key.pem" ec2-user@your-ec2-public-ip

# For Ubuntu instances, use:
# ssh -i "your-key.pem" ubuntu@your-ec2-public-ip
```

## 🐳 Step 3: Install Docker on EC2

Once connected to your EC2 instance, run:

```bash
# Download the installation script
curl -O https://raw.githubusercontent.com/your-repo/torrentstream/main/aws-ec2-docker-setup.sh

# Make it executable
chmod +x aws-ec2-docker-setup.sh

# Run the installation
./aws-ec2-docker-setup.sh
```

**OR** run commands manually:

### For Amazon Linux 2:
```bash
sudo yum update -y
sudo amazon-linux-extras install docker -y
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker ec2-user

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
sudo ln -s /usr/local/bin/docker-compose /usr/bin/docker-compose
```

### For Ubuntu:
```bash
sudo apt-get update -y
sudo apt-get install -y docker.io docker-compose
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker ubuntu
```

## 🔄 Step 4: Refresh Group Membership

```bash
# Logout and login again, OR run:
newgrp docker

# Verify Docker works without sudo:
docker --version
docker-compose --version
```

## 📦 Step 5: Deploy TorrentStream

```bash
# Clone your repository (if using Git)
git clone https://github.com/your-username/torrentstream.git
cd torrentstream

# OR upload your files using SCP from local machine:
# scp -i "your-key.pem" -r /path/to/torrentstream ec2-user@your-ec2-ip:~/

# Create necessary directories
mkdir -p downloads data logs

# Copy environment configuration
cp .env.example .env

# Edit environment file (optional)
nano .env

# Start the application
docker-compose -f docker-compose.yml up -d
```

## ✅ Step 6: Verify Deployment

```bash
# Check if containers are running
docker ps

# View logs
docker-compose logs -f

# Test health endpoint
curl http://localhost:5000/api/health

# Test from outside (replace with your EC2 public IP)
curl http://your-ec2-public-ip:5000/api/health
```

## 🌐 Step 7: Access Your Application

Open your browser and navigate to:
- **HTTP**: `http://your-ec2-public-ip`
- **API**: `http://your-ec2-public-ip:5000/api/health`

## 🛠️ Troubleshooting

### Common Issues:

1. **Permission Denied (Docker)**
   ```bash
   # Logout and login again
   exit
   ssh -i "your-key.pem" ec2-user@your-ec2-public-ip
   ```

2. **Port Already in Use**
   ```bash
   sudo netstat -tulpn | grep :5000
   sudo kill -9 <PID>
   ```

3. **Firewall Issues**
   ```bash
   # Check if firewall is blocking
   sudo iptables -L
   
   # For Ubuntu with ufw:
   sudo ufw status
   sudo ufw allow 80
   sudo ufw allow 5000
   ```

4. **Container Won't Start**
   ```bash
   # Check detailed logs
   docker-compose logs server
   docker-compose logs client
   
   # Restart services
   docker-compose restart
   ```

5. **Can't Access from Internet**
   - Check AWS Security Group settings
   - Ensure ports 80 and 5000 are open
   - Verify EC2 instance has public IP

## 🔒 Production Deployment

For production, use the production configuration:

```bash
# Use production Docker Compose
docker-compose -f docker-compose.production.yml up -d

# Set up SSL (optional)
# Follow DEPLOYMENT_GUIDE.md for Let's Encrypt setup
```

## 📊 Monitoring

```bash
# Monitor resource usage
htop
docker stats

# Check disk space
df -h

# View real-time logs
docker-compose logs -f --tail=100
```

## 🛑 Stop/Start Services

```bash
# Stop all services
docker-compose down

# Start services
docker-compose up -d

# Restart specific service
docker-compose restart server
```

## 🔄 Updates

```bash
# Pull latest code
git pull origin main

# Rebuild and restart
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

---

## 🆘 Quick Reference Commands

```bash
# Essential commands for EC2 deployment:

# 1. Install Docker (Amazon Linux 2)
sudo yum update -y && sudo amazon-linux-extras install docker -y
sudo systemctl start docker && sudo usermod -aG docker ec2-user

# 2. Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 3. Deploy TorrentStream
git clone <your-repo> && cd torrentstream
docker-compose up -d

# 4. Check status
docker ps && curl http://localhost:5000/api/health
```

---

**🎉 You should now have TorrentStream running on your AWS EC2 instance!**

Access it at: `http://your-ec2-public-ip`