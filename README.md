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

## Project Structure

```
tpi-redes/
├── backend/           # Rust library + CLI
│   ├── src/
│   │   ├── main.rs    # CLI entry point
│   │   ├── lib.rs     # Library exports for Tauri
│   │   ├── config/    # Configuration management
│   │   ├── sockets/   # TCP/UDP implementations
│   │   ├── transfer/  # File transfer logic
│   │   ├── crypto/    # Checksums and encryption
│   │   └── utils/     # Logging, errors, events
│   └── Cargo.toml
├── frontend/          # Svelte + Tauri
│   ├── src/           # Frontend Svelte code
│   ├── src-tauri/     # Tauri wrapper
│   └── package.json
├── justfile           # Build automation
└── README.md
```

## Development Setup

### Prerequisites

- Rust (latest stable)
- Node.js (18+)
- Just command runner: `cargo install just`

### Quick Start

```bash
# Setup all dependencies
just setup-all

# Start desktop development
just dev-tauri

# Or test CLI mode
just cli-send test.txt
just cli-receive
```

### Available Commands

```bash
# Development
just dev-backend      # Run backend CLI
just dev-frontend     # Run frontend dev server
just dev-tauri        # Run Tauri desktop app

# Building
just build-all        # Build everything
just build-backend    # Build Rust backend
just build-frontend   # Build Svelte frontend
just build-tauri      # Build Tauri desktop app

# Testing
just test-all         # Run all tests
just test-backend     # Run Rust tests
just test-frontend    # Run frontend tests

# Maintenance
just lint-all         # Lint all code
just format-all       # Format all code
just clean-all        # Clean build artifacts
```

## Usage

### Desktop Application

1. Launch the application
2. Select Transmitter or Receiver mode
3. Configure network settings (IP, port, protocol)
4. For Transmitter: Select files to send
5. For Receiver: Set output directory and start listening
6. Monitor transfer progress in real-time

### Command Line Interface

#### Send a file:
```bash
cargo run --bin file-transfer-cli -- send --target 192.168.1.100:8080 --protocol tcp myfile.txt
```

#### Receive files:
```bash
cargo run --bin file-transfer-cli -- receive --port 8080 --protocol tcp --output ./downloads
```

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

## Contributing

1. Follow the task-based implementation plan in `.kiro/specs/`
2. Run tests before submitting changes: `just test-all`
3. Format code: `just format-all`
4. Ensure all lints pass: `just lint-all`

## License

This project is part of a university assignment for network programming.