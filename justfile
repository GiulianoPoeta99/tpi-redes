# File Transfer App - Build and Development Workflows

# Default recipe - show available commands
default:
    @just --list

# Development commands
dev-backend:
    cd backend && cargo run --bin file-transfer-cli -- --help

dev-frontend:
    cd frontend && npm run dev

dev-tauri:
    cd frontend && cargo tauri dev

# Build commands
build-backend:
    cd backend && cargo build --release

build-frontend:
    cd frontend && npm run build

build-tauri:
    cd frontend && cargo tauri build

build-all: build-backend build-frontend build-tauri

# Test commands
test-backend:
    cd backend && cargo test

test-frontend:
    cd frontend && npm run test

test-all: test-backend test-frontend

# Lint and format commands
lint-backend:
    cd backend && cargo clippy -- -D warnings

lint-frontend:
    cd frontend && npm run lint

format-backend:
    cd backend && cargo fmt

format-frontend:
    cd frontend && npm run format

lint-all: lint-backend lint-frontend
format-all: format-backend format-frontend

# Setup commands
setup-backend:
    cd backend && cargo check

setup-frontend:
    cd frontend && npm install

setup-all: setup-backend setup-frontend

# Clean commands
clean-backend:
    cd backend && cargo clean

clean-frontend:
    cd frontend && npm run clean || rm -rf node_modules .svelte-kit build

clean-all: clean-backend clean-frontend

# CLI usage examples
cli-send file target="127.0.0.1:8080":
    cd backend && cargo run --bin file-transfer-cli -- send --target {{target}} {{file}}

cli-receive port="8080":
    cd backend && cargo run --bin file-transfer-cli -- receive --port {{port}}

# Development utilities
check-deps:
    @echo "Checking Rust dependencies..."
    cd backend && cargo tree
    @echo "Checking Node.js dependencies..."
    cd frontend && npm list

update-deps:
    cd backend && cargo update
    cd frontend && npm update

# Documentation
docs-backend:
    cd backend && cargo doc --open

docs-frontend:
    cd frontend && npm run docs || echo "Frontend docs not configured yet"

# Release preparation
prepare-release version:
    @echo "Preparing release {{version}}..."
    sed -i 's/version = ".*"/version = "{{version}}"/' backend/Cargo.toml
    sed -i 's/"version": ".*"/"version": "{{version}}"/' frontend/package.json
    sed -i 's/"version": ".*"/"version": "{{version}}"/' frontend/src-tauri/tauri.conf.json
    @echo "Version updated to {{version}} in all files"

# Quick development setup
quick-start: setup-all
    @echo "Project setup complete!"
    @echo "Run 'just dev-tauri' to start the desktop app"
    @echo "Run 'just cli-send <file>' to test CLI mode"