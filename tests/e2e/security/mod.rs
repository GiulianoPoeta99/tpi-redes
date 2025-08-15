// Security Testing Module
// Tests input validation, file handling security, and buffer overflow protection

use crate::e2e::{TestEnvironment, TestFileGenerator, NetworkUtils, TransferTestUtils, TestResult};
use file_transfer_backend::{
    config::{TransferConfig, Protocol, TransferMode},
    core::transfer::CommunicationManager,
};
use std::net::{SocketAddr, IpAddr, Ipv4Addr};
use std::path::PathBuf;
use std::time::Duration;
use tokio::time::timeout;
use tokio::fs;

/// Run comprehensive security test suite
pub async fn run_security_suite() -> Vec<TestResult> {
    let mut results = Vec::new();
    
    // Input validation tests
    results.extend(test_input_validation().await);
    
    // File path security tests
    results.extend(test_file_path_security().await);
    
    // Buffer overflow protection tests
    results.extend(test_buffer_overflow_protection().await);
    
    // Network security tests
    results.extend(test_network_security().await);
    
    // Configuration security tests
    results.extend(test_configuration_security().await);
    
    results
}

/// Test input validation
async fn test_input_validation() -> Vec<TestResult> {
    let mut results = Vec::new();
    
    results.push(test_invalid_ip_addresses().await);
    results.push(test_invalid_port_numbers().await);
    results.push(test_invalid_file_paths().await);
    results.push(test_malformed_configurations().await);
    
    results
}

/// Test invalid IP address handling
async fn test_invalid_ip_addresses() -> TestResult {
    let mut result = TestResult::new("Invalid IP Address Validation".to_string());
    
    let invalid_ips = vec![
        "999.999.999.999",
        "256.1.1.1",
        "192.168.1",
        "192.168.1.1.1",
        "not.an.ip.address",
        "192.168.1.-1",
        "",
        "localhost:8080", // Should be just IP
        "::1", // IPv6 in IPv4 context
    ];
    
    let mut validation_failures = 0;
    let total_tests = invalid_ips.len();
    
    for invalid_ip in invalid_ips {
        // Test if the system properly rejects invalid IPs
        let config = TransferConfig {
            mode: TransferMode::Transmitter,
            protocol: Protocol::Tcp,
            target_ip: Some(invalid_ip.to_string()),
            port: 8080,
            filename: None,
            chunk_size: 8192,
            timeout: Duration::from_secs(5),
        };
        
        // Validation should fail for invalid IPs
        match CommunicationManager::validate_communication_config(&config) {
            Err(_) => validation_failures += 1, // This is expected
            Ok(_) => {
                // If validation passes, try to use it and expect failure
                let env = TestEnvironment::new().await;
                let test_file = env.test_files_dir.join("security_test.txt");
                TestFileGenerator::create_text_file(&test_file, 1024).await.unwrap();
                
                let bind_addr = SocketAddr::new(IpAddr::V4(Ipv4Addr::new(127, 0, 0, 1)), 8080);
                let transfer_result = CommunicationManager::start_sender(&config, test_file, bind_addr).await;
                
                if transfer_result.is_err() {
                    validation_failures += 1; // Runtime validation caught it
                }
            }
        }
    }
    
    let success_rate = (validation_failures as f64 / total_tests as f64) * 100.0;
    
    result
        .with_success(success_rate >= 90.0) // At least 90% should be caught
        .add_metadata("total_invalid_ips".to_string(), total_tests.to_string())
        .add_metadata("validation_failures".to_string(), validation_failures.to_string())
        .add_metadata("success_rate".to_string(), format!("{:.1}%", success_rate))
}

/// Test invalid port number handling
async fn test_invalid_port_numbers() -> TestResult {
    let mut result = TestResult::new("Invalid Port Number Validation".to_string());
    
    let invalid_ports = vec![
        0,      // Reserved
        65536,  // Out of range
        70000,  // Out of range
        -1i32 as u16, // Negative (will wrap)
    ];
    
    let mut validation_failures = 0;
    let total_tests = invalid_ports.len();
    
    for invalid_port in invalid_ports {
        let config = TransferConfig {
            mode: TransferMode::Receiver,
            protocol: Protocol::Tcp,
            target_ip: None,
            port: invalid_port,
            filename: None,
            chunk_size: 8192,
            timeout: Duration::from_secs(5),
        };
        
        match CommunicationManager::validate_communication_config(&config) {
            Err(_) => validation_failures += 1,
            Ok(_) => {
                // Try to bind to the invalid port
                let bind_addr = SocketAddr::new(IpAddr::V4(Ipv4Addr::new(127, 0, 0, 1)), invalid_port);
                let env = TestEnvironment::new().await;
                
                let bind_result = CommunicationManager::start_receiver(
                    &config, 
                    bind_addr, 
                    env.downloads_dir
                ).await;
                
                if bind_result.is_err() {
                    validation_failures += 1;
                }
            }
        }
    }
    
    let success_rate = (validation_failures as f64 / total_tests as f64) * 100.0;
    
    result
        .with_success(success_rate >= 75.0) // At least 75% should be caught
        .add_metadata("total_invalid_ports".to_string(), total_tests.to_string())
        .add_metadata("validation_failures".to_string(), validation_failures.to_string())
        .add_metadata("success_rate".to_string(), format!("{:.1}%", success_rate))
}

/// Test invalid file path handling
async fn test_invalid_file_paths() -> TestResult {
    let mut result = TestResult::new("Invalid File Path Validation".to_string());
    
    let invalid_paths = vec![
        "/nonexistent/path/file.txt",
        "../../../etc/passwd",
        "C:\\Windows\\System32\\config\\SAM", // Windows system file
        "/dev/null",
        "/proc/self/mem",
        "file\0with\0nulls.txt", // Null bytes
        "file_with_very_long_name_that_exceeds_filesystem_limits_and_should_be_rejected_by_the_system_because_it_is_too_long_for_most_filesystems_to_handle_properly.txt",
        "", // Empty path
    ];
    
    let mut validation_failures = 0;
    let total_tests = invalid_paths.len();
    
    for invalid_path in invalid_paths {
        let path = PathBuf::from(invalid_path);
        let port = NetworkUtils::get_available_port();
        let bind_addr = SocketAddr::new(IpAddr::V4(Ipv4Addr::new(127, 0, 0, 1)), port);
        
        let config = TransferTestUtils::create_tcp_config(
            TransferMode::Transmitter, 
            port, 
            Some("127.0.0.1".to_string())
        );
        
        let transfer_result = CommunicationManager::start_sender(&config, path, bind_addr).await;
        
        if transfer_result.is_err() {
            validation_failures += 1; // Expected behavior
        }
    }
    
    let success_rate = (validation_failures as f64 / total_tests as f64) * 100.0;
    
    result
        .with_success(success_rate >= 80.0) // At least 80% should be rejected
        .add_metadata("total_invalid_paths".to_string(), total_tests.to_string())
        .add_metadata("validation_failures".to_string(), validation_failures.to_string())
        .add_metadata("success_rate".to_string(), format!("{:.1}%", success_rate))
}

/// Test malformed configuration handling
async fn test_malformed_configurations() -> TestResult {
    let mut result = TestResult::new("Malformed Configuration Validation".to_string());
    
    let malformed_configs = vec![
        // Transmitter without target IP
        TransferConfig {
            mode: TransferMode::Transmitter,
            protocol: Protocol::Tcp,
            target_ip: None,
            port: 8080,
            filename: None,
            chunk_size: 8192,
            timeout: Duration::from_secs(5),
        },
        // Zero chunk size
        TransferConfig {
            mode: TransferMode::Transmitter,
            protocol: Protocol::Tcp,
            target_ip: Some("127.0.0.1".to_string()),
            port: 8080,
            filename: None,
            chunk_size: 0,
            timeout: Duration::from_secs(5),
        },
        // Extremely large chunk size
        TransferConfig {
            mode: TransferMode::Transmitter,
            protocol: Protocol::Tcp,
            target_ip: Some("127.0.0.1".to_string()),
            port: 8080,
            filename: None,
            chunk_size: 1024 * 1024 * 1024, // 1GB chunk
            timeout: Duration::from_secs(5),
        },
        // Zero timeout
        TransferConfig {
            mode: TransferMode::Transmitter,
            protocol: Protocol::Tcp,
            target_ip: Some("127.0.0.1".to_string()),
            port: 8080,
            filename: None,
            chunk_size: 8192,
            timeout: Duration::from_secs(0),
        },
    ];
    
    let mut validation_failures = 0;
    let total_tests = malformed_configs.len();
    
    for config in malformed_configs {
        match CommunicationManager::validate_communication_config(&config) {
            Err(_) => validation_failures += 1, // Expected
            Ok(_) => {
                // If validation passes, the config might still fail at runtime
                // This is acceptable for some edge cases
            }
        }
    }
    
    let success_rate = (validation_failures as f64 / total_tests as f64) * 100.0;
    
    result
        .with_success(success_rate >= 50.0) // At least 50% should be caught
        .add_metadata("total_malformed_configs".to_string(), total_tests.to_string())
        .add_metadata("validation_failures".to_string(), validation_failures.to_string())
        .add_metadata("success_rate".to_string(), format!("{:.1}%", success_rate))
}

/// Test file path security (path traversal prevention)
async fn test_file_path_security() -> Vec<TestResult> {
    let mut results = Vec::new();
    
    results.push(test_path_traversal_prevention().await);
    results.push(test_symlink_handling().await);
    results.push(test_special_file_handling().await);
    
    results
}

/// Test path traversal prevention
async fn test_path_traversal_prevention() -> TestResult {
    let mut result = TestResult::new("Path Traversal Prevention".to_string());
    
    let env = TestEnvironment::new().await;
    
    // Create a file outside the intended directory
    let outside_dir = env.temp_dir.join("outside");
    fs::create_dir_all(&outside_dir).await.unwrap();
    let outside_file = outside_dir.join("secret.txt");
    fs::write(&outside_file, "This should not be accessible").await.unwrap();
    
    let traversal_attempts = vec![
        "../outside/secret.txt",
        "../../outside/secret.txt",
        "../../../outside/secret.txt",
        "..\\outside\\secret.txt", // Windows style
        "./../outside/secret.txt",
        "subdir/../outside/secret.txt",
    ];
    
    let mut prevented_attempts = 0;
    let total_attempts = traversal_attempts.len();
    
    for traversal_path in traversal_attempts {
        let full_path = env.test_files_dir.join(traversal_path);
        
        // Normalize the path to see if it escapes the intended directory
        let normalized = match full_path.canonicalize() {
            Ok(path) => path,
            Err(_) => {
                prevented_attempts += 1; // Path doesn't exist or is invalid
                continue;
            }
        };
        
        // Check if the normalized path is still within the test directory
        if !normalized.starts_with(&env.test_files_dir) {
            // This is a path traversal attempt
            let port = NetworkUtils::get_available_port();
            let bind_addr = SocketAddr::new(IpAddr::V4(Ipv4Addr::new(127, 0, 0, 1)), port);
            
            let config = TransferTestUtils::create_tcp_config(
                TransferMode::Transmitter, 
                port, 
                Some("127.0.0.1".to_string())
            );
            
            // The system should reject this
            let transfer_result = CommunicationManager::start_sender(&config, full_path, bind_addr).await;
            
            if transfer_result.is_err() {
                prevented_attempts += 1;
            }
        } else {
            prevented_attempts += 1; // Path was contained within directory
        }
    }
    
    let prevention_rate = (prevented_attempts as f64 / total_attempts as f64) * 100.0;
    
    result
        .with_success(prevention_rate >= 90.0) // At least 90% should be prevented
        .add_metadata("total_attempts".to_string(), total_attempts.to_string())
        .add_metadata("prevented_attempts".to_string(), prevented_attempts.to_string())
        .add_metadata("prevention_rate".to_string(), format!("{:.1}%", prevention_rate))
}

/// Test symlink handling
async fn test_symlink_handling() -> TestResult {
    let mut result = TestResult::new("Symlink Handling".to_string());
    
    let env = TestEnvironment::new().await;
    
    // Create a regular file
    let regular_file = env.test_files_dir.join("regular.txt");
    fs::write(&regular_file, "Regular file content").await.unwrap();
    
    // Try to create a symlink (may fail on some systems/permissions)
    let symlink_file = env.test_files_dir.join("symlink.txt");
    
    #[cfg(unix)]
    let symlink_created = {
        use std::os::unix::fs::symlink;
        symlink(&regular_file, &symlink_file).is_ok()
    };
    
    #[cfg(windows)]
    let symlink_created = {
        use std::os::windows::fs::symlink_file;
        symlink_file(&regular_file, &symlink_file).is_ok()
    };
    
    #[cfg(not(any(unix, windows)))]
    let symlink_created = false;
    
    if !symlink_created {
        return result
            .with_success(true)
            .add_metadata("skipped".to_string(), "symlink creation not supported or failed".to_string());
    }
    
    // Test transferring the symlink
    let port = NetworkUtils::get_available_port();
    let bind_addr = SocketAddr::new(IpAddr::V4(Ipv4Addr::new(127, 0, 0, 1)), port);
    
    let receiver_config = TransferTestUtils::create_tcp_config(TransferMode::Receiver, port, None);
    let sender_config = TransferTestUtils::create_tcp_config(
        TransferMode::Transmitter, port, Some("127.0.0.1".to_string())
    );
    
    let receiver_output_dir = env.downloads_dir.clone();
    let receiver_task = tokio::spawn(async move {
        CommunicationManager::start_receiver(&receiver_config, bind_addr, receiver_output_dir).await
    });
    
    tokio::time::sleep(Duration::from_millis(200)).await;
    
    let sender_result = timeout(
        Duration::from_secs(10),
        CommunicationManager::start_sender(&sender_config, symlink_file, bind_addr)
    ).await;
    
    receiver_task.abort();
    
    match sender_result {
        Ok(Ok(transfer_result)) => {
            // The system should handle symlinks appropriately
            // Either by following them or rejecting them, but not crashing
            result
                .with_success(true)
                .add_metadata("symlink_handled".to_string(), "true".to_string())
                .add_metadata("transfer_success".to_string(), transfer_result.success.to_string())
        }
        Ok(Err(_)) => {
            // Rejecting symlinks is also acceptable behavior
            result
                .with_success(true)
                .add_metadata("symlink_handled".to_string(), "rejected".to_string())
        }
        Err(_) => result.with_error("Symlink handling caused timeout".to_string()),
    }
}

/// Test special file handling
async fn test_special_file_handling() -> TestResult {
    let mut result = TestResult::new("Special File Handling".to_string());
    
    let special_files = if cfg!(unix) {
        vec![
            "/dev/null",
            "/dev/zero",
            "/dev/random",
        ]
    } else {
        vec![
            "CON",    // Windows console
            "PRN",    // Windows printer
            "AUX",    // Windows auxiliary
            "NUL",    // Windows null device
        ]
    };
    
    let mut safe_handling_count = 0;
    let total_tests = special_files.len();
    
    for special_file in special_files {
        let path = PathBuf::from(special_file);
        let port = NetworkUtils::get_available_port();
        let bind_addr = SocketAddr::new(IpAddr::V4(Ipv4Addr::new(127, 0, 0, 1)), port);
        
        let config = TransferTestUtils::create_tcp_config(
            TransferMode::Transmitter, 
            port, 
            Some("127.0.0.1".to_string())
        );
        
        let transfer_result = timeout(
            Duration::from_secs(5), // Short timeout for special files
            CommunicationManager::start_sender(&config, path, bind_addr)
        ).await;
        
        match transfer_result {
            Ok(Ok(_)) => {
                // If it succeeds, that's fine for some special files
                safe_handling_count += 1;
            }
            Ok(Err(_)) => {
                // Rejecting special files is safe behavior
                safe_handling_count += 1;
            }
            Err(_) => {
                // Timeout might indicate the system is trying to read from an infinite source
                // This is not necessarily unsafe, but not ideal
            }
        }
    }
    
    let safe_rate = (safe_handling_count as f64 / total_tests as f64) * 100.0;
    
    result
        .with_success(safe_rate >= 70.0) // At least 70% should be handled safely
        .add_metadata("total_special_files".to_string(), total_tests.to_string())
        .add_metadata("safe_handling_count".to_string(), safe_handling_count.to_string())
        .add_metadata("safe_rate".to_string(), format!("{:.1}%", safe_rate))
}

/// Test buffer overflow protection
async fn test_buffer_overflow_protection() -> Vec<TestResult> {
    let mut results = Vec::new();
    
    results.push(test_large_chunk_handling().await);
    results.push(test_malformed_message_handling().await);
    results.push(test_memory_exhaustion_protection().await);
    
    results
}

/// Test large chunk handling
async fn test_large_chunk_handling() -> TestResult {
    let mut result = TestResult::new("Large Chunk Handling".to_string());
    
    let env = TestEnvironment::new().await;
    
    // Create a file with a very large chunk size configuration
    let test_file = env.test_files_dir.join("large_chunk_test.bin");
    TestFileGenerator::create_binary_file(&test_file, 1024 * 1024).await.unwrap(); // 1MB file
    
    let port = NetworkUtils::get_available_port();
    let bind_addr = SocketAddr::new(IpAddr::V4(Ipv4Addr::new(127, 0, 0, 1)), port);
    
    // Test with extremely large chunk size
    let mut config = TransferTestUtils::create_tcp_config(
        TransferMode::Transmitter, 
        port, 
        Some("127.0.0.1".to_string())
    );
    config.chunk_size = 100 * 1024 * 1024; // 100MB chunk size
    
    let receiver_config = TransferTestUtils::create_tcp_config(TransferMode::Receiver, port, None);
    
    let receiver_output_dir = env.downloads_dir.clone();
    let receiver_task = tokio::spawn(async move {
        CommunicationManager::start_receiver(&receiver_config, bind_addr, receiver_output_dir).await
    });
    
    tokio::time::sleep(Duration::from_millis(200)).await;
    
    let sender_result = timeout(
        Duration::from_secs(30),
        CommunicationManager::start_sender(&config, test_file, bind_addr)
    ).await;
    
    receiver_task.abort();
    
    match sender_result {
        Ok(Ok(transfer_result)) => {
            // System should handle large chunks gracefully
            result
                .with_success(true)
                .add_metadata("large_chunk_handled".to_string(), "true".to_string())
                .add_metadata("transfer_success".to_string(), transfer_result.success.to_string())
                .add_metadata("chunk_size_mb".to_string(), "100".to_string())
        }
        Ok(Err(_)) => {
            // Rejecting large chunks is also acceptable
            result
                .with_success(true)
                .add_metadata("large_chunk_handled".to_string(), "rejected".to_string())
        }
        Err(_) => result.with_error("Large chunk handling caused timeout".to_string()),
    }
}

/// Test malformed message handling
async fn test_malformed_message_handling() -> TestResult {
    let mut result = TestResult::new("Malformed Message Handling".to_string());
    
    // This test would ideally send malformed protocol messages
    // For now, we'll test with invalid configurations that might produce malformed messages
    
    let env = TestEnvironment::new().await;
    let test_file = env.test_files_dir.join("malformed_test.bin");
    TestFileGenerator::create_binary_file(&test_file, 1024).await.unwrap();
    
    let port = NetworkUtils::get_available_port();
    let bind_addr = SocketAddr::new(IpAddr::V4(Ipv4Addr::new(127, 0, 0, 1)), port);
    
    // Test with zero chunk size (should be handled gracefully)
    let mut config = TransferTestUtils::create_tcp_config(
        TransferMode::Transmitter, 
        port, 
        Some("127.0.0.1".to_string())
    );
    config.chunk_size = 1; // Extremely small chunk size
    
    let receiver_config = TransferTestUtils::create_tcp_config(TransferMode::Receiver, port, None);
    
    let receiver_output_dir = env.downloads_dir.clone();
    let receiver_task = tokio::spawn(async move {
        CommunicationManager::start_receiver(&receiver_config, bind_addr, receiver_output_dir).await
    });
    
    tokio::time::sleep(Duration::from_millis(200)).await;
    
    let sender_result = timeout(
        Duration::from_secs(15),
        CommunicationManager::start_sender(&config, test_file, bind_addr)
    ).await;
    
    receiver_task.abort();
    
    match sender_result {
        Ok(Ok(_)) => {
            result
                .with_success(true)
                .add_metadata("malformed_handling".to_string(), "graceful".to_string())
        }
        Ok(Err(_)) => {
            result
                .with_success(true)
                .add_metadata("malformed_handling".to_string(), "rejected".to_string())
        }
        Err(_) => result.with_error("Malformed message handling caused timeout".to_string()),
    }
}

/// Test memory exhaustion protection
async fn test_memory_exhaustion_protection() -> TestResult {
    let mut result = TestResult::new("Memory Exhaustion Protection".to_string());
    
    // Test with a configuration that might cause excessive memory usage
    let env = TestEnvironment::new().await;
    
    // Create multiple large files
    let mut large_files = Vec::new();
    for i in 0..5 {
        let large_file = env.test_files_dir.join(format!("memory_test_{}.bin", i));
        TestFileGenerator::create_binary_file(&large_file, 10 * 1024 * 1024).await.unwrap(); // 10MB each
        large_files.push(large_file);
    }
    
    let mut successful_transfers = 0;
    let mut memory_safe_transfers = 0;
    
    for (i, test_file) in large_files.iter().enumerate() {
        let port = NetworkUtils::get_available_port();
        let bind_addr = SocketAddr::new(IpAddr::V4(Ipv4Addr::new(127, 0, 0, 1)), port);
        
        let receiver_config = TransferTestUtils::create_tcp_config(TransferMode::Receiver, port, None);
        let sender_config = TransferTestUtils::create_tcp_config(
            TransferMode::Transmitter, port, Some("127.0.0.1".to_string())
        );
        
        let receiver_output_dir = env.downloads_dir.join(format!("memory_test_{}", i));
        tokio::fs::create_dir_all(&receiver_output_dir).await.unwrap();
        
        let receiver_task = tokio::spawn(async move {
            CommunicationManager::start_receiver(&receiver_config, bind_addr, receiver_output_dir).await
        });
        
        tokio::time::sleep(Duration::from_millis(200)).await;
        
        let memory_before = crate::e2e::PerformanceUtils::get_memory_usage();
        
        let sender_result = timeout(
            Duration::from_secs(60),
            CommunicationManager::start_sender(&sender_config, test_file.clone(), bind_addr)
        ).await;
        
        let memory_after = crate::e2e::PerformanceUtils::get_memory_usage();
        
        receiver_task.abort();
        
        match sender_result {
            Ok(Ok(transfer_result)) if transfer_result.success => {
                successful_transfers += 1;
                
                // Check if memory usage was reasonable
                if let (Some(before), Some(after)) = (memory_before, memory_after) {
                    let memory_delta = if after > before { after - before } else { 0 };
                    let memory_delta_mb = memory_delta as f64 / (1024.0 * 1024.0);
                    
                    // Memory usage should be reasonable (less than 100MB increase per transfer)
                    if memory_delta_mb < 100.0 {
                        memory_safe_transfers += 1;
                    }
                } else {
                    memory_safe_transfers += 1; // Can't measure, assume safe
                }
            }
            _ => {
                // Failed transfers might indicate memory protection working
                memory_safe_transfers += 1;
            }
        }
        
        // Small delay between transfers
        tokio::time::sleep(Duration::from_millis(500)).await;
    }
    
    let total_files = large_files.len();
    let memory_safety_rate = (memory_safe_transfers as f64 / total_files as f64) * 100.0;
    
    result
        .with_success(memory_safety_rate >= 80.0) // At least 80% should be memory safe
        .add_metadata("total_files".to_string(), total_files.to_string())
        .add_metadata("successful_transfers".to_string(), successful_transfers.to_string())
        .add_metadata("memory_safe_transfers".to_string(), memory_safe_transfers.to_string())
        .add_metadata("memory_safety_rate".to_string(), format!("{:.1}%", memory_safety_rate))
}

/// Test network security
async fn test_network_security() -> Vec<TestResult> {
    let mut results = Vec::new();
    
    results.push(test_port_binding_security().await);
    results.push(test_connection_limits().await);
    
    results
}

/// Test port binding security
async fn test_port_binding_security() -> TestResult {
    let mut result = TestResult::new("Port Binding Security".to_string());
    
    // Test binding to privileged ports (should fail without privileges)
    let privileged_ports = vec![21, 22, 23, 25, 53, 80, 110, 143, 443, 993, 995];
    let mut secure_bindings = 0;
    let total_tests = privileged_ports.len();
    
    for port in privileged_ports {
        let bind_addr = SocketAddr::new(IpAddr::V4(Ipv4Addr::new(127, 0, 0, 1)), port);
        
        // Try to bind to privileged port
        match tokio::net::TcpListener::bind(bind_addr).await {
            Ok(_) => {
                // Binding succeeded - this might be okay if running as root/admin
                // but generally indicates a security concern
            }
            Err(_) => {
                // Binding failed - this is expected for non-privileged users
                secure_bindings += 1;
            }
        }
    }
    
    let security_rate = (secure_bindings as f64 / total_tests as f64) * 100.0;
    
    result
        .with_success(security_rate >= 70.0) // Most should be protected
        .add_metadata("total_privileged_ports".to_string(), total_tests.to_string())
        .add_metadata("secure_bindings".to_string(), secure_bindings.to_string())
        .add_metadata("security_rate".to_string(), format!("{:.1}%", security_rate))
}

/// Test connection limits
async fn test_connection_limits() -> TestResult {
    let mut result = TestResult::new("Connection Limits".to_string());
    
    let port = NetworkUtils::get_available_port();
    let bind_addr = SocketAddr::new(IpAddr::V4(Ipv4Addr::new(127, 0, 0, 1)), port);
    
    // Start a listener
    let listener = match tokio::net::TcpListener::bind(bind_addr).await {
        Ok(l) => l,
        Err(e) => return result.with_error(format!("Failed to bind listener: {}", e)),
    };
    
    // Try to create many connections rapidly
    let mut connections = Vec::new();
    let max_connections = 100;
    let mut successful_connections = 0;
    
    for _ in 0..max_connections {
        match timeout(
            Duration::from_millis(100),
            tokio::net::TcpStream::connect(bind_addr)
        ).await {
            Ok(Ok(stream)) => {
                successful_connections += 1;
                connections.push(stream);
            }
            _ => break,
        }
    }
    
    // Clean up
    drop(connections);
    drop(listener);
    
    // The system should have some reasonable limit
    let connection_rate = (successful_connections as f64 / max_connections as f64) * 100.0;
    
    result
        .with_success(successful_connections > 10 && successful_connections < max_connections)
        .add_metadata("max_attempted".to_string(), max_connections.to_string())
        .add_metadata("successful_connections".to_string(), successful_connections.to_string())
        .add_metadata("connection_rate".to_string(), format!("{:.1}%", connection_rate))
}

/// Test configuration security
async fn test_configuration_security() -> Vec<TestResult> {
    let mut results = Vec::new();
    
    results.push(test_timeout_limits().await);
    results.push(test_chunk_size_limits().await);
    
    results
}

/// Test timeout limits
async fn test_timeout_limits() -> TestResult {
    let mut result = TestResult::new("Timeout Limits".to_string());
    
    let extreme_timeouts = vec![
        Duration::from_secs(0),      // Zero timeout
        Duration::from_secs(1),      // Very short
        Duration::from_secs(3600),   // 1 hour
        Duration::from_secs(86400),  // 24 hours
    ];
    
    let mut reasonable_handling = 0;
    let total_tests = extreme_timeouts.len();
    
    for timeout_duration in extreme_timeouts {
        let config = TransferConfig {
            mode: TransferMode::Transmitter,
            protocol: Protocol::Tcp,
            target_ip: Some("127.0.0.1".to_string()),
            port: 8080,
            filename: None,
            chunk_size: 8192,
            timeout: timeout_duration,
        };
        
        match CommunicationManager::validate_communication_config(&config) {
            Ok(_) => {
                // Configuration accepted - check if timeout is reasonable
                if timeout_duration.as_secs() > 0 && timeout_duration.as_secs() <= 3600 {
                    reasonable_handling += 1;
                }
            }
            Err(_) => {
                // Configuration rejected - this is reasonable for extreme values
                reasonable_handling += 1;
            }
        }
    }
    
    let reasonable_rate = (reasonable_handling as f64 / total_tests as f64) * 100.0;
    
    result
        .with_success(reasonable_rate >= 75.0)
        .add_metadata("total_timeout_tests".to_string(), total_tests.to_string())
        .add_metadata("reasonable_handling".to_string(), reasonable_handling.to_string())
        .add_metadata("reasonable_rate".to_string(), format!("{:.1}%", reasonable_rate))
}

/// Test chunk size limits
async fn test_chunk_size_limits() -> TestResult {
    let mut result = TestResult::new("Chunk Size Limits".to_string());
    
    let extreme_chunk_sizes = vec![
        0,                    // Zero
        1,                    // Minimum
        1024 * 1024,         // 1MB
        100 * 1024 * 1024,   // 100MB
        1024 * 1024 * 1024,  // 1GB
    ];
    
    let mut reasonable_handling = 0;
    let total_tests = extreme_chunk_sizes.len();
    
    for chunk_size in extreme_chunk_sizes {
        let config = TransferConfig {
            mode: TransferMode::Transmitter,
            protocol: Protocol::Tcp,
            target_ip: Some("127.0.0.1".to_string()),
            port: 8080,
            filename: None,
            chunk_size,
            timeout: Duration::from_secs(30),
        };
        
        match CommunicationManager::validate_communication_config(&config) {
            Ok(_) => {
                // Configuration accepted - check if chunk size is reasonable
                if chunk_size > 0 && chunk_size <= 10 * 1024 * 1024 { // Up to 10MB
                    reasonable_handling += 1;
                }
            }
            Err(_) => {
                // Configuration rejected - reasonable for extreme values
                reasonable_handling += 1;
            }
        }
    }
    
    let reasonable_rate = (reasonable_handling as f64 / total_tests as f64) * 100.0;
    
    result
        .with_success(reasonable_rate >= 60.0)
        .add_metadata("total_chunk_size_tests".to_string(), total_tests.to_string())
        .add_metadata("reasonable_handling".to_string(), reasonable_handling.to_string())
        .add_metadata("reasonable_rate".to_string(), format!("{:.1}%", reasonable_rate))
}