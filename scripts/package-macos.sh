#!/bin/bash
# macOS packaging script for File Transfer Application

set -e

VERSION=${1:-"1.0.0"}
SIGNING_IDENTITY=${2:-""}
NOTARIZATION_PROFILE=${3:-""}
BUILD_DIR="dist"

echo "🚀 Packaging File Transfer Application v$VERSION for macOS..."

# Create build directory
mkdir -p $BUILD_DIR

# Update version
echo "📝 Updating version numbers..."
just prepare-release $VERSION

# Clean and setup
echo "🧹 Cleaning and setting up..."
just clean-all
just setup-all

# Run tests
echo "🧪 Running tests..."
just test-all

# Build backend
echo "🔨 Building backend..."
cd backend
cargo build --release
cd ..

# Copy CLI binary
cp backend/target/release/file-transfer-cli $BUILD_DIR/file-transfer-cli-macos

# Build Tauri application
echo "🖥️ Building desktop application..."
cd frontend
cargo tauri build
cd ..

# Copy macOS artifacts
echo "📋 Copying macOS artifacts..."

# App bundle
if [ -d "frontend/src-tauri/target/release/bundle/macos" ]; then
    cp -r frontend/src-tauri/target/release/bundle/macos/*.app $BUILD_DIR/
fi

# DMG (if exists)
if [ -d "frontend/src-tauri/target/release/bundle/dmg" ]; then
    cp frontend/src-tauri/target/release/bundle/dmg/*.dmg $BUILD_DIR/
fi

# Code signing (if signing identity provided)
if [ -n "$SIGNING_IDENTITY" ]; then
    echo "🔐 Code signing application..."
    
    APP_PATH="$BUILD_DIR/File Transfer App.app"
    if [ -d "$APP_PATH" ]; then
        # Sign the app bundle
        codesign --force --options runtime --sign "$SIGNING_IDENTITY" "$APP_PATH"
        
        # Verify signature
        codesign --verify --verbose "$APP_PATH"
        spctl --assess --verbose "$APP_PATH"
    fi
fi

# Create DMG if not already created
DMG_PATH="$BUILD_DIR/File Transfer App.dmg"
if [ ! -f "$DMG_PATH" ] && [ -d "$BUILD_DIR/File Transfer App.app" ]; then
    echo "📦 Creating DMG..."
    
    # Check if create-dmg is available
    if command -v create-dmg >/dev/null 2>&1; then
        create-dmg \
            --volname "File Transfer App" \
            --volicon "frontend/src-tauri/icons/icon.icns" \
            --window-pos 200 120 \
            --window-size 600 300 \
            --icon-size 100 \
            --icon "File Transfer App.app" 175 120 \
            --hide-extension "File Transfer App.app" \
            --app-drop-link 425 120 \
            "$DMG_PATH" \
            "$BUILD_DIR/File Transfer App.app"
    else
        echo "⚠️  create-dmg not found. Install with: brew install create-dmg"
        
        # Alternative: create simple DMG with hdiutil
        TEMP_DMG="temp.dmg"
        hdiutil create -size 100m -fs HFS+ -volname "File Transfer App" "$TEMP_DMG"
        hdiutil attach "$TEMP_DMG"
        cp -r "$BUILD_DIR/File Transfer App.app" "/Volumes/File Transfer App/"
        hdiutil detach "/Volumes/File Transfer App"
        hdiutil convert "$TEMP_DMG" -format UDZO -o "$DMG_PATH"
        rm "$TEMP_DMG"
    fi
    
    # Sign DMG if signing identity provided
    if [ -n "$SIGNING_IDENTITY" ] && [ -f "$DMG_PATH" ]; then
        codesign --force --sign "$SIGNING_IDENTITY" "$DMG_PATH"
    fi
fi

# Notarization (if profile provided)
if [ -n "$NOTARIZATION_PROFILE" ] && [ -f "$DMG_PATH" ]; then
    echo "📋 Notarizing DMG..."
    
    # Submit for notarization
    xcrun notarytool submit "$DMG_PATH" --keychain-profile "$NOTARIZATION_PROFILE" --wait
    
    # Staple notarization ticket
    xcrun stapler staple "$DMG_PATH"
    
    # Verify notarization
    xcrun stapler validate "$DMG_PATH"
fi

# Create Homebrew formula
echo "🍺 Creating Homebrew formula..."
HOMEBREW_DIR="homebrew"
mkdir -p $HOMEBREW_DIR

# Calculate SHA256 for CLI binary
CLI_SHA256=$(shasum -a 256 "$BUILD_DIR/file-transfer-cli-macos" | cut -d' ' -f1)

cat > "$HOMEBREW_DIR/file-transfer-app.rb" << EOF
class FileTransferApp < Formula
  desc "Socket-based file transfer application"
  homepage "https://github.com/your-org/file-transfer-app"
  url "https://github.com/your-org/file-transfer-app/releases/download/v$VERSION/file-transfer-cli-macos"
  sha256 "$CLI_SHA256"
  version "$VERSION"

  depends_on "rust" => :build
  depends_on "node" => :build

  def install
    bin.install "file-transfer-cli-macos" => "file-transfer-cli"
  end

  test do
    system "#{bin}/file-transfer-cli", "--version"
  end
end
EOF

# Create checksums
echo "🔐 Creating checksums..."
cd $BUILD_DIR
for file in *; do
    if [ -f "$file" ]; then
        shasum -a 256 "$file" > "$file.sha256"
    fi
done
cd ..

# Create release archive
echo "📦 Creating release archive..."
tar -czf "file-transfer-app-macos-v$VERSION.tar.gz" -C $BUILD_DIR .

echo "✅ macOS packaging complete!"
echo "📁 Artifacts available in: $BUILD_DIR/"
echo "📦 Release archive: file-transfer-app-macos-v$VERSION.tar.gz"

# List created files
echo ""
echo "📋 Created files:"
ls -la $BUILD_DIR/

# Instructions for manual steps
echo ""
echo "📝 Next steps:"
echo "1. Test the application on a clean macOS system"
echo "2. Submit to Apple for notarization (if not done automatically)"
echo "3. Upload to GitHub releases"
echo "4. Submit Homebrew formula to homebrew-core"

if [ -n "$SIGNING_IDENTITY" ]; then
    echo "✅ Application is code signed"
else
    echo "⚠️  Application is not code signed. Users may see security warnings."
fi

if [ -n "$NOTARIZATION_PROFILE" ]; then
    echo "✅ Application is notarized"
else
    echo "⚠️  Application is not notarized. Users may see security warnings."
fi