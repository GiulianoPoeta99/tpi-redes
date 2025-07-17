# CLI Usage Examples

This document provides examples of how to use the file transfer CLI application.

## Basic Usage

### Sending a File

Send a file to another machine using TCP:
```bash
file-transfer-cli send --target 192.168.1.100 --port 8080 /path/to/file.txt
```

Send a file using UDP:
```bash
file-transfer-cli send --target 192.168.1.100 --port 8080 --protocol udp /path/to/file.txt
```

### Receiving Files

Start a receiver on port 8080 using TCP:
```bash
file-transfer-cli receive --port 8080 --output /path/to/downloads/
```

Start a receiver using UDP:
```bash
file-transfer-cli receive --port 8080 --protocol udp --output /path/to/downloads/
```

## Advanced Options

### Custom Configuration

Send with custom chunk size and timeout:
```bash
file-transfer-cli send \
  --target 192.168.1.100 \
  --port 8080 \
  --chunk-size 16384 \
  --timeout 60 \
  /path/to/large-file.zip
```

Receive with custom timeout:
```bash
file-transfer-cli receive \
  --port 8080 \
  --timeout 120 \
  --output /path/to/downloads/
```

### Verbose and Debug Output

Enable verbose logging:
```bash
file-transfer-cli --verbose send --target 192.168.1.100 /path/to/file.txt
```

Enable debug logging (includes verbose):
```bash
file-transfer-cli --debug send --target 192.168.1.100 /path/to/file.txt
```

## Transfer Management

### List Active Transfers

View all currently active transfers:
```bash
file-transfer-cli list
```

Example output:
```
Active transfers:
ID                                   Status       Progress Speed           Mode
--------------------------------------------------------------------------------
a1b2c3d4-e5f6-7890-abcd-ef1234567890 Transferring      45% 2.3 MB/s        Send
b2c3d4e5-f6g7-8901-bcde-f23456789012 Connecting         0% 0.0 B/s         Receive
```

### Cancel a Transfer

Cancel a specific transfer by ID:
```bash
file-transfer-cli cancel a1b2c3d4-e5f6-7890-abcd-ef1234567890
```

## Protocol Selection

### TCP (Reliable, Connection-oriented)
- Default protocol
- Automatic error recovery
- Best for reliable networks
- Lower overhead for large files

```bash
# Explicit TCP (same as default)
file-transfer-cli send --target 192.168.1.100 --protocol tcp /path/to/file.txt
```

### UDP (Custom Reliability Layer)
- Custom reliability implementation
- Sliding window flow control
- Better for unreliable networks
- More control over retransmission

```bash
file-transfer-cli send --target 192.168.1.100 --protocol udp /path/to/file.txt
```

## Error Handling and Exit Codes

The CLI returns different exit codes based on the result:

- `0`: Success
- `1`: General error (configuration, file not found, transfer failed, etc.)

### Common Error Scenarios

File not found:
```bash
$ file-transfer-cli send --target 192.168.1.100 /nonexistent/file.txt
Error: File does not exist: /nonexistent/file.txt
$ echo $?
1
```

Invalid protocol:
```bash
$ file-transfer-cli send --target 192.168.1.100 --protocol invalid /path/to/file.txt
Error: Invalid protocol 'invalid'. Use 'tcp' or 'udp'
$ echo $?
1
```

Connection timeout:
```bash
$ file-transfer-cli send --target 192.168.1.999 --timeout 5 /path/to/file.txt
Starting file transfer...
  File: file.txt (1024 bytes)
  Target: 192.168.1.999:8080
  Protocol: Tcp
  Timeout: 5s

✗ Transfer failed!
Error: Connection timeout after 5 seconds
$ echo $?
1
```

## Real-time Progress Monitoring

During transfer, the CLI displays real-time progress:

```
Progress:  45% | Speed:   2.3 MB/s | ETA:     12s | Status: Transferring
```

Progress indicators:
- **Progress**: Percentage of file transferred
- **Speed**: Current transfer speed (B/s, KB/s, MB/s, GB/s)
- **ETA**: Estimated time remaining
- **Status**: Current transfer status (Connecting, Transferring, Completed, Error)

## Configuration Examples

### High-Performance Transfer
For large files on fast networks:
```bash
file-transfer-cli send \
  --target 192.168.1.100 \
  --protocol tcp \
  --chunk-size 65536 \
  --timeout 300 \
  /path/to/large-file.iso
```

### Unreliable Network Transfer
For transfers over unreliable networks:
```bash
file-transfer-cli send \
  --target 192.168.1.100 \
  --protocol udp \
  --chunk-size 4096 \
  --timeout 60 \
  /path/to/file.txt
```

### Quick Local Transfer
For transfers on local network:
```bash
file-transfer-cli send \
  --target 127.0.0.1 \
  --port 8080 \
  --chunk-size 32768 \
  /path/to/file.txt
```

## Automation and Scripting

### Batch Transfer Script
```bash
#!/bin/bash

TARGET="192.168.1.100"
PORT="8080"
FILES=("/path/to/file1.txt" "/path/to/file2.txt" "/path/to/file3.txt")

for file in "${FILES[@]}"; do
    echo "Transferring $file..."
    if file-transfer-cli send --target "$TARGET" --port "$PORT" "$file"; then
        echo "✓ Successfully transferred $file"
    else
        echo "✗ Failed to transfer $file"
        exit 1
    fi
done

echo "All files transferred successfully!"
```

### Receiver Service Script
```bash
#!/bin/bash

# Start receiver as a service
DOWNLOAD_DIR="/home/user/downloads"
PORT="8080"

echo "Starting file receiver service..."
echo "Download directory: $DOWNLOAD_DIR"
echo "Port: $PORT"

while true; do
    echo "Waiting for incoming transfers..."
    file-transfer-cli receive --port "$PORT" --output "$DOWNLOAD_DIR"
    
    if [ $? -eq 0 ]; then
        echo "Transfer completed successfully"
    else
        echo "Transfer failed or was cancelled"
    fi
    
    echo "Restarting receiver in 5 seconds..."
    sleep 5
done
```

## Help and Version Information

Get general help:
```bash
file-transfer-cli --help
```

Get help for specific commands:
```bash
file-transfer-cli send --help
file-transfer-cli receive --help
file-transfer-cli list --help
file-transfer-cli cancel --help
```

Check version:
```bash
file-transfer-cli --version
```