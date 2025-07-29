# Build Docker image for file transfer CLI
docker-build:
    USER_ID=$(id -u) GROUP_ID=$(id -g) docker build -f docker/Dockerfile -t file-transfer-cli .

# Build Docker image for lab environment
docker-build-lab:
    USER_ID=$(id -u) GROUP_ID=$(id -g) docker build -f docker/Dockerfile.lab -t file-transfer-cli-lab .

# Start Docker services (receiver + sender)
docker-up:
    USER_ID=$(id -u) GROUP_ID=$(id -g) docker compose up -d

# Stop all Docker services
docker-down:
    docker compose down

# Follow Docker container logs
docker-logs:
    docker compose logs -f

# Open shell in sender container
docker-shell:
    docker compose exec sender /bin/bash

# Test file transfer between Docker containers
docker-test: docker-up
    sleep 3
    docker compose exec sender ft-cli send --target receiver --port 8080 /app/files/hello.txt
    docker compose logs receiver

# Complete Docker environment setup
docker-setup: create-test-files docker-build docker-up
    @echo "Docker setup complete! Use 'just docker-test' to run tests"