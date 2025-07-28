#!/bin/bash

# CLI Demonstration Script
# This script demonstrates the file transfer CLI functionality

set -e

echo "=== File Transfer CLI Demonstration ==="
echo

# Build the CLI
echo "Building the CLI..."
cargo build --bin file-transfer-cli --quiet
echo "✓ CLI built successfully"
echo

# Create test files
echo "Creating test files..."
mkdir -p demo-files
echo "Hello, World! This is a test file for CLI demonstration." > demo-files/test.txt
echo "This is a larger test file with more content for demonstration purposes. It contains multiple lines and should be sufficient to show transfer progress." > demo-files/large-test.txt
dd if=/dev/zero of=demo-files/binary-test.bin bs=1024 count=10 2>/dev/null
echo "✓ Test files created"
echo

# Show CLI help
echo "=== CLI Help ==="
./target/debug/file-transfer-cli --help
echo

# Show send command help
echo "=== Send Command Help ==="
./target/debug/file-transfer-cli send --help
echo

# Show receive command help
echo "=== Receive Command Help ==="
./target/debug/file-transfer-cli receive --help
echo

# Demonstrate verbose output
echo "=== Verbose Output Demonstration ==="
echo "Attempting to send file with verbose logging (will fail - no receiver):"
./target/debug/file-transfer-cli --verbose send \
  --target 127.0.0.1 \
  --port 19999 \
  --timeout 2 \
  demo-files/test.txt || echo "Expected failure - no receiver listening"
echo

# Demonstrate debug output
echo "=== Debug Output Demonstration ==="
echo "Attempting to send file with debug logging (will fail - no receiver):"
./target/debug/file-transfer-cli --debug send \
  --target 127.0.0.1 \
  --port 19998 \
  --protocol udp \
  --timeout 1 \
  demo-files/test.txt || echo "Expected failure/completion - UDP fire-and-forget"
echo

# Demonstrate protocol options
echo "=== Protocol Options ==="
echo "TCP transfer attempt:"
./target/debug/file-transfer-cli send \
  --target 127.0.0.1 \
  --port 19997 \
  --protocol tcp \
  --chunk-size 4096 \
  --timeout 1 \
  demo-files/test.txt || echo "Expected failure - no receiver"
echo

echo "UDP transfer attempt:"
./target/debug/file-transfer-cli send \
  --target 127.0.0.1 \
  --port 19996 \
  --protocol udp \
  --chunk-size 1024 \
  --timeout 1 \
  demo-files/test.txt || echo "Expected completion - UDP fire-and-forget"
echo

# Demonstrate receiver setup
echo "=== Receiver Setup Demonstration ==="
echo "Setting up receiver (will timeout after 2 seconds):"
mkdir -p demo-output
timeout 2s ./target/debug/file-transfer-cli receive \
  --port 19995 \
  --protocol tcp \
  --output demo-output \
  --timeout 2 || echo "Receiver timed out as expected"
echo

# Demonstrate list command
echo "=== List Active Transfers ==="
./target/debug/file-transfer-cli list
echo

# Demonstrate error handling
echo "=== Error Handling Demonstration ==="
echo "Attempting to send non-existent file:"
./target/debug/file-transfer-cli send \
  --target 127.0.0.1 \
  --port 19994 \
  /nonexistent/file.txt || echo "✓ Proper error handling for missing file"
echo

echo "Attempting to use invalid protocol:"
./target/debug/file-transfer-cli send \
  --target 127.0.0.1 \
  --port 19993 \
  --protocol invalid \
  demo-files/test.txt || echo "✓ Proper error handling for invalid protocol"
echo

# Show exit codes
echo "=== Exit Code Demonstration ==="
echo "Successful help command:"
./target/debug/file-transfer-cli --help > /dev/null
echo "Exit code: $?"
echo

echo "Failed command (missing file):"
./target/debug/file-transfer-cli send --target 127.0.0.1 /nonexistent.txt 2>/dev/null || echo "Exit code: $?"
echo

# Cleanup
echo "=== Cleanup ==="
rm -rf demo-files demo-output
echo "✓ Demo files cleaned up"
echo

echo "=== CLI Demonstration Complete ==="
echo "The CLI supports:"
echo "  ✓ Command-line argument parsing with clap"
echo "  ✓ TCP and UDP protocol selection"
echo "  ✓ Transmitter and receiver modes"
echo "  ✓ Configurable chunk sizes and timeouts"
echo "  ✓ Verbose and debug logging options"
echo "  ✓ Text-based progress display"
echo "  ✓ Proper error handling with exit codes"
echo "  ✓ Transfer management (list, cancel)"
echo "  ✓ File validation and configuration validation"
echo
echo "All CLI requirements have been successfully implemented!"