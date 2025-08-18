# Deployment Guide

Complete guide for building, packaging, and deploying the File Transfer Application across all supported platforms.

## 📋 Table of Contents

- [Build Requirements](#build-requirements)
- [Development Builds](#development-builds)
- [Production Builds](#production-builds)
- [Platform-Specific Packaging](#platform-specific-packaging)
- [Distribution](#distribution)
- [Auto-Updater Setup](#auto-updater-setup)
- [CI/CD Pipeline](#cicd-pipeline)

## 🛠️ Build Requirements

### System Requirements

#### All Platforms
- **Rust**: 1.70.0 or later
- **Node.js**: 18.0.0 or later
- **npm**: 8.0.0 or later
- **Git**: For version control
- **Just**: Command runner (`cargo install just`)

#### Platform-Specific Tools

##### Windows
- **Visual Studio Build Tools**: C++ build tools
- **Windows SDK**: For Windows API access
- **WiX Toolset**: For MSI installer creation
- **Code Signing Certificate**: For signed releases (optional)

##### macOS
- **Xcode Command Line Tools**: `xcode-select --install`
- **Apple Developer Account**: For code signing and notarization
- **Developer ID Certificate**: For distribution outside App Store

##### Linux
- **Build Essentials**: `sudo apt install build-essential`
- **Additional Libraries**: 
  ```bash
  # Ubuntu/Debian
  sudo apt install libwebkit2gtk-4.0-dev libssl-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev
  
  # Fedora
  sudo dnf install webkit2gtk3-devel openssl-devel gtk3-devel libappindicator-gtk3-devel librsvg2-devel
  ```

### Development Environment Setup

```bash
# Clone repository
git clone https://github.com/your-org/file-transfer-app.git
cd file-transfer-app

# Install dependencies
just setup-all

# Verify setup
just check-deps
```

## 🔧 Development Builds

### Backend Development

```bash
# Build backend in debug mode
cd backend
cargo build

# Build with optimizations
cargo build --release

# Run tests
cargo test

# Run CLI directly
cargo run --bin file-transfer-cli -- --help
```

### Frontend Development

```bash
# Start development server
cd frontend
npm run dev

# Build for production
npm run build

# Run tests
npm run test
```

### Desktop Application Development

```bash
# Start Tauri development mode
cd frontend
cargo tauri dev

# Build desktop app
cargo tauri build
```

### Unified Development Commands

```bash
# Start all development servers
just dev-all

# Build everything
just build-all

# Run all tests
just test-all
```

## 🏭 Production Builds

### Environment Configuration

#### Environment Variables
```bash
# Production environment
export NODE_ENV=production
export RUST_LOG=info
export TAURI_PRIVATE_KEY=path/to/private.key
export TAURI_KEY_PASSWORD=your_password

# Version information
export APP_VERSION=1.0.0
export BUILD_NUMBER=1
```

#### Configuration Files

**backend/.env.production**
```env
RUST_LOG=info
FT_DEFAULT_CHUNK_SIZE=8192
FT_DEFAULT_TIMEOUT=30
FT_MAX_RETRIES=3
```

**frontend/.env.production**
```env
NODE_ENV=production
VITE_APP_VERSION=1.0.0
VITE_BUILD_DATE=2024-03-15
```

### Production Build Process

#### 1. Version Management
```bash
# Update version in all files
just prepare-release 1.0.0

# Verify version consistency
grep -r "version.*1.0.0" backend/Cargo.toml frontend/package.json frontend/src-tauri/tauri.conf.json
```

#### 2. Backend Production Build
```bash
cd backend

# Clean previous builds
cargo clean

# Build optimized release
cargo build --release

# Strip debug symbols (Linux/macOS)
strip target/release/file-transfer-cli

# Verify binary
./target/release/file-transfer-cli --version
```

#### 3. Frontend Production Build
```bash
cd frontend

# Clean previous builds
rm -rf build .svelte-kit/output

# Install production dependencies
npm ci --production=false

# Build optimized frontend
npm run build

# Verify build
ls -la build/
```

#### 4. Desktop Application Build
```bash
cd frontend

# Build Tauri application
cargo tauri build --release

# Verify outputs
ls -la src-tauri/target/release/bundle/
```

## 📦 Platform-Specific Packaging

### Windows Packaging

#### MSI Installer
```bash
# Build MSI installer
cd frontend
cargo tauri build --target x86_64-pc-windows-msvc

# Output location
ls src-tauri/target/x86_64-pc-windows-msvc/release/bundle/msi/
```

#### Code Signing (Windows)
```bash
# Sign the executable
signtool sign /f certificate.p12 /p password /t http://timestamp.digicert.com file-transfer-app.exe

# Sign the MSI
signtool sign /f certificate.p12 /p password /t http://timestamp.digicert.com file-transfer-app.msi
```

#### Chocolatey Package
```xml
<!-- chocolatey/file-transfer-app.nuspec -->
<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://schemas.microsoft.com/packaging/2015/06/nuspec.xsd">
  <metadata>
    <id>file-transfer-app</id>
    <version>1.0.0</version>
    <title>File Transfer App</title>
    <authors>Your Organization</authors>
    <description>Socket-based file transfer application</description>
    <projectUrl>https://github.com/your-org/file-transfer-app</projectUrl>
    <licenseUrl>https://github.com/your-org/file-transfer-app/blob/main/LICENSE</licenseUrl>
    <requireLicenseAcceptance>false</requireLicenseAcceptance>
    <tags>file-transfer networking tcp udp</tags>
  </metadata>
  <files>
    <file src="file-transfer-app.msi" target="tools/" />
  </files>
</package>
```

### macOS Packaging

#### DMG Creation
```bash
# Build macOS app
cd frontend
cargo tauri build --target x86_64-apple-darwin

# Create DMG
create-dmg \
  --volname "File Transfer App" \
  --volicon "app-icon.icns" \
  --window-pos 200 120 \
  --window-size 600 300 \
  --icon-size 100 \
  --icon "File Transfer App.app" 175 120 \
  --hide-extension "File Transfer App.app" \
  --app-drop-link 425 120 \
  "File Transfer App.dmg" \
  "src-tauri/target/x86_64-apple-darwin/release/bundle/macos/"
```

#### Code Signing and Notarization
```bash
# Sign the application
codesign --force --options runtime --sign "Developer ID Application: Your Name" "File Transfer App.app"

# Create signed DMG
codesign --force --sign "Developer ID Application: Your Name" "File Transfer App.dmg"

# Notarize with Apple
xcrun notarytool submit "File Transfer App.dmg" --keychain-profile "notarytool-profile" --wait

# Staple notarization
xcrun stapler staple "File Transfer App.dmg"
```

#### Homebrew Formula
```ruby
# homebrew/file-transfer-app.rb
class FileTransferApp < Formula
  desc "Socket-based file transfer application"
  homepage "https://github.com/your-org/file-transfer-app"
  url "https://github.com/your-org/file-transfer-app/releases/download/v1.0.0/file-transfer-app-macos.tar.gz"
  sha256 "sha256_hash_here"
  version "1.0.0"

  depends_on "rust" => :build
  depends_on "node" => :build

  def install
    system "cargo", "build", "--release"
    bin.install "target/release/file-transfer-cli"
  end

  test do
    system "#{bin}/file-transfer-cli", "--version"
  end
end
```

### Linux Packaging

#### DEB Package (Debian/Ubuntu)
```bash
# Build DEB package
cd frontend
cargo tauri build --target x86_64-unknown-linux-gnu

# Output location
ls src-tauri/target/x86_64-unknown-linux-gnu/release/bundle/deb/
```

#### RPM Package (Fedora/RHEL)
```bash
# Build RPM package
cargo tauri build --target x86_64-unknown-linux-gnu --format rpm

# Output location
ls src-tauri/target/x86_64-unknown-linux-gnu/release/bundle/rpm/
```

#### AppImage
```bash
# Build AppImage
cargo tauri build --target x86_64-unknown-linux-gnu --format appimage

# Make executable
chmod +x file-transfer-app.AppImage
```

#### Snap Package
```yaml
# snap/snapcraft.yaml
name: file-transfer-app
version: '1.0.0'
summary: Socket-based file transfer application
description: |
  A cross-platform file transfer application supporting TCP and UDP protocols
  with integrity verification and real-time progress monitoring.

grade: stable
confinement: strict

apps:
  file-transfer-app:
    command: bin/file-transfer-app
    plugs: [network, home, removable-media]
  
  file-transfer-cli:
    command: bin/file-transfer-cli
    plugs: [network, home, removable-media]

parts:
  file-transfer-app:
    plugin: rust
    source: .
    build-packages:
      - build-essential
      - libwebkit2gtk-4.0-dev
      - libssl-dev
      - libgtk-3-dev
```

## 🚀 Distribution

### GitHub Releases

#### Release Preparation Script
```bash
#!/bin/bash
# scripts/prepare-release.sh

VERSION=$1
if [ -z "$VERSION" ]; then
    echo "Usage: $0 <version>"
    exit 1
fi

echo "Preparing release $VERSION..."

# Update version numbers
just prepare-release $VERSION

# Build all platforms
just build-all

# Run tests
just test-all

# Create release artifacts
mkdir -p dist/

# Copy binaries
cp backend/target/release/file-transfer-cli dist/file-transfer-cli-linux
cp frontend/src-tauri/target/release/bundle/deb/*.deb dist/
cp frontend/src-tauri/target/release/bundle/rpm/*.rpm dist/
cp frontend/src-tauri/target/release/bundle/appimage/*.AppImage dist/

echo "Release $VERSION prepared in dist/"
```

#### GitHub Actions Release
```yaml
# .github/workflows/release.yml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Rust
        uses: actions-rs/toolchain@v1
        with:
          toolchain: stable
          
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: 18
          
      - name: Install dependencies
        run: |
          cargo install just
          just setup-all
          
      - name: Build release
        run: just build-all
        
      - name: Run tests
        run: just test-all
        
      - name: Create release
        uses: softprops/action-gh-release@v1
        with:
          files: |
            backend/target/release/file-transfer-cli
            frontend/src-tauri/target/release/bundle/**/*
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### Package Repositories

#### Debian Repository
```bash
# Setup GPG key
gpg --gen-key

# Create repository structure
mkdir -p repo/dists/stable/main/binary-amd64/

# Copy DEB files
cp *.deb repo/dists/stable/main/binary-amd64/

# Generate Packages file
cd repo
dpkg-scanpackages dists/stable/main/binary-amd64/ /dev/null | gzip -9c > dists/stable/main/binary-amd64/Packages.gz

# Sign repository
gpg --clearsign -o dists/stable/InRelease dists/stable/Release
```

#### Docker Registry
```dockerfile
# Dockerfile.release
FROM alpine:latest

RUN apk add --no-cache ca-certificates

COPY backend/target/release/file-transfer-cli /usr/local/bin/

ENTRYPOINT ["file-transfer-cli"]
```

```bash
# Build and push Docker image
docker build -f Dockerfile.release -t your-org/file-transfer-app:1.0.0 .
docker push your-org/file-transfer-app:1.0.0
```

## 🔄 Auto-Updater Setup

### Tauri Updater Configuration

#### Update Server Setup
```json
{
  "version": "1.0.1",
  "notes": "Bug fixes and performance improvements",
  "pub_date": "2024-03-15T12:00:00Z",
  "platforms": {
    "windows-x86_64": {
      "signature": "signature_here",
      "url": "https://releases.example.com/file-transfer-app-1.0.1-x64.msi"
    },
    "darwin-x86_64": {
      "signature": "signature_here", 
      "url": "https://releases.example.com/file-transfer-app-1.0.1.dmg"
    },
    "linux-x86_64": {
      "signature": "signature_here",
      "url": "https://releases.example.com/file-transfer-app-1.0.1.AppImage"
    }
  }
}
```

#### Frontend Update Check
```typescript
// src/lib/updater.ts
import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';

export async function checkForUpdates() {
  try {
    const update = await check();
    
    if (update?.available) {
      console.log('Update available:', update.version);
      
      // Show update dialog to user
      const shouldUpdate = await showUpdateDialog(update);
      
      if (shouldUpdate) {
        await update.downloadAndInstall();
        await relaunch();
      }
    }
  } catch (error) {
    console.error('Update check failed:', error);
  }
}
```

### Update Signing

#### Generate Update Keys
```bash
# Generate private key for signing updates
cargo tauri signer generate -w ~/.tauri/private.key

# Set environment variable
export TAURI_PRIVATE_KEY=~/.tauri/private.key
export TAURI_KEY_PASSWORD=your_secure_password
```

#### Sign Updates
```bash
# Sign update file
cargo tauri signer sign /path/to/app.exe -k ~/.tauri/private.key -p password
```

## 🔄 CI/CD Pipeline

### GitHub Actions Workflow

```yaml
# .github/workflows/ci-cd.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
        
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Rust
        uses: actions-rs/toolchain@v1
        with:
          toolchain: stable
          components: rustfmt, clippy
          
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: 18
          cache: npm
          cache-dependency-path: frontend/package-lock.json
          
      - name: Install Just
        run: cargo install just
        
      - name: Setup dependencies
        run: just setup-all
        
      - name: Lint
        run: just lint-all
        
      - name: Test
        run: just test-all
        
      - name: Build
        run: just build-all

  build-release:
    needs: test
    runs-on: ${{ matrix.os }}
    if: github.ref == 'refs/heads/main'
    strategy:
      matrix:
        include:
          - os: ubuntu-latest
            target: x86_64-unknown-linux-gnu
          - os: windows-latest
            target: x86_64-pc-windows-msvc
          - os: macos-latest
            target: x86_64-apple-darwin
            
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup build environment
        run: just setup-all
        
      - name: Build release
        run: |
          just build-all
          
      - name: Upload artifacts
        uses: actions/upload-artifact@v3
        with:
          name: release-${{ matrix.target }}
          path: |
            backend/target/release/file-transfer-cli*
            frontend/src-tauri/target/release/bundle/**/*
```

### Deployment Automation

#### Deployment Script
```bash
#!/bin/bash
# scripts/deploy.sh

set -e

VERSION=$1
ENVIRONMENT=${2:-production}

echo "Deploying version $VERSION to $ENVIRONMENT..."

# Build release
just build-all

# Run tests
just test-all

# Deploy to package repositories
case $ENVIRONMENT in
  production)
    # Deploy to production repositories
    ./scripts/deploy-packages.sh $VERSION
    
    # Update auto-updater manifest
    ./scripts/update-manifest.sh $VERSION
    
    # Create GitHub release
    gh release create v$VERSION \
      --title "Release $VERSION" \
      --notes-file CHANGELOG.md \
      dist/*
    ;;
    
  staging)
    # Deploy to staging environment
    ./scripts/deploy-staging.sh $VERSION
    ;;
esac

echo "Deployment complete!"
```

## 📋 Release Checklist

### Pre-Release
- [ ] Update version numbers in all files
- [ ] Update CHANGELOG.md with new features and fixes
- [ ] Run full test suite on all platforms
- [ ] Verify all dependencies are up to date
- [ ] Check code signing certificates are valid
- [ ] Review security considerations

### Build Process
- [ ] Clean build environment
- [ ] Build all platform targets
- [ ] Run integration tests
- [ ] Verify binary signatures
- [ ] Test installation packages
- [ ] Validate auto-updater functionality

### Distribution
- [ ] Upload to GitHub Releases
- [ ] Update package repositories (Chocolatey, Homebrew, etc.)
- [ ] Update Docker images
- [ ] Deploy auto-updater manifest
- [ ] Update documentation website
- [ ] Announce release on social media/blog

### Post-Release
- [ ] Monitor error reporting systems
- [ ] Check download statistics
- [ ] Respond to user feedback
- [ ] Plan next release cycle
- [ ] Update development dependencies

## 🔧 Troubleshooting Deployment

### Common Build Issues

#### Rust Compilation Errors
```bash
# Clear Rust cache
cargo clean

# Update Rust toolchain
rustup update

# Check for missing system dependencies
just check-deps
```

#### Node.js Build Issues
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

#### Tauri Build Issues
```bash
# Update Tauri CLI
cargo install tauri-cli --force

# Clear Tauri cache
rm -rf src-tauri/target
```

### Platform-Specific Issues

#### Windows
- **Missing Visual Studio Build Tools**: Install from Microsoft
- **Code signing issues**: Verify certificate validity
- **MSI creation fails**: Check WiX Toolset installation

#### macOS
- **Notarization fails**: Verify Apple Developer account
- **Code signing issues**: Check certificate in Keychain
- **DMG creation fails**: Install create-dmg tool

#### Linux
- **Missing system libraries**: Install development packages
- **AppImage issues**: Check fuse installation
- **Permission errors**: Verify file permissions

---

*This deployment guide covers version 1.0.0 of the File Transfer Application. For the latest deployment procedures, check the project repository.*