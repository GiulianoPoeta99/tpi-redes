# Root Justfile

default:
    @just --list

# --- Backend Commands ---

run-backend:
    cd backend && just run

test-backend:
    cd backend && just test

lint-backend:
    cd backend && just lint

format-backend:
    cd backend && just format

# --- Frontend Commands ---

run-frontend:
    cd frontend && npm run dev:electron

build-frontend:
    cd frontend && npm run build

test-frontend:
    cd frontend && npm run test

lint-frontend:
    cd frontend && npm run lint

format-frontend:
    cd frontend && npm run format

# --- Global Commands ---

test-all: test-backend test-frontend

lint-all: lint-backend lint-frontend

format-all: format-backend format-frontend
