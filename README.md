# File Transfer Application

A socket-based file transfer application built with Rust backend and Svelte + Tauri frontend, supporting both TCP and UDP protocols with integrity verification.

## Features

- **Dual Mode Operation**: Transmitter and Receiver modes
- **Protocol Support**: TCP (reliable) and UDP (with custom reliability layer)
- **File Integrity**: SHA-256 checksum verification
- **Real-time Progress**: Live transfer monitoring with speed and ETA
- **Cross-platform**: Desktop application for Windows, macOS, and Linux
- **CLI Interface**: Command-line tool for automation and scripting
- **Modern UI**: Intuitive interface with drag-and-drop file selection
- **Docker Support**: Containerized deployment and testing

## Project Structure

```
tpi-redes/
├── backend/           # Rust CLI + Library
│   ├── src/           # Source code
│   ├── tests/         # Integration tests
│   ├── docker/        # Docker files and volumes
│   ├── compose.yaml   # Docker Compose
│   ├── justfile       # Backend-specific commands
│   └── README.md      # 📖 Detailed backend documentation
├── frontend/          # Svelte + Tauri desktop app
│   ├── src/           # Frontend Svelte code
│   ├── src-tauri/     # Tauri wrapper
│   └── package.json
├── docs/              # Project documentation
│   ├── README.md      # Documentation index
│   └── ...            # Guides and references
├── justfile           # Main project commands
└── README.md          # This file
```

## Quick Start

### Prerequisites

- Rust (latest stable)
- Node.js (18+)
- Just command runner: `cargo install just`
- Docker (optional, for containerized testing)

### 🚀 Get Started in 30 Seconds

```bash
# Setup everything
just setup-all

# Option 1: Desktop App
just dev-tauri

# Option 2: CLI Testing
just cli-receive 8080        # Terminal 1
just cli-send test.txt       # Terminal 2

# Option 3: Docker Environment
just docker-setup
just docker-test
```

### Main Commands

```bash
# Development
just dev-tauri        # Desktop app development
just dev-backend      # Backend CLI development

# Testing
just test-all         # All tests
just test-real        # Real file transfer tests
just docker-test      # Docker-based tests

# Building
just build-all        # Build everything
just clean-all        # Clean all artifacts

# Docker
just docker-setup     # Complete Docker setup
just docker-up        # Start Docker services
just docker-down      # Stop Docker services
```

> 📖 **For detailed backend usage, Docker setup, testing guides, and troubleshooting, see [`backend/README.md`](backend/README.md)**

## Usage

### Desktop Application

1. Launch the application: `just dev-tauri`
2. Select Transmitter or Receiver mode
3. Configure network settings (IP, port, protocol)
4. For Transmitter: Select files to send
5. For Receiver: Set output directory and start listening
6. Monitor transfer progress in real-time

### Command Line Interface

#### Quick CLI Usage:
```bash
# Receiver (Terminal 1)
just cli-receive 8080

# Sender (Terminal 2)
just cli-send myfile.txt 192.168.1.100:8080
```

#### Direct CLI Usage:
```bash
# Send a file
cd backend
cargo run --bin file-transfer-cli -- send --target 192.168.1.100 --port 8080 myfile.txt

# Receive files
cargo run --bin file-transfer-cli -- receive --port 8080 --output ./downloads
```

### Docker Usage

```bash
# Complete setup and testing
just docker-setup
just docker-test

# Manual Docker usage
cd backend
docker compose up -d
docker compose exec sender ft-cli send --target receiver --port 8080 /app/files/test.txt
```

> 📖 **For comprehensive usage examples, advanced configuration, and troubleshooting, see [`backend/README.md`](backend/README.md)**

## Implementation Status

This project follows a spec-driven development approach. Current implementation status:

- [x] **Task 1**: Project structure and configuration ✅
- [ ] **Task 2**: Core data types and configuration system
- [ ] **Task 3**: Error handling and logging infrastructure
- [ ] **Task 4**: File operations and checksum calculation
- [ ] **Task 5**: TCP socket implementation
- [ ] **Task 6**: UDP socket implementation with reliability
- [ ] **Task 7**: Transfer orchestration and progress tracking
- [ ] **Task 8**: CLI interface
- [ ] **Task 9**: Tauri command interface
- [ ] **Task 10-20**: Frontend UI components and features

See `.kiro/specs/file-transfer-app/tasks.md` for detailed implementation plan.

## Architecture

The application uses a hybrid architecture:

- **Backend (Rust)**: Core transfer logic, socket operations, file handling
- **Frontend (Svelte + Tauri)**: User interface, desktop integration
- **CLI (Rust)**: Command-line interface for automation

The backend is designed as a library that can be used by both the CLI and the Tauri desktop application.

## Documentation

- **[`backend/README.md`](backend/README.md)** - Complete backend documentation, CLI usage, Docker setup, testing guides
- **[`docs/`](docs/)** - Additional documentation and guides
- **[`.kiro/specs/`](.kiro/specs/)** - Implementation specifications and task tracking

## Contributing

1. Follow the task-based implementation plan in `.kiro/specs/`
2. Run tests before submitting changes: `just test-all`
3. Format code: `just format-all`
4. Ensure all lints pass: `just lint-all`

## License

This project is part of a university assignment for network programming.