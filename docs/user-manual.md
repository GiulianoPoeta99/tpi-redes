# User Manual

Complete guide for using the File Transfer Application in both desktop and command-line modes.

## 📖 Table of Contents

- [Getting Started](#getting-started)
- [Desktop Application](#desktop-application)
- [Command Line Interface](#command-line-interface)
- [Protocol Selection](#protocol-selection)
- [File Management](#file-management)
- [Troubleshooting](#troubleshooting)

## 🚀 Getting Started

### First Launch

1. **Desktop App**: Launch from your applications menu or desktop shortcut
2. **CLI**: Open terminal and run `file-transfer-cli --help`

### Basic Concepts

- **Transmitter**: Sends files to another machine
- **Receiver**: Receives files from another machine
- **TCP**: Reliable protocol with error checking (recommended for important files)
- **UDP**: Fast protocol without guarantees (good for quick transfers)

## 🖥️ Desktop Application

### Main Interface

The desktop application provides an intuitive graphical interface for file transfers.

#### Mode Selection
![Mode Selection Screenshot](screenshots/mode-selection.png)

1. **Transmitter Mode**: Select to send files
   - Choose files to send
   - Configure target IP and port
   - Monitor transfer progress

2. **Receiver Mode**: Select to receive files
   - Set listening port
   - Choose download directory
   - Wait for incoming transfers

### Transmitter Mode Workflow

#### Step 1: Select Transmitter Mode
- Click the "📡 Transmitter" button
- The interface will show file selection and connection options

#### Step 2: Configure Connection
![Connection Configuration](screenshots/connection-config.png)

- **Target IP**: Enter the receiver's IP address (e.g., `192.168.1.100`)
- **Port**: Enter the port number (e.g., `8080`)
- **Protocol**: Choose TCP (reliable) or UDP (fast)

#### Step 3: Select Files
![File Selection](screenshots/file-selection.png)

- **Drag & Drop**: Drag files directly onto the drop zone
- **Browse**: Click "Browse Files" to open file picker
- **Multiple Files**: Select multiple files (if supported)

#### Step 4: Start Transfer
- Click "Start Transfer" button
- Monitor progress in real-time
- View transfer speed and estimated time

#### Step 5: Monitor Progress
![Transfer Progress](screenshots/transfer-progress.png)

- **Progress Bar**: Visual progress indicator
- **Speed**: Current transfer speed (MB/s)
- **ETA**: Estimated time remaining
- **Status**: Current transfer status
- **Cancel**: Stop transfer if needed

### Receiver Mode Workflow

#### Step 1: Select Receiver Mode
- Click the "📥 Receiver" button
- Configure listening settings

#### Step 2: Configure Receiver Settings
![Receiver Configuration](screenshots/receiver-config.png)

- **Port**: Set the port to listen on (e.g., `8080`)
- **Protocol**: Choose TCP or UDP (must match sender)
- **Output Directory**: Choose where to save received files

#### Step 3: Start Listening
- Click "Start Listening"
- The app will wait for incoming connections
- Status will show "Listening on port 8080"

#### Step 4: Receive Files
- When a transfer starts, progress will be displayed
- Files are automatically saved to the output directory
- Notification appears when transfer completes

### Settings and Preferences

#### Application Settings
![Settings Panel](screenshots/settings.png)

- **Theme**: Light, Dark, or System theme
- **Notifications**: Enable/disable system notifications
- **Default Settings**: Set default connection parameters
- **Developer Mode**: Enable detailed logging

#### Connection Defaults
- **Default Port**: Set preferred port number
- **Default Protocol**: Choose TCP or UDP as default
- **Timeout Settings**: Configure connection timeouts
- **Chunk Size**: Advanced users can adjust chunk sizes

### Transfer History

#### Viewing History
![Transfer History](screenshots/transfer-history.png)

- Access via "History" tab or menu
- View all past transfers
- Filter by date, status, or protocol
- Export history to CSV

#### History Details
- **File Information**: Name, size, checksum
- **Transfer Details**: Protocol, speed, duration
- **Status**: Success, failed, or cancelled
- **Error Information**: Details if transfer failed

## 💻 Command Line Interface

### Basic Usage

#### Getting Help
```bash
# General help
file-transfer-cli --help

# Command-specific help
file-transfer-cli send --help
file-transfer-cli receive --help
```

#### Version Information
```bash
file-transfer-cli --version
```

### Sending Files

#### Basic Send Command
```bash
# Send file using TCP (default)
file-transfer-cli send --target 192.168.1.100 --port 8080 myfile.txt

# Send using UDP
file-transfer-cli send --target 192.168.1.100 --port 8080 --protocol udp myfile.txt
```

#### Advanced Send Options
```bash
# With custom settings
file-transfer-cli send \
  --target 192.168.1.100 \
  --port 8080 \
  --protocol tcp \
  --chunk-size 16384 \
  --timeout 60 \
  --verbose \
  largefile.bin
```

#### Send Command Options
- `--target <IP>`: Target IP address (required)
- `--port <PORT>`: Target port number (required)
- `--protocol <tcp|udp>`: Protocol to use (default: tcp)
- `--chunk-size <SIZE>`: Chunk size in bytes
- `--timeout <SECONDS>`: Connection timeout
- `--verbose`: Enable verbose output
- `--debug`: Enable debug logging

### Receiving Files

#### Basic Receive Command
```bash
# Receive files on port 8080
file-transfer-cli receive --port 8080 --output ./downloads/

# Receive using UDP
file-transfer-cli receive --port 8080 --protocol udp --output ./downloads/
```

#### Advanced Receive Options
```bash
# With custom settings
file-transfer-cli receive \
  --port 8080 \
  --protocol tcp \
  --output ./received-files/ \
  --timeout 120 \
  --verbose
```

#### Receive Command Options
- `--port <PORT>`: Port to listen on (required)
- `--output <DIR>`: Output directory (required)
- `--protocol <tcp|udp>`: Protocol to use (default: tcp)
- `--timeout <SECONDS>`: Receive timeout
- `--verbose`: Enable verbose output
- `--debug`: Enable debug logging

### Transfer Management

#### List Active Transfers
```bash
file-transfer-cli list
```

#### Cancel Transfer
```bash
file-transfer-cli cancel <transfer-id>
```

### Logging and Debugging

#### Verbose Mode
```bash
# Show detailed progress information
file-transfer-cli --verbose send --target 192.168.1.100 myfile.txt
```

#### Debug Mode
```bash
# Show all debug information
file-transfer-cli --debug send --target 192.168.1.100 myfile.txt
```

#### Log Levels
- **Normal**: Basic progress and status
- **Verbose** (`--verbose`): Detailed operation info
- **Debug** (`--debug`): Complete debugging information

## 🌐 Protocol Selection

### TCP (Transmission Control Protocol)

#### When to Use TCP
- **Important Files**: Documents, code, databases
- **Reliability Required**: When data integrity is critical
- **Stable Networks**: Good network connections
- **Large Files**: Better efficiency for big files

#### TCP Characteristics
- ✅ **Reliable**: Guarantees data delivery
- ✅ **Error Checking**: Automatic error detection and correction
- ✅ **Ordered Delivery**: Data arrives in correct order
- ❌ **Slower**: More overhead due to reliability features
- ❌ **Connection Required**: Receiver must be listening

#### TCP Example
```bash
# Sender
file-transfer-cli send --target 192.168.1.100 --port 8080 --protocol tcp important-document.pdf

# Receiver (must be started first)
file-transfer-cli receive --port 8080 --protocol tcp --output ./downloads/
```

### UDP (User Datagram Protocol - Fire-and-Forget)

#### When to Use UDP
- **Quick Transfers**: When speed is more important than reliability
- **Non-Critical Files**: Temporary files, logs, media
- **Unreliable Networks**: When connections are unstable
- **Small Files**: Efficient for smaller transfers

#### UDP Characteristics
- ✅ **Fast**: Minimal overhead
- ✅ **No Connection Required**: Can send without receiver
- ✅ **Simple**: Straightforward fire-and-forget operation
- ❌ **Unreliable**: No guarantee of delivery
- ❌ **No Error Checking**: Data may be corrupted or lost
- ❌ **Unordered**: Data may arrive out of order

#### UDP Example
```bash
# Sender (can run without receiver)
file-transfer-cli send --target 192.168.1.100 --port 8080 --protocol udp quick-file.txt

# Receiver (optional - may miss data if not running)
file-transfer-cli receive --port 8080 --protocol udp --output ./downloads/ --timeout 30
```

### Protocol Comparison

| Feature | TCP | UDP |
|---------|-----|-----|
| **Reliability** | Guaranteed | Best effort |
| **Speed** | Moderate | Fast |
| **Connection** | Required | Optional |
| **Error Checking** | Yes | No |
| **Use Case** | Important files | Quick transfers |
| **Chunk Size** | 8KB (default) | 1KB (default) |

## 📁 File Management

### Supported File Types
- **All file types supported**: Documents, images, videos, executables, archives
- **No size limits**: Limited only by available disk space
- **Binary files**: Full support for binary data

### File Integrity

#### TCP Integrity Checking
- **SHA-256 Checksums**: Automatic integrity verification
- **Error Detection**: Corrupted files are detected and reported
- **Retry Logic**: Failed chunks are automatically retransmitted

#### UDP Fire-and-Forget
- **No Integrity Checking**: Files may be incomplete or corrupted
- **Fast Transfer**: No verification overhead
- **Use with Caution**: Only for non-critical files

### File Naming

#### Received Files
- **TCP**: Original filename preserved
- **UDP**: May include timestamp (e.g., `file_20240315_143022.txt`)

#### Duplicate Handling
- **Automatic Renaming**: Duplicates get numbered suffixes
- **Overwrite Protection**: Existing files are never overwritten
- **Timestamp Suffixes**: Clear identification of received files

## 🔧 Advanced Features

### Network Configuration

#### Finding Your IP Address
```bash
# Linux/macOS
ip addr show | grep "inet " | grep -v 127.0.0.1

# Windows
ipconfig | findstr "IPv4"

# Or use the desktop app's network info display
```

#### Port Selection
- **Default Ports**: 8080 (TCP), 8081 (UDP)
- **Custom Ports**: Any available port 1024-65535
- **Firewall**: Ensure ports are open in firewall

#### Network Troubleshooting
```bash
# Test connectivity
ping <target-ip>

# Test port availability
telnet <target-ip> <port>

# Check if port is in use
netstat -tulpn | grep <port>
```

### Performance Tuning

#### Chunk Size Optimization
```bash
# Large files, fast network
--chunk-size 32768

# Small files, slow network
--chunk-size 4096

# Default (recommended)
--chunk-size 8192  # TCP
--chunk-size 1024  # UDP
```

#### Timeout Configuration
```bash
# Fast local network
--timeout 30

# Slow or unreliable network
--timeout 120

# Very slow network
--timeout 300
```

### Automation and Scripting

#### Batch Operations
```bash
#!/bin/bash
# Send multiple files
for file in *.txt; do
    file-transfer-cli send --target 192.168.1.100 --port 8080 "$file"
done
```

#### Scheduled Transfers
```bash
# Cron job example (Linux/macOS)
# Send daily backup at 2 AM
0 2 * * * /usr/local/bin/file-transfer-cli send --target backup-server backup.tar.gz
```

#### Exit Codes
- `0`: Success
- `1`: Transfer failed
- `2`: File system error
- `3`: Invalid arguments
- `4`: Configuration error
- `5`: Network error

## 🚨 Troubleshooting

### Common Issues

#### "Connection refused"
**Problem**: Cannot connect to receiver
**Solutions**:
1. Ensure receiver is running and listening
2. Check IP address and port number
3. Verify firewall settings
4. Test network connectivity with `ping`

#### "File not found"
**Problem**: Cannot find file to send
**Solutions**:
1. Check file path and spelling
2. Use absolute path: `/full/path/to/file.txt`
3. Verify file permissions
4. Ensure file exists: `ls -la filename`

#### "Permission denied"
**Problem**: Cannot write to output directory
**Solutions**:
1. Check directory permissions: `ls -ld directory/`
2. Create directory: `mkdir -p downloads/`
3. Change permissions: `chmod 755 downloads/`

#### "Transfer incomplete" (UDP)
**Problem**: UDP transfer seems incomplete
**Solutions**:
1. This is normal for UDP (fire-and-forget)
2. Use TCP for reliable transfers
3. Check if any data was received
4. Increase timeout for UDP receiver

#### "Checksum mismatch" (TCP)
**Problem**: File integrity check failed
**Solutions**:
1. Retry the transfer
2. Check network stability
3. Try smaller chunk size
4. Verify source file is not corrupted

### Performance Issues

#### Slow Transfer Speed
**Solutions**:
1. Increase chunk size: `--chunk-size 32768`
2. Check network bandwidth
3. Use TCP for large files
4. Reduce other network activity

#### High CPU Usage
**Solutions**:
1. Reduce chunk size
2. Lower transfer concurrency
3. Check for other running processes
4. Use UDP for less CPU overhead

### Network Issues

#### Firewall Blocking
**Windows**:
1. Windows Defender Firewall → Allow an app
2. Add file-transfer-cli to exceptions

**Linux**:
```bash
# UFW
sudo ufw allow 8080

# iptables
sudo iptables -A INPUT -p tcp --dport 8080 -j ACCEPT
```

**macOS**:
1. System Preferences → Security & Privacy → Firewall
2. Add application to allowed list

#### NAT/Router Issues
1. Port forwarding may be required
2. Use local IP addresses for LAN transfers
3. Consider VPN for remote transfers

### Getting Help

#### Debug Information
```bash
# Collect debug info
file-transfer-cli --debug send --target IP file.txt > debug.log 2>&1
```

#### System Information
```bash
# System details for bug reports
uname -a                    # System info
file-transfer-cli --version # App version
ip addr show               # Network config
```

#### Support Resources
1. **Documentation**: Check other guides in `docs/`
2. **GitHub Issues**: Search existing issues
3. **Debug Logs**: Always include with bug reports
4. **Network Details**: Include IP addresses and ports (anonymized)

## 📚 Additional Resources

- [Installation Guide](installation.md) - Setup instructions
- [Architecture Overview](architecture.md) - Technical details
- [API Reference](api-reference.md) - Developer documentation
- [Troubleshooting Guide](troubleshooting.md) - Detailed problem solving

## 🔄 Updates and Feedback

### Staying Updated
- **Desktop App**: Auto-updater will notify of new versions
- **CLI**: Check GitHub releases for updates
- **Documentation**: Always refer to latest version

### Providing Feedback
- **Bug Reports**: Use GitHub Issues with debug logs
- **Feature Requests**: GitHub Discussions
- **Documentation**: Suggest improvements via Issues

---

*This manual covers version 1.0.0 of the File Transfer Application. For the latest updates, check the project repository.*