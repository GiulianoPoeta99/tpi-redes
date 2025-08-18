#!/bin/bash
# Package application for all supported platforms

set -e

VERSION=${1:-"1.0.0"}
BUILD_DIR="dist"

echo "🚀 Packaging File Transfer Application v$VERSION for all platforms..."

# Create build directory
mkdir -p $BUILD_DIR

# Update version in all files
echo "📝 Updating version numbers..."
just prepare-release $VERSION

# Clean previous builds
echo "🧹 Cleaning previous builds..."
just clean-all

# Setup dependencies
echo "📦 Installing dependencies..."
just setup-all

# Run tests
echo "🧪 Running tests..."
just test-all

# Build backend CLI
echo "🔨 Building backend CLI..."
cd backend
cargo build --release
cd ..

# Copy CLI binary
cp backend/target/release/file-transfer-cli $BUILD_DIR/file-transfer-cli-linux

# Build Tauri application for all platforms
echo "🖥️ Building desktop application..."
cd frontend

# Build for current platform
cargo tauri build

# Copy built artifacts
echo "📋 Copying build artifacts..."

# Linux artifacts
if [ -d "src-tauri/target/release/bundle/deb" ]; then
    cp src-tauri/target/release/bundle/deb/*.deb ../$BUILD_DIR/
fi

if [ -d "src-tauri/target/release/bundle/rpm" ]; then
    cp src-tauri/target/release/bundle/rpm/*.rpm ../$BUILD_DIR/
fi

if [ -d "src-tauri/target/release/bundle/appimage" ]; then
    cp src-tauri/target/release/bundle/appimage/*.AppImage ../$BUILD_DIR/
fi

# macOS artifacts (if building on macOS)
if [ -d "src-tauri/target/release/bundle/macos" ]; then
    cp -r src-tauri/target/release/bundle/macos/*.app ../$BUILD_DIR/
fi

if [ -d "src-tauri/target/release/bundle/dmg" ]; then
    cp src-tauri/target/release/bundle/dmg/*.dmg ../$BUILD_DIR/
fi

# Windows artifacts (if building on Windows)
if [ -d "src-tauri/target/release/bundle/msi" ]; then
    cp src-tauri/target/release/bundle/msi/*.msi ../$BUILD_DIR/
fi

if [ -d "src-tauri/target/release/bundle/nsis" ]; then
    cp src-tauri/target/release/bundle/nsis/*.exe ../$BUILD_DIR/
fi

cd ..

# Create checksums
echo "🔐 Creating checksums..."
cd $BUILD_DIR
for file in *; do
    if [ -f "$file" ]; then
        sha256sum "$file" > "$file.sha256"
    fi
done
cd ..

# Create release archive
echo "📦 Creating release archive..."
tar -czf file-transfer-app-v$VERSION.tar.gz -C $BUILD_DIR .

echo "✅ Packaging complete!"
echo "📁 Artifacts available in: $BUILD_DIR/"
echo "📦 Release archive: file-transfer-app-v$VERSION.tar.gz"

# List all created files
echo ""
echo "📋 Created files:"
ls -la $BUILD_DIR/