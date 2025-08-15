// Cross-Platform Testing Module
// Tests platform-specific behaviors and compatibility

use crate::e2e::{TestEnvironment, TestFileGenerator, NetworkUtils, TransferTestUtils, TestResult};
use file_transfer_backend::{
    config::{TransferConfig, Protocol, TransferMode},
    core::transfer::CommunicationManager,
};
use std::net::{SocketAddr, IpAddr, Ipv4Addr};
use std::path::Path;
use std::time::Duration;

/// Test platform-specific file system behaviors
pub async fn test_platform_file_system() -> Vec<TestResult> {
    let mut results = Vec::new();
    
    results.push(test_file_path_separators().await);
    results.push(test_file_permissions().await);
    results.push(test_special_characters_in_filenames().await);
    results.push(test_long_file_paths().await);
    
    results
}

/// Test file path separator handling across platforms
async fn test_file_path_separators() -> TestResult {
    let mut result = TestResult::new("File Path Separators".to_string());
    
    let env = TestEnvironment::new().await;
    
    // Create files with platform-specific path handling
    let test_cases = vec![
        ("simple.txt", "Simple filename"),
        ("with spaces.txt", "Filename with spaces"),
        ("with-dashes.txt", "Filename with dashes"),
        ("with_underscores.txt", "Filename with underscores"),
    ];
    
    let mut success_count = 0;
    let total_count = test_cases.len();
    
    for (filename, description) in test_cases {
        let test_file = env.test_files_dir.join(filename);
        
        match TestFileGenerator::create_text_file(&test_file, 1024).await {
            Ok(_) => {
                // Test that the file can be read back
                match tokio::fs::read(&test_file).await {
                    Ok(content) => {
                        if content.len() == 1024 {
                            success_count += 1;
                        }
                    }
                    Err(_) => {}
                }
            }
            Err(_) => {}
        }
    }
    
    if success_count == total_count {
        result
            .with_success(true)
            .add_metadata("platform".to_string(), get_platform_name())
            .add_metadata("test_cases".to_string(), total_count.to_string())
    } else {
        result.with_error(format!("Only {}/{} file path tests passed", success_count, total_count))
    }
}

/// Test file permissions handling
async fn test_file_permissions() -> TestResult {
    let mut result = TestResult::new("File Permissions".to_string());
    
    let env = TestEnvironment::new().await;
    let test_file = env.test_files_dir.join("permissions_test.txt");
    
    match TestFileGenerator::create_text_file(&test_file, 1024).await {
        Ok(_) => {
            // Test reading file permissions
            match tokio::fs::metadata(&test_file).await {
                Ok(metadata) => {
                    let is_readable = !metadata.permissions().readonly();
                    
                    result
                        .with_success(true)
                        .add_metadata("platform".to_string(), get_platform_name())
                        .add_metadata("readable".to_string(), is_readable.to_string())
                        .add_metadata("file_size".to_string(), metadata.len().to_string())
                }
                Err(e) => result.with_error(format!("Failed to read file metadata: {}", e)),
            }
        }
        Err(e) => result.with_error(format!("Failed to create test file: {}", e)),
    }
}

/// Test special characters in filenames
async fn test_special_characters_in_filenames() -> TestResult {
    let mut result = TestResult::new("Special Characters in Filenames".to_string());
    
    let env = TestEnvironment::new().await;
    
    // Test different special characters based on platform
    let special_chars = if cfg!(windows) {
        // Windows has more restrictions
        vec!["test_file.txt", "test-file.txt", "test file.txt"]
    } else {
        // Unix-like systems are more permissive
        vec!["test_file.txt", "test-file.txt", "test file.txt", "test@file.txt", "test#file.txt"]
    };
    
    let mut success_count = 0;
    let total_count = special_chars.len();
    
    for filename in special_chars {
        let test_file = env.test_files_dir.join(filename);
        
        match TestFileGenerator::create_text_file(&test_file, 512).await {
            Ok(_) => {
                if test_file.exists() {
                    success_count += 1;
                }
            }
            Err(_) => {}
        }
    }
    
    result
        .with_success(success_count > 0)
        .add_metadata("platform".to_string(), get_platform_name())
        .add_metadata("supported_chars".to_string(), format!("{}/{}", success_count, total_count))
}

/// Test long file path handling
async fn test_long_file_paths() -> TestResult {
    let mut result = TestResult::new("Long File Paths".to_string());
    
    let env = TestEnvironment::new().await;
    
    // Create a deeply nested directory structure
    let mut deep_path = env.test_files_dir.clone();
    for i in 0..10 {
        deep_path = deep_path.join(format!("level_{}", i));
    }
    
    match tokio::fs::create_dir_all(&deep_path).await {
        Ok(_) => {
            let test_file = deep_path.join("deep_file.txt");
            
            match TestFileGenerator::create_text_file(&test_file, 1024).await {
                Ok(_) => {
                    result
                        .with_success(true)
                        .add_metadata("platform".to_string(), get_platform_name())
                        .add_metadata("path_length".to_string(), test_file.to_string_lossy().len().to_string())
                }
                Err(e) => result.with_error(format!("Failed to create file in deep path: {}", e)),
            }
        }
        Err(e) => result.with_error(format!("Failed to create deep directory structure: {}", e)),
    }
}

/// Test network stack differences across platforms
pub async fn test_platform_networking() -> Vec<TestResult> {
    let mut results = Vec::new();
    
    results.push(test_socket_binding_behavior().await);
    results.push(test_port_reuse_behavior().await);
    results.push(test_localhost_resolution().await);
    
    results
}

/// Test socket binding behavior differences
async fn test_socket_binding_behavior() -> TestResult {
    let mut result = TestResult::new("Socket Binding Behavior".to_string());
    
    let port = NetworkUtils::get_available_port();
    let bind_addr = SocketAddr::new(IpAddr::V4(Ipv4Addr::new(127, 0, 0, 1)), port);
    
    // Test TCP binding
    match tokio::net::TcpListener::bind(bind_addr).await {
        Ok(listener) => {
            // Test that the same port cannot be bound again
            match tokio::net::TcpListener::bind(bind_addr).await {
                Ok(_) => result.with_error("Platform allows multiple TCP binds to same address".to_string()),
                Err(_) => {
                    // This is expected behavior
                    drop(listener);
                    
                    // Test UDP binding
                    match tokio::net::UdpSocket::bind(bind_addr).await {
                        Ok(_socket) => {
                            result
                                .with_success(true)
                                .add_metadata("platform".to_string(), get_platform_name())
                                .add_metadata("tcp_exclusive".to_string(), "true".to_string())
                                .add_metadata("udp_bindable".to_string(), "true".to_string())
                        }
                        Err(e) => result.with_error(format!("UDP binding failed: {}", e)),
                    }
                }
            }
        }
        Err(e) => result.with_error(format!("TCP binding failed: {}", e)),
    }
}

/// Test port reuse behavior
async fn test_port_reuse_behavior() -> TestResult {
    let mut result = TestResult::new("Port Reuse Behavior".to_string());
    
    let port = NetworkUtils::get_available_port();
    let bind_addr = SocketAddr::new(IpAddr::V4(Ipv4Addr::new(127, 0, 0, 1)), port);
    
    // Bind and immediately drop
    {
        let _listener = tokio::net::TcpListener::bind(bind_addr).await.unwrap();
    } // listener is dropped here
    
    // Try to bind again immediately
    tokio::time::sleep(Duration::from_millis(100)).await;
    
    match tokio::net::TcpListener::bind(bind_addr).await {
        Ok(_) => {
            result
                .with_success(true)
                .add_metadata("platform".to_string(), get_platform_name())
                .add_metadata("immediate_reuse".to_string(), "true".to_string())
        }
        Err(_) => {
            // Wait a bit longer and try again
            tokio::time::sleep(Duration::from_secs(1)).await;
            
            match tokio::net::TcpListener::bind(bind_addr).await {
                Ok(_) => {
                    result
                        .with_success(true)
                        .add_metadata("platform".to_string(), get_platform_name())
                        .add_metadata("immediate_reuse".to_string(), "false".to_string())
                        .add_metadata("delayed_reuse".to_string(), "true".to_string())
                }
                Err(e) => result.with_error(format!("Port reuse failed even after delay: {}", e)),
            }
        }
    }
}

/// Test localhost resolution
async fn test_localhost_resolution() -> TestResult {
    let mut result = TestResult::new("Localhost Resolution".to_string());
    
    let addresses = vec![
        "127.0.0.1:0",
        "localhost:0",
        "::1:0", // IPv6 localhost
    ];
    
    let mut successful_binds = 0;
    let mut resolution_info = Vec::new();
    
    for addr_str in addresses {
        match addr_str.parse::<SocketAddr>() {
            Ok(addr) => {
                match tokio::net::TcpListener::bind(addr).await {
                    Ok(listener) => {
                        successful_binds += 1;
                        let local_addr = listener.local_addr().unwrap();
                        resolution_info.push(format!("{} -> {}", addr_str, local_addr));
                    }
                    Err(_) => {
                        resolution_info.push(format!("{} -> failed", addr_str));
                    }
                }
            }
            Err(_) => {
                // Try to resolve as hostname
                match tokio::net::lookup_host(addr_str).await {
                    Ok(mut addrs) => {
                        if let Some(resolved_addr) = addrs.next() {
                            resolution_info.push(format!("{} -> {}", addr_str, resolved_addr));
                        }
                    }
                    Err(_) => {
                        resolution_info.push(format!("{} -> resolution failed", addr_str));
                    }
                }
            }
        }
    }
    
    result
        .with_success(successful_binds > 0)
        .add_metadata("platform".to_string(), get_platform_name())
        .add_metadata("successful_binds".to_string(), successful_binds.to_string())
        .add_metadata("resolution_info".to_string(), resolution_info.join("; "))
}

/// Test platform-specific transfer behaviors
pub async fn test_platform_transfer_behavior() -> Vec<TestResult> {
    let mut results = Vec::new();
    
    results.push(test_large_file_handling().await);
    results.push(test_concurrent_connections().await);
    
    results
}

/// Test large file handling on different platforms
async fn test_large_file_handling() -> TestResult {
    let mut result = TestResult::new("Large File Handling".to_string());
    
    // Only run this test if explicitly requested (due to size)
    if std::env::var("E2E_LARGE_FILES").is_err() {
        return result
            .with_success(true)
            .add_metadata("skipped".to_string(), "set E2E_LARGE_FILES to enable".to_string());
    }
    
    let env = TestEnvironment::new().await;
    let large_file = env.test_files_dir.join("large_platform_test.bin");
    
    // Create a 50MB file
    let file_size = 50 * 1024 * 1024;
    
    match TestFileGenerator::create_binary_file(&large_file, file_size).await {
        Ok(_) => {
            // Verify the file was created correctly
            match tokio::fs::metadata(&large_file).await {
                Ok(metadata) => {
                    if metadata.len() == file_size as u64 {
                        result
                            .with_success(true)
                            .add_metadata("platform".to_string(), get_platform_name())
                            .add_metadata("file_size_mb".to_string(), "50".to_string())
                    } else {
                        result.with_error(format!("File size mismatch: expected {}, got {}", file_size, metadata.len()))
                    }
                }
                Err(e) => result.with_error(format!("Failed to read file metadata: {}", e)),
            }
        }
        Err(e) => result.with_error(format!("Failed to create large file: {}", e)),
    }
}

/// Test concurrent connection handling
async fn test_concurrent_connections() -> TestResult {
    let mut result = TestResult::new("Concurrent Connections".to_string());
    
    let base_port = NetworkUtils::get_available_port();
    let mut successful_binds = 0;
    let connection_count = 5;
    
    let mut listeners = Vec::new();
    
    for i in 0..connection_count {
        let port = base_port + i;
        let bind_addr = SocketAddr::new(IpAddr::V4(Ipv4Addr::new(127, 0, 0, 1)), port);
        
        match tokio::net::TcpListener::bind(bind_addr).await {
            Ok(listener) => {
                successful_binds += 1;
                listeners.push(listener);
            }
            Err(_) => break,
        }
    }
    
    // Clean up
    drop(listeners);
    
    result
        .with_success(successful_binds >= connection_count / 2)
        .add_metadata("platform".to_string(), get_platform_name())
        .add_metadata("successful_binds".to_string(), successful_binds.to_string())
        .add_metadata("attempted_binds".to_string(), connection_count.to_string())
}

/// Get platform name for metadata
fn get_platform_name() -> String {
    if cfg!(target_os = "windows") {
        "Windows".to_string()
    } else if cfg!(target_os = "macos") {
        "macOS".to_string()
    } else if cfg!(target_os = "linux") {
        "Linux".to_string()
    } else {
        "Unknown".to_string()
    }
}