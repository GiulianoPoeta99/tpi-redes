#!/bin/bash
# Complete release preparation script for File Transfer Application

set -e

VERSION=$1
RELEASE_TYPE=${2:-"patch"}  # patch, minor, major
DRY_RUN=${3:-"false"}

if [ -z "$VERSION" ]; then
    echo "Usage: $0 <version> [release_type] [dry_run]"
    echo "Example: $0 1.0.0 minor false"
    exit 1
fi

echo "🚀 Preparing release $VERSION (type: $RELEASE_TYPE, dry_run: $DRY_RUN)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if we're in the right directory
if [ ! -f "justfile" ] || [ ! -d "backend" ] || [ ! -d "frontend" ]; then
    log_error "This script must be run from the project root directory"
    exit 1
fi

# Check if git is clean
if [ "$DRY_RUN" = "false" ]; then
    if ! git diff-index --quiet HEAD --; then
        log_error "Git working directory is not clean. Please commit or stash changes."
        exit 1
    fi
fi

# Validate version format
if ! echo "$VERSION" | grep -qE '^[0-9]+\.[0-9]+\.[0-9]+$'; then
    log_error "Version must be in format X.Y.Z (e.g., 1.0.0)"
    exit 1
fi

log_info "Starting release preparation for version $VERSION..."

# 1. Update version numbers
log_info "Updating version numbers..."

if [ "$DRY_RUN" = "false" ]; then
    # Update backend Cargo.toml
    sed -i.bak "s/^version = \".*\"/version = \"$VERSION\"/" backend/Cargo.toml
    
    # Update frontend package.json
    sed -i.bak "s/\"version\": \".*\"/\"version\": \"$VERSION\"/" frontend/package.json
    
    # Update Tauri config
    sed -i.bak "s/\"version\": \".*\"/\"version\": \"$VERSION\"/" frontend/src-tauri/tauri.conf.json
    
    # Clean up backup files
    find . -name "*.bak" -delete
    
    log_success "Version numbers updated to $VERSION"
else
    log_info "DRY RUN: Would update version numbers to $VERSION"
fi

# 2. Update dependencies
log_info "Checking and updating dependencies..."

if [ "$DRY_RUN" = "false" ]; then
    # Update Rust dependencies
    cd backend
    cargo update
    cd ..
    
    # Update Node.js dependencies
    cd frontend
    npm update
    cd ..
    
    log_success "Dependencies updated"
else
    log_info "DRY RUN: Would update dependencies"
fi

# 3. Run security audit
log_info "Running security audit..."

if [ "$DRY_RUN" = "false" ]; then
    # Rust security audit
    cd backend
    if command -v cargo-audit >/dev/null 2>&1; then
        cargo audit
    else
        log_warning "cargo-audit not installed. Install with: cargo install cargo-audit"
    fi
    cd ..
    
    # Node.js security audit
    cd frontend
    npm audit --audit-level moderate
    cd ..
    
    log_success "Security audit completed"
else
    log_info "DRY RUN: Would run security audit"
fi

# 4. Run all tests
log_info "Running comprehensive test suite..."

if [ "$DRY_RUN" = "false" ]; then
    # Backend tests
    cd backend
    cargo test --release
    cd ..
    
    # Frontend tests
    cd frontend
    npm test
    cd ..
    
    # Integration tests
    just test-all
    
    log_success "All tests passed"
else
    log_info "DRY RUN: Would run all tests"
fi

# 5. Code quality checks
log_info "Running code quality checks..."

if [ "$DRY_RUN" = "false" ]; then
    # Rust formatting and linting
    cd backend
    cargo fmt --check
    cargo clippy -- -D warnings
    cd ..
    
    # Frontend formatting and linting
    cd frontend
    npm run format
    npm run lint
    cd ..
    
    log_success "Code quality checks passed"
else
    log_info "DRY RUN: Would run code quality checks"
fi

# 6. Build release artifacts
log_info "Building release artifacts..."

if [ "$DRY_RUN" = "false" ]; then
    # Clean previous builds
    just clean-all
    
    # Build everything
    just build-all
    
    # Verify builds
    if [ -f "backend/target/release/file-transfer-cli" ]; then
        backend/target/release/file-transfer-cli --version
    else
        log_error "Backend CLI build failed"
        exit 1
    fi
    
    log_success "Release artifacts built successfully"
else
    log_info "DRY RUN: Would build release artifacts"
fi

# 7. Generate documentation
log_info "Generating documentation..."

if [ "$DRY_RUN" = "false" ]; then
    # Generate Rust documentation
    cd backend
    cargo doc --no-deps --release
    cd ..
    
    # Generate frontend documentation (if configured)
    cd frontend
    if npm run docs >/dev/null 2>&1; then
        npm run docs
    fi
    cd ..
    
    log_success "Documentation generated"
else
    log_info "DRY RUN: Would generate documentation"
fi

# 8. Update CHANGELOG.md
log_info "Updating CHANGELOG.md..."

if [ "$DRY_RUN" = "false" ]; then
    # Create CHANGELOG.md if it doesn't exist
    if [ ! -f "CHANGELOG.md" ]; then
        cat > CHANGELOG.md << EOF
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [$VERSION] - $(date +%Y-%m-%d)

### Added
- Initial release of File Transfer Application
- TCP and UDP protocol support
- Real-time progress monitoring
- Cross-platform desktop application
- Command-line interface
- File integrity verification with SHA-256 checksums

### Changed
- N/A (initial release)

### Deprecated
- N/A (initial release)

### Removed
- N/A (initial release)

### Fixed
- N/A (initial release)

### Security
- N/A (initial release)
EOF
    else
        # Add new version entry to existing CHANGELOG.md
        sed -i.bak "s/## \[Unreleased\]/## [Unreleased]\n\n## [$VERSION] - $(date +%Y-%m-%d)\n\n### Added\n- Release $VERSION\n\n### Changed\n- Performance improvements and bug fixes/" CHANGELOG.md
        rm CHANGELOG.md.bak
    fi
    
    log_success "CHANGELOG.md updated"
else
    log_info "DRY RUN: Would update CHANGELOG.md"
fi

# 9. Create git tag
log_info "Creating git tag..."

if [ "$DRY_RUN" = "false" ]; then
    # Commit version changes
    git add .
    git commit -m "chore: bump version to $VERSION"
    
    # Create and push tag
    git tag -a "v$VERSION" -m "Release version $VERSION"
    
    log_success "Git tag v$VERSION created"
else
    log_info "DRY RUN: Would create git tag v$VERSION"
fi

# 10. Generate release notes
log_info "Generating release notes..."

RELEASE_NOTES_FILE="release-notes-v$VERSION.md"

if [ "$DRY_RUN" = "false" ]; then
    cat > "$RELEASE_NOTES_FILE" << EOF
# File Transfer App v$VERSION

Released: $(date +%Y-%m-%d)

## 🎉 New Features
- Cross-platform file transfer application
- TCP and UDP protocol support
- Real-time progress monitoring with speed and ETA
- Desktop GUI application built with Tauri and Svelte
- Command-line interface for automation and scripting
- File integrity verification using SHA-256 checksums

## 🔧 Technical Improvements
- Memory-efficient streaming file processing
- Robust error handling and recovery
- Comprehensive logging and debugging support
- Docker containerization support
- Auto-updater functionality

## 📦 Installation

### Windows
\`\`\`bash
# Via Chocolatey
choco install file-transfer-app

# Direct download
# Download from GitHub Releases
\`\`\`

### macOS
\`\`\`bash
# Via Homebrew
brew install file-transfer-app

# Direct download
# Download from GitHub Releases
\`\`\`

### Linux
\`\`\`bash
# Via Snap
sudo snap install file-transfer-app

# Via APT (Ubuntu/Debian)
sudo apt install ./file-transfer-app.deb

# Via DNF (Fedora)
sudo dnf install ./file-transfer-app.rpm

# AppImage
chmod +x file-transfer-app.AppImage
./file-transfer-app.AppImage
\`\`\`

## 🔄 Usage

### Desktop Application
1. Launch the application
2. Select Transmitter or Receiver mode
3. Configure network settings (IP, port, protocol)
4. Select files to transfer or set output directory
5. Monitor transfer progress in real-time

### Command Line Interface
\`\`\`bash
# Send a file
file-transfer-cli send --target 192.168.1.100 --port 8080 myfile.txt

# Receive files
file-transfer-cli receive --port 8080 --output ./downloads/
\`\`\`

## 📚 Documentation
- [User Manual](docs/user-manual.md)
- [Installation Guide](docs/installation.md)
- [API Reference](docs/api-reference.md)
- [Architecture Overview](docs/architecture.md)

## 🙏 Contributors
- File Transfer Team

## 📞 Support
- GitHub Issues: https://github.com/your-org/file-transfer-app/issues
- Documentation: https://github.com/your-org/file-transfer-app/tree/main/docs
- Discussions: https://github.com/your-org/file-transfer-app/discussions

---

**Full Changelog**: https://github.com/your-org/file-transfer-app/compare/v0.1.0...v$VERSION
EOF
    
    log_success "Release notes generated: $RELEASE_NOTES_FILE"
else
    log_info "DRY RUN: Would generate release notes"
fi

# 11. Prepare packaging
log_info "Preparing for packaging..."

if [ "$DRY_RUN" = "false" ]; then
    # Make packaging scripts executable
    chmod +x scripts/package-*.sh
    chmod +x scripts/generate-update-manifest.sh
    
    log_success "Packaging scripts prepared"
else
    log_info "DRY RUN: Would prepare packaging scripts"
fi

# 12. Final verification
log_info "Running final verification..."

if [ "$DRY_RUN" = "false" ]; then
    # Verify version consistency
    BACKEND_VERSION=$(grep '^version = ' backend/Cargo.toml | sed 's/version = "\(.*\)"/\1/')
    FRONTEND_VERSION=$(grep '"version":' frontend/package.json | sed 's/.*"version": "\(.*\)".*/\1/')
    TAURI_VERSION=$(grep '"version":' frontend/src-tauri/tauri.conf.json | sed 's/.*"version": "\(.*\)".*/\1/')
    
    if [ "$BACKEND_VERSION" != "$VERSION" ] || [ "$FRONTEND_VERSION" != "$VERSION" ] || [ "$TAURI_VERSION" != "$VERSION" ]; then
        log_error "Version mismatch detected:"
        log_error "  Backend: $BACKEND_VERSION"
        log_error "  Frontend: $FRONTEND_VERSION"
        log_error "  Tauri: $TAURI_VERSION"
        log_error "  Expected: $VERSION"
        exit 1
    fi
    
    # Verify builds work
    if ! backend/target/release/file-transfer-cli --version | grep -q "$VERSION"; then
        log_error "Backend CLI version mismatch"
        exit 1
    fi
    
    log_success "Final verification passed"
else
    log_info "DRY RUN: Would run final verification"
fi

# Summary
echo ""
log_success "🎉 Release preparation completed successfully!"
echo ""
log_info "📋 Summary:"
log_info "  Version: $VERSION"
log_info "  Release type: $RELEASE_TYPE"
log_info "  Dry run: $DRY_RUN"
echo ""

if [ "$DRY_RUN" = "false" ]; then
    log_info "📝 Next steps:"
    log_info "  1. Review changes: git log --oneline -10"
    log_info "  2. Push changes: git push origin main --tags"
    log_info "  3. Create packages: ./scripts/package-all.sh $VERSION"
    log_info "  4. Create GitHub release with generated notes"
    log_info "  5. Deploy to package repositories"
    log_info "  6. Update auto-updater manifest"
    echo ""
    log_info "📁 Generated files:"
    log_info "  - $RELEASE_NOTES_FILE"
    log_info "  - Updated CHANGELOG.md"
    log_info "  - Git tag: v$VERSION"
else
    log_info "🔍 This was a dry run. No changes were made."
    log_info "Run without 'true' as third parameter to execute changes."
fi

echo ""
log_success "Release $VERSION is ready! 🚀"