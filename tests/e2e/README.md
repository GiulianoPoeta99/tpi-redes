# End-to-End Testing Suite

This directory contains comprehensive end-to-end tests for the file transfer application.

## Test Categories

### 1. Complete Transfer Workflows (`workflows/`)
- TCP and UDP file transfers
- Different file sizes and types
- Success and failure scenarios

### 2. Cross-Platform Testing (`cross-platform/`)
- Platform-specific behavior tests
- File system compatibility
- Network stack differences

### 3. Performance Testing (`performance/`)
- Large file transfers
- Network bandwidth utilization
- Memory usage monitoring

### 4. Stress Testing (`stress/`)
- Multiple concurrent transfers
- Resource exhaustion scenarios
- Connection limits

### 5. Network Simulation (`network-sim/`)
- Packet loss simulation
- Latency injection
- Bandwidth throttling

### 6. Security Testing (`security/`)
- Input validation
- File path traversal prevention
- Buffer overflow protection

## Running Tests

### All E2E Tests
```bash
# Backend tests
cd backend && cargo test --test e2e_suite

# Frontend tests
cd frontend && npm run test:e2e

# Full integration
just test-e2e
```

### Specific Test Categories
```bash
# Performance tests only
cargo test --test e2e_performance

# Security tests only
cargo test --test e2e_security

# Cross-platform tests
cargo test --test e2e_cross_platform
```

## Test Data

Test files are generated automatically in various sizes:
- Small: 1KB - 100KB
- Medium: 1MB - 10MB
- Large: 100MB - 1GB
- Binary and text formats

## CI/CD Integration

Tests are configured to run in GitHub Actions with:
- Multiple OS matrices (Windows, macOS, Linux)
- Different Rust versions
- Network simulation environments