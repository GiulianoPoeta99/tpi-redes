# End-to-End Testing Guide

This guide provides comprehensive information about the E2E testing suite for the file transfer application.

## Overview

The E2E testing suite validates the complete functionality of the file transfer application across different scenarios, platforms, and conditions. It covers:

- ✅ Complete transfer workflows (TCP/UDP)
- 🖥️ Cross-platform compatibility
- ⚡ Performance under various conditions
- 💪 Stress testing and resource limits
- 🌐 Network simulation (latency, packet loss)
- 🔒 Security and input validation

## Test Structure

```
tests/e2e/
├── mod.rs                 # Common utilities and test framework
├── workflows/             # Complete transfer workflow tests
├── cross_platform/        # Platform-specific behavior tests
├── performance/           # Performance and throughput tests
├── stress/               # Resource exhaustion and limits
├── network_sim/          # Network condition simulation
├── security/             # Security and validation tests
├── README.md             # This file
├── TESTING_GUIDE.md      # Detailed testing guide
└── ci_config.yml         # CI/CD configuration
```

## Running Tests

### Prerequisites

1. **Rust Environment**
   ```bash
   # Install Rust if not already installed
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   source ~/.cargo/env
   ```

2. **Backend Dependencies**
   ```bash
   cd backend
   cargo build --release
   ```

3. **Test Environment Variables** (optional)
   ```bash
   # Enable large file tests (creates files up to 1GB)
   export E2E_LARGE_FILES=1
   
   # Enable long-running stability tests (up to 5 minutes)
   export E2E_LONG_RUNNING=1
   ```

### Quick Tests

```bash
# Smoke tests (< 2 minutes)
cd backend
cargo test --test e2e_suite smoke_test_basic_functionality --release

# Regression tests (< 5 minutes)
cargo test --test e2e_suite regression_test_core_features --release
```

### Category-Specific Tests

```bash
# Workflow tests - basic functionality
cargo test --test e2e_suite test_workflows_only --release

# Cross-platform tests - OS compatibility
cargo test --test e2e_suite test_cross_platform_only --release

# Performance tests - speed and throughput
cargo test --test e2e_suite test_performance_only --release

# Stress tests - resource limits
cargo test --test e2e_suite test_stress_only --release

# Network simulation - poor conditions
cargo test --test e2e_suite test_network_simulation_only --release

# Security tests - input validation
cargo test --test e2e_suite test_security_only --release
```

### Full Test Suite

```bash
# Complete E2E test suite (can take 30+ minutes)
export E2E_LARGE_FILES=1
export E2E_LONG_RUNNING=1
cargo test --test e2e_suite run_complete_e2e_suite --release
```

## Test Categories

### 1. Workflow Tests (`workflows/`)

**Purpose**: Validate complete file transfer workflows

**Tests Include**:
- TCP complete transfer workflow
- UDP complete transfer workflow  
- Multiple file sizes (1KB to 1GB)
- Error scenarios (no receiver, invalid files)
- Protocol-specific behaviors

**Expected Results**:
- TCP transfers should complete with 100% integrity
- UDP transfers should complete with fire-and-forget behavior
- Error conditions should be handled gracefully
- File integrity should be verified via checksums

### 2. Cross-Platform Tests (`cross_platform/`)

**Purpose**: Ensure compatibility across operating systems

**Tests Include**:
- File system path handling
- File permissions and metadata
- Special characters in filenames
- Long file paths
- Socket binding behavior
- Localhost resolution
- Large file handling

**Platform Coverage**:
- Linux (Ubuntu, CentOS, Alpine)
- Windows (10, 11, Server)
- macOS (Intel, Apple Silicon)

### 3. Performance Tests (`performance/`)

**Purpose**: Measure and validate transfer performance

**Tests Include**:
- Transfer speed measurement
- Memory usage monitoring
- Throughput scaling
- Chunk size optimization
- Large file performance
- Concurrent transfer impact

**Metrics Collected**:
- Transfer speed (MB/s)
- Memory usage (MB)
- CPU utilization
- Network bandwidth utilization
- Latency measurements

### 4. Stress Tests (`stress/`)

**Purpose**: Test system behavior under high load

**Tests Include**:
- Concurrent transfers (2, 5, 10+ simultaneous)
- Resource exhaustion (ports, file descriptors)
- Connection limits
- Memory pressure scenarios
- Long-running stability
- Connection cycling

**Failure Modes Tested**:
- Port exhaustion
- Memory leaks
- File descriptor limits
- Connection queue overflow
- Resource cleanup

### 5. Network Simulation Tests (`network_sim/`)

**Purpose**: Test behavior under poor network conditions

**Tests Include**:
- Latency simulation (1ms to 500ms)
- Packet loss simulation (0% to 20%)
- Bandwidth limiting (64 Kbps to unlimited)
- Network jitter
- Intermittent connectivity
- Variable network conditions

**Conditions Simulated**:
- Good network (< 10ms latency, 0% loss)
- Poor network (100ms latency, 5% loss)
- Very poor network (500ms latency, 15% loss)

### 6. Security Tests (`security/`)

**Purpose**: Validate input validation and security measures

**Tests Include**:
- Invalid IP address handling
- Invalid port number validation
- File path traversal prevention
- Symlink handling
- Special file protection
- Buffer overflow protection
- Configuration validation
- Network security measures

**Security Aspects**:
- Input sanitization
- Path traversal prevention
- Resource limit enforcement
- Privilege escalation prevention
- Memory safety

## Test Results and Metrics

### Success Criteria

Each test category has specific success criteria:

- **Workflow Tests**: ≥ 90% success rate
- **Cross-Platform Tests**: ≥ 80% success rate  
- **Performance Tests**: ≥ 70% success rate
- **Stress Tests**: ≥ 60% success rate
- **Network Simulation**: ≥ 70% success rate
- **Security Tests**: ≥ 85% success rate

### Performance Benchmarks

Expected performance baselines:

- **TCP Transfer Speed**: ≥ 50 MB/s (localhost)
- **UDP Transfer Speed**: ≥ 30 MB/s (localhost)
- **Memory Usage**: ≤ 100 MB per transfer
- **Concurrent Transfers**: ≥ 5 simultaneous
- **Large File Support**: Up to 1 GB

### Test Output

Tests generate detailed output including:

```
=== E2E Test Suite Summary ===
Total tests: 127
Passed: 118
Failed: 9
Success rate: 92.9%

Performance Summary:
Total bytes transferred: 2.34 GB
Average transfer speed: 67.8 MB/s

Failed tests:
  - UDP Packet Loss - 20.0%: High packet loss caused timeout
  - Large File Performance - 1GB: Memory limit exceeded
```

## Troubleshooting

### Common Issues

1. **Port Binding Failures**
   ```
   Error: Address already in use (os error 98)
   ```
   - **Solution**: Wait for ports to be released or restart tests
   - **Prevention**: Tests use dynamic port allocation

2. **File Permission Errors**
   ```
   Error: Permission denied (os error 13)
   ```
   - **Solution**: Run tests with appropriate permissions
   - **Check**: Ensure test directories are writable

3. **Memory Exhaustion**
   ```
   Error: Cannot allocate memory
   ```
   - **Solution**: Reduce concurrent test count or disable large file tests
   - **Environment**: Unset `E2E_LARGE_FILES` variable

4. **Network Timeouts**
   ```
   Error: Transfer timed out
   ```
   - **Solution**: Increase timeout values or check network conditions
   - **Debug**: Run individual tests to isolate issues

### Debug Mode

Enable verbose logging:

```bash
RUST_LOG=debug cargo test --test e2e_suite -- --nocapture
```

### Test Isolation

Run tests in isolation to debug specific failures:

```bash
# Run single test function
cargo test --test e2e_suite workflows::test_tcp_complete_workflow -- --exact

# Run with single thread to avoid conflicts
cargo test --test e2e_suite -- --test-threads=1
```

## CI/CD Integration

### GitHub Actions

The test suite integrates with GitHub Actions for automated testing:

- **Smoke Tests**: Run on every commit (< 5 minutes)
- **Regression Tests**: Run on PRs (< 10 minutes)
- **Cross-Platform**: Run on multiple OS (< 20 minutes)
- **Full Suite**: Run nightly (< 60 minutes)

### Test Triggers

- `[perf-test]` in commit message: Triggers performance tests
- `[full-e2e]` in commit message: Triggers complete test suite
- Nightly schedule: Runs comprehensive testing

### Artifacts

Test results are uploaded as artifacts:
- Test logs and output
- Performance metrics
- Failure reports
- Coverage information

## Contributing

### Adding New Tests

1. **Choose appropriate category** based on test purpose
2. **Follow naming conventions**: `test_feature_description`
3. **Use common utilities** from `e2e::mod`
4. **Add proper error handling** and cleanup
5. **Document expected behavior** in comments

### Test Structure Template

```rust
async fn test_new_feature() -> TestResult {
    let mut result = TestResult::new("New Feature Test".to_string());
    
    // Setup
    let env = TestEnvironment::new().await;
    
    // Test logic
    match perform_test().await {
        Ok(success_data) => {
            result
                .with_success(true)
                .with_duration(duration)
                .add_metadata("key".to_string(), "value".to_string())
        }
        Err(e) => result.with_error(format!("Test failed: {}", e)),
    }
}
```

### Best Practices

1. **Cleanup Resources**: Always clean up files, ports, and connections
2. **Use Timeouts**: Prevent tests from hanging indefinitely
3. **Meaningful Assertions**: Test specific behaviors, not just "no crash"
4. **Platform Awareness**: Consider OS-specific behaviors
5. **Performance Considerations**: Don't create unnecessarily large test data

## Maintenance

### Regular Tasks

- **Update baselines** when performance improves
- **Add new test cases** for bug fixes
- **Review timeout values** based on CI performance
- **Clean up test artifacts** periodically

### Monitoring

- **CI success rates** should remain above 85%
- **Test execution time** should not exceed limits
- **Resource usage** should be reasonable
- **Flaky tests** should be investigated and fixed

### Updates

When updating the test suite:

1. **Maintain backward compatibility** where possible
2. **Update documentation** for new features
3. **Adjust success criteria** if needed
4. **Test on all supported platforms**
5. **Update CI configuration** as required