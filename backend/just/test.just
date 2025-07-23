# Run unit tests
test:
    cargo test

# Run integration tests only
test-integration:
    cargo test --test integration_tests

# Run CLI integration tests
test-cli:
    cargo test --test cli_integration_tests

# Run all test suites
test-all: test test-integration test-cli

# Test real file transfer (TCP)
test-real: create-test-files build
    @echo "Starting real transfer tests..."
    # Start receiver in background
    cargo run --bin file-transfer-cli -- receive --port 8080 --output tmp/downloads/tcp &
    sleep 2
    # Send test file
    cargo run --bin file-transfer-cli -- send --target 127.0.0.1:8080 tests/fixtures/hello.txt
    # Kill background receiver
    pkill -f "receive --port 8080" || true
    # Verify transfer
    @if [ -f "tmp/downloads/tcp/hello.txt" ]; then echo "✅ Transfer successful!"; else echo "❌ Transfer failed"; fi

# Test UDP file transfer
test-udp: create-test-files build
    @echo "Starting UDP transfer test..."
    cargo run --bin file-transfer-cli -- receive --port 8081 --protocol udp --output tmp/downloads/udp &
    sleep 2
    cargo run --bin file-transfer-cli -- send --target 127.0.0.1:8081 --protocol udp tests/fixtures/config.json
    pkill -f "receive --port 8081" || true
    @if [ -f "tmp/downloads/udp/config.json" ]; then echo "✅ UDP transfer successful!"; else echo "❌ UDP transfer failed"; fi

# Test performance with large file (10MB)
test-performance: create-test-files build
    @echo "Creating large test file..."
    mkdir -p tmp
    dd if=/dev/zero of=tmp/large.dat bs=1024 count=10240 2>/dev/null  # 10MB
    @echo "Starting performance test..."
    cargo run --bin file-transfer-cli -- receive --port 8080 --output tmp/downloads/tcp &
    sleep 2
    time cargo run --bin file-transfer-cli -- send --target 127.0.0.1:8080 tmp/large.dat
    pkill -f "receive --port 8080" || true

