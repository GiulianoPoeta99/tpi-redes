# Installation Guide

This guide covers installation of the File Transfer Application on all supported platforms.

## 📋 System Requirements

### Minimum Requirements
- **Operating System**: Windows 10+, macOS 10.15+, or Linux (Ubuntu 18.04+)
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 500MB free space
- **Network**: TCP/IP network connectivity

### Development Requirements
- **Rust**: 1.70.0 or later
- **Node.js**: 18.0.0 or later
- **npm**: 8.0.0 or later
- **Git**: For source code management

## 🚀 Quick Installation

### Option 1: Pre-built Binaries (Recommended)

#### Windows
1. Download `file-transfer-app-windows.msi` from the releases page
2. Run the installer and follow the setup wizard
3. Launch from Start Menu or Desktop shortcut

#### macOS
1. Download `file-transfer-app-macos.dmg` from the releases page
2. Open the DMG file and drag the app to Applications folder
3. Launch from Applications or Launchpad

#### Linux
```bash
# Ubuntu/Debian
wget https://github.com/your-repo/file-transfer-app/releases/latest/download/file-transfer-app-linux.deb
sudo dpkg -i file-transfer-app-linux.deb

# Fedora/RHEL
wget https://github.com/your-repo/file-transfer-app/releases/latest/download/file-transfer-app-linux.rpm
sudo rpm -i file-transfer-app-linux.rpm

# AppImage (Universal)
wget https://github.com/your-repo/file-transfer-app/releases/latest/download/file-transfer-app-linux.AppImage
chmod +x file-transfer-app-linux.AppImage
./file-transfer-app-linux.AppImage
```

### Option 2: Package Managers

#### Windows (Chocolatey)
```powershell
choco install file-transfer-app
```

#### macOS (Homebrew)
```bash
brew install --cask file-transfer-app
```

#### Linux (Snap)
```bash
sudo snap install file-transfer-app
```

## 🛠️ Development Installation

### Prerequisites Installation

#### Install Rust
```bash
# Install Rust via rustup
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env

# Verify installation
rustc --version
cargo --version
```

#### Install Node.js
```bash
# Using Node Version Manager (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18

# Verify installation
node --version
npm --version
```

#### Install Just (Build Tool)
```bash
# Using Cargo
cargo install just

# Or using package managers
# macOS: brew install just
# Ubuntu: sudo apt install just
```

### Source Code Installation

1. **Clone the Repository**
```bash
git clone https://github.com/your-repo/file-transfer-app.git
cd file-transfer-app
```

2. **Setup Dependencies**
```bash
# Install all dependencies
just setup-all

# Or manually:
# Backend dependencies
cd backend && cargo build
# Frontend dependencies  
cd frontend && npm install
```

3. **Build the Application**
```bash
# Build everything
just build-all

# Or build components separately:
just build-backend    # Rust CLI
just build-frontend   # Svelte web app
just build-tauri      # Desktop app
```

4. **Run Tests**
```bash
# Run all tests
just test-all

# Test specific components
just test-backend
just test-frontend
```

## 🐳 Docker Installation

### Prerequisites
- Docker 20.10+ and Docker Compose 2.0+

### Quick Docker Setup
```bash
# Clone repository
git clone https://github.com/your-repo/file-transfer-app.git
cd file-transfer-app

# Setup Docker environment
just docker-setup

# Run tests
just docker-test
```

### Manual Docker Setup
```bash
cd backend

# Build Docker image
docker build -t file-transfer-app .

# Run with Docker Compose
docker compose up -d

# Test the setup
docker compose exec sender ft-cli --help
```

## 🔧 Configuration

### Environment Variables
```bash
# Optional configuration
export FT_DEFAULT_CHUNK_SIZE=8192      # Default chunk size
export FT_DEFAULT_TIMEOUT=30           # Default timeout (seconds)
export FT_LOG_LEVEL=info               # Logging level
export FT_MAX_RETRIES=3                # Maximum retry attempts
```

### Configuration Files
The application stores configuration in:
- **Windows**: `%APPDATA%/file-transfer-app/config.json`
- **macOS**: `~/Library/Application Support/file-transfer-app/config.json`
- **Linux**: `~/.config/file-transfer-app/config.json`

## ✅ Verification

### Test CLI Installation
```bash
# Check CLI is working
file-transfer-cli --version
file-transfer-cli --help

# Test basic functionality
echo "Hello World" > test.txt
file-transfer-cli send --target 127.0.0.1 --port 8080 test.txt
```

### Test Desktop App
1. Launch the desktop application
2. Select "Transmitter" mode
3. Configure connection settings
4. Try selecting a file
5. Verify UI responds correctly

### Test Docker Installation
```bash
# Verify Docker setup
just docker-test

# Or manually:
docker compose ps
docker compose exec sender ft-cli --version
```

## 🚨 Troubleshooting Installation

### Common Issues

#### "Rust not found" or "cargo not found"
```bash
# Ensure Rust is in PATH
source ~/.cargo/env
# Or restart terminal/shell
```

#### "Node.js version too old"
```bash
# Update Node.js
nvm install 18
nvm use 18
# Or download from nodejs.org
```

#### "Permission denied" on Linux
```bash
# Fix permissions for AppImage
chmod +x file-transfer-app-linux.AppImage

# Or install via package manager
sudo apt install ./file-transfer-app-linux.deb
```

#### "App won't start" on macOS
```bash
# Allow unsigned app (if building from source)
sudo spctl --master-disable
# Then re-enable after testing:
sudo spctl --master-enable
```

#### Docker issues
```bash
# Ensure Docker is running
docker info

# Reset Docker environment
just docker-down
just docker-setup
```

### Getting Help

If you encounter issues:
1. Check the [Troubleshooting Guide](troubleshooting.md)
2. Review the logs with `--debug` flag
3. Search existing GitHub issues
4. Create a new issue with system information

### System Information for Bug Reports
```bash
# Gather system info
uname -a                              # System info
rustc --version                       # Rust version
node --version                        # Node.js version
file-transfer-cli --version           # App version
docker --version                      # Docker version (if using)
```

## 🔄 Updates

### Automatic Updates (Desktop App)
The desktop application includes an auto-updater that will notify you of new versions.

### Manual Updates
```bash
# Update from source
git pull origin main
just setup-all
just build-all

# Update pre-built binaries
# Download latest release and reinstall
```

### Update Dependencies
```bash
# Update Rust dependencies
cd backend && cargo update

# Update Node.js dependencies
cd frontend && npm update

# Update all
just update-deps
```

## 📚 Next Steps

After installation:
1. Read the [Quick Start Guide](quick-start.md)
2. Check the [User Manual](user-manual.md)
3. For development, see [Development Guide](development.md)

## 📞 Support

- **Documentation**: [docs/](README.md)
- **Issues**: GitHub Issues
- **Discussions**: GitHub Discussions
- **Email**: support@filetransfer.app (if applicable)