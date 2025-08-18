# File Transfer App - Build and Development Workflows

# Default recipe - show available commands
default:
    @just --list

# Development commands
dev-backend:
    cd backend && just dev

dev-frontend:
    cd frontend && npm run dev

dev-tauri:
    cd frontend && cargo tauri dev

# Build commands
build-backend:
    cd backend && just build

build-frontend:
    cd frontend && npm run build

build-tauri:
    cd frontend && cargo tauri build

build-all: build-backend build-frontend build-tauri

# Test commands
test-backend:
    cd backend && just test-all

test-frontend:
    cd frontend && npm run test

test-all: test-backend test-frontend

# Lint and format commands
lint-backend:
    cd backend && just lint

lint-frontend:
    cd frontend && npm run lint

format-backend:
    cd backend && just format

format-frontend:
    cd frontend && npm run format

lint-all: lint-backend lint-frontend
format-all: format-backend format-frontend

# Setup commands
setup-backend:
    cd backend && just check

setup-frontend:
    cd frontend && npm install

setup-all: setup-backend setup-frontend

# Clean commands
clean-backend:
    cd backend && just clean-all

clean-frontend:
    cd frontend && npm run clean || rm -rf node_modules .svelte-kit build

clean-all: clean-backend clean-frontend

# Docker commands
docker-setup:
    cd backend && just docker-setup

docker-test:
    cd backend && just docker-test

docker-up:
    cd backend && just docker-up

docker-down:
    cd backend && just docker-down

# Lab environment commands
lab-setup:
    cd backend && just lab-setup

lab-test:
    cd backend && just lab-test

lab-down:
    cd backend && just lab-down

lab-shell-a:
    cd backend && just lab-shell-a

lab-shell-b:
    cd backend && just lab-shell-b

# CLI usage examples
cli-send file target="127.0.0.1:8080":
    cd backend && just run-sender {{file}} {{target}}

cli-receive port="8080":
    cd backend && just run-receiver {{port}}

# Testing commands
test-real:
    cd backend && just test-real

test-performance:
    cd backend && just test-performance

# Development utilities
check-deps:
    @echo "Checking Rust dependencies..."
    cd backend && just check-deps
    @echo "Checking Node.js dependencies..."
    cd frontend && npm list

update-deps:
    cd backend && just update-deps
    cd frontend && npm update

# Documentation
docs-backend:
    cd backend && just docs

docs-frontend:
    cd frontend && npm run docs || echo "Frontend docs not configured yet"

# Release preparation
prepare-release version:
    @echo "Preparing release {{version}}..."
    ./scripts/prepare-release.sh {{version}}

# Package for all platforms
package-all version:
    @echo "Packaging for all platforms..."
    ./scripts/package-all.sh {{version}}

# Generate update manifest
generate-update-manifest version notes="Bug fixes and performance improvements":
    @echo "Generating update manifest..."
    ./scripts/generate-update-manifest.sh {{version}} "{{notes}}"

# Complete release process (dry run)
release-dry-run version:
    @echo "Running release dry run for {{version}}..."
    ./scripts/prepare-release.sh {{version}} patch true

# Complete release process
release version:
    @echo "Creating release {{version}}..."
    ./scripts/prepare-release.sh {{version}} patch false
    ./scripts/package-all.sh {{version}}
    ./scripts/generate-update-manifest.sh {{version}}
    @echo "Release {{version}} complete! Check dist/ for artifacts."

# Quick development setup
quick-start: setup-all
    @echo "Project setup complete!"
    @echo "Run 'just dev-tauri' to start the desktop app"
    @echo "Run 'just cli-send <file>' to test CLI mode"
    @echo "Run 'just docker-setup' for Docker environment"