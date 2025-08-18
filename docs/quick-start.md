# Quick Start Guide

Get up and running with the File Transfer Application in minutes.

## 🚀 30-Second Setup

### Option 1: Desktop Application (Recommended)
```bash
# Clone and setup
git clone https://github.com/your-org/file-transfer-app.git
cd file-transfer-app
just setup-all

# Launch desktop app
just dev-tauri
```

### Option 2: Command Line Interface
```bash
# Setup and build
just setup-all
just build-backend

# Terminal 1 (Receiver)
just cli-receive 8080

# Terminal 2 (Sender)
echo "Hello World!" > test.txt
just cli-send test.txt 127.0.0.1:8080
```

### Option 3: Docker Environment
```bash
# Complete Docker setup
just docker-setup

# Run automated tests
just docker-test
```

## 📱 First Transfer

### Using Desktop App
1. **Launch**: Run `just dev-tauri`
2. **Select Mode**: Choose "Transmitter" or "Receiver"
3. **Configure**: Set IP address and port (default: 8080)
4. **Transfer**: 
   - **Transmitter**: Drag & drop files or click "Browse"
   - **Receiver**: Click "Start Listening"
5. **Monitor**: Watch real-time progress

### Using CLI
```bash
# Start receiver (Terminal 1)
cd backend
cargo run --bin file-transfer-cli -- receive --port 8080 --output ./downloads

# Send file (Terminal 2)
cargo run --bin file-transfer-cli -- send --target 127.0.0.1 --port 8080 myfile.txt
```

## 🌐 Protocol Selection

### TCP (Reliable) - Default
- **Use for**: Important files, documents, code
- **Features**: Error checking, guaranteed delivery
- **Command**: `--protocol tcp` (default)

### UDP (Fast)
- **Use for**: Quick transfers, non-critical files
- **Features**: Fire-and-forget, no guarantees
- **Command**: `--protocol udp`

## 🔧 Common Commands

```bash
# Development
just dev-tauri          # Desktop app development
just dev-backend         # Backend CLI development

# Building
just build-all           # Build everything
just test-all           # Run all tests

# Docker
just docker-setup       # Setup Docker environment
just lab-test           # Run lab tests

# CLI shortcuts
just cli-send file.txt   # Send file to localhost:8080
just cli-receive 8080    # Receive on port 8080
```

## 🚨 Troubleshooting

### "Connection refused"
- Ensure receiver is running first (TCP only)
- Check IP address and port
- Verify firewall settings

### "File not found"
- Use absolute path: `/full/path/to/file.txt`
- Check file permissions
- Verify file exists: `ls -la filename`

### "Permission denied"
- Create output directory: `mkdir -p downloads`
- Check directory permissions: `chmod 755 downloads`

## 📚 Next Steps

- **Full Documentation**: [User Manual](user-manual.md)
- **Installation**: [Installation Guide](installation.md)
- **Development**: [Development Guide](development.md)
- **API Reference**: [API Documentation](api-reference.md)

## 💡 Tips

- **Large Files**: Use TCP with larger chunk sizes
- **Fast Networks**: Increase chunk size to 32KB
- **Slow Networks**: Use smaller timeouts and chunk sizes
- **Automation**: Use CLI in scripts and cron jobs
- **Testing**: Use Docker lab for isolated testing

---

*Need help? Check the [Troubleshooting Guide](troubleshooting.md) or create an issue on GitHub.*