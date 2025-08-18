#!/bin/bash
# Generate update manifest for Tauri auto-updater

set -e

VERSION=${1:-"1.0.0"}
RELEASE_NOTES=${2:-"Bug fixes and performance improvements"}
BASE_URL=${3:-"https://github.com/your-org/file-transfer-app/releases/download"}

echo "🔄 Generating update manifest for version $VERSION..."

# Create update manifest directory
mkdir -p update-manifests

# Generate manifest file
cat > "update-manifests/update-v$VERSION.json" << EOF
{
  "version": "$VERSION",
  "notes": "$RELEASE_NOTES",
  "pub_date": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "platforms": {
    "windows-x86_64": {
      "signature": "",
      "url": "$BASE_URL/v$VERSION/file-transfer-app-windows-x64.msi"
    },
    "darwin-x86_64": {
      "signature": "",
      "url": "$BASE_URL/v$VERSION/file-transfer-app-macos-x64.dmg"
    },
    "darwin-aarch64": {
      "signature": "",
      "url": "$BASE_URL/v$VERSION/file-transfer-app-macos-arm64.dmg"
    },
    "linux-x86_64": {
      "signature": "",
      "url": "$BASE_URL/v$VERSION/file-transfer-app-linux-x64.AppImage"
    }
  }
}
EOF

echo "📝 Update manifest created: update-manifests/update-v$VERSION.json"

# Generate signing script
cat > "scripts/sign-update-manifest.sh" << 'EOF'
#!/bin/bash
# Sign update manifest for Tauri auto-updater

VERSION=$1
PRIVATE_KEY=${TAURI_PRIVATE_KEY:-~/.tauri/private.key}
KEY_PASSWORD=${TAURI_KEY_PASSWORD}

if [ -z "$VERSION" ]; then
    echo "Usage: $0 <version>"
    exit 1
fi

if [ ! -f "$PRIVATE_KEY" ]; then
    echo "Error: Private key not found at $PRIVATE_KEY"
    echo "Generate one with: cargo tauri signer generate -w $PRIVATE_KEY"
    exit 1
fi

MANIFEST_FILE="update-manifests/update-v$VERSION.json"

if [ ! -f "$MANIFEST_FILE" ]; then
    echo "Error: Manifest file not found: $MANIFEST_FILE"
    exit 1
fi

echo "🔐 Signing update manifest for version $VERSION..."

# Sign each platform binary and update manifest
for platform in windows-x86_64 darwin-x86_64 darwin-aarch64 linux-x86_64; do
    case $platform in
        windows-x86_64)
            BINARY_PATH="dist/file-transfer-app-windows-x64.msi"
            ;;
        darwin-x86_64)
            BINARY_PATH="dist/file-transfer-app-macos-x64.dmg"
            ;;
        darwin-aarch64)
            BINARY_PATH="dist/file-transfer-app-macos-arm64.dmg"
            ;;
        linux-x86_64)
            BINARY_PATH="dist/file-transfer-app-linux-x64.AppImage"
            ;;
    esac
    
    if [ -f "$BINARY_PATH" ]; then
        echo "Signing $platform binary: $BINARY_PATH"
        
        # Generate signature
        if [ -n "$KEY_PASSWORD" ]; then
            SIGNATURE=$(cargo tauri signer sign "$BINARY_PATH" -k "$PRIVATE_KEY" -p "$KEY_PASSWORD" --output-signature)
        else
            SIGNATURE=$(cargo tauri signer sign "$BINARY_PATH" -k "$PRIVATE_KEY" --output-signature)
        fi
        
        # Update manifest with signature
        jq --arg platform "$platform" --arg signature "$SIGNATURE" \
           '.platforms[$platform].signature = $signature' \
           "$MANIFEST_FILE" > "${MANIFEST_FILE}.tmp" && mv "${MANIFEST_FILE}.tmp" "$MANIFEST_FILE"
        
        echo "✅ Signed $platform"
    else
        echo "⚠️  Binary not found for $platform: $BINARY_PATH"
    fi
done

echo "✅ Update manifest signed successfully"
echo "📁 Signed manifest: $MANIFEST_FILE"
EOF

chmod +x "scripts/sign-update-manifest.sh"

# Generate deployment script
cat > "scripts/deploy-update-manifest.sh" << 'EOF'
#!/bin/bash
# Deploy update manifest to update server

VERSION=$1
UPDATE_SERVER_URL=${UPDATE_SERVER_URL:-"https://releases.example.com/file-transfer-app"}
UPDATE_SERVER_PATH=${UPDATE_SERVER_PATH:-"/var/www/releases/file-transfer-app"}

if [ -z "$VERSION" ]; then
    echo "Usage: $0 <version>"
    exit 1
fi

MANIFEST_FILE="update-manifests/update-v$VERSION.json"

if [ ! -f "$MANIFEST_FILE" ]; then
    echo "Error: Manifest file not found: $MANIFEST_FILE"
    exit 1
fi

echo "🚀 Deploying update manifest for version $VERSION..."

# Copy to update server (adjust this based on your deployment method)
if [ -n "$UPDATE_SERVER_PATH" ]; then
    # Local/SSH deployment
    cp "$MANIFEST_FILE" "$UPDATE_SERVER_PATH/latest.json"
    cp "$MANIFEST_FILE" "$UPDATE_SERVER_PATH/update-v$VERSION.json"
    echo "✅ Manifest deployed to local path: $UPDATE_SERVER_PATH"
else
    # HTTP deployment (example with curl)
    curl -X POST \
         -H "Content-Type: application/json" \
         -d @"$MANIFEST_FILE" \
         "$UPDATE_SERVER_URL/update-manifest"
    echo "✅ Manifest deployed to: $UPDATE_SERVER_URL"
fi

echo "🔄 Update manifest is now live for version $VERSION"
EOF

chmod +x "scripts/deploy-update-manifest.sh"

# Generate update server configuration (nginx example)
cat > "update-server/nginx.conf" << 'EOF'
# Nginx configuration for Tauri update server

server {
    listen 80;
    server_name releases.example.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name releases.example.com;
    
    # SSL configuration
    ssl_certificate /path/to/ssl/certificate.crt;
    ssl_certificate_key /path/to/ssl/private.key;
    
    # Security headers
    add_header X-Content-Type-Options nosniff;
    add_header X-Frame-Options DENY;
    add_header X-XSS-Protection "1; mode=block";
    
    # Update manifest endpoint
    location /file-transfer-app/latest.json {
        root /var/www/releases;
        add_header Content-Type application/json;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Pragma no-cache;
        add_header Expires 0;
    }
    
    # Version-specific manifests
    location ~ ^/file-transfer-app/update-v(.+)\.json$ {
        root /var/www/releases;
        add_header Content-Type application/json;
        add_header Cache-Control "public, max-age=31536000";
    }
    
    # Release binaries
    location /file-transfer-app/releases/ {
        root /var/www/releases;
        add_header Cache-Control "public, max-age=31536000";
    }
    
    # Health check
    location /health {
        return 200 "OK";
        add_header Content-Type text/plain;
    }
}
EOF

echo "✅ Update manifest generation complete!"
echo ""
echo "📋 Generated files:"
echo "  - update-manifests/update-v$VERSION.json"
echo "  - scripts/sign-update-manifest.sh"
echo "  - scripts/deploy-update-manifest.sh"
echo "  - update-server/nginx.conf"
echo ""
echo "📝 Next steps:"
echo "1. Sign the manifest: ./scripts/sign-update-manifest.sh $VERSION"
echo "2. Deploy the manifest: ./scripts/deploy-update-manifest.sh $VERSION"
echo "3. Update Tauri config with update server URL"
echo "4. Test auto-updater functionality"