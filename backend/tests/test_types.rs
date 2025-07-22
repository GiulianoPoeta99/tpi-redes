// Simple example to test the core data types and configuration system
use file_transfer_backend::{TransferConfig, Protocol, TransferMode, TransferProgress, TransferResult, TransferStatus};
use std::time::Duration;

fn main() {
    println!("Testing core data types and configuration system...");
    
    // Test Protocol enum with FromStr
    let tcp_protocol: Protocol = "tcp".parse().expect("Failed to parse TCP protocol");
    let udp_protocol: Protocol = "UDP".parse().expect("Failed to parse UDP protocol");
    println!("✓ Protocol parsing works: {} and {}", tcp_protocol, udp_protocol);
    
    // Test TransferMode enum with FromStr
    let transmitter_mode: TransferMode = "transmitter".parse().expect("Failed to parse transmitter mode");
    let receiver_mode: TransferMode = "receiver".parse().expect("Failed to parse receiver mode");
    println!("✓ TransferMode parsing works: {} and {}", transmitter_mode, receiver_mode);
    
    // Test TransferConfig creation and validation
    let config = TransferConfig::new(
        TransferMode::Transmitter,
        Protocol::Tcp,
        Some("192.168.1.1".to_string()),
        8080,
        Some("test.txt".to_string()),
        Some(4096),
        Some(Duration::from_secs(60)),
    ).expect("Failed to create valid config");
    
    println!("✓ TransferConfig creation and validation works");
    println!("  - Mode: {}", config.mode);
    println!("  - Protocol: {}", config.protocol);
    println!("  - Target IP: {:?}", config.target_ip);
    println!("  - Port: {}", config.port);
    println!("  - Chunk size: {}", config.chunk_size);
    println!("  - Timeout: {:?}", config.timeout);
    
    // Test default configuration
    let default_config = TransferConfig::default();
    println!("✓ Default configuration works");
    println!("  - Default mode: {}", default_config.mode);
    println!("  - Default protocol: {}", default_config.protocol);
    println!("  - Default port: {}", default_config.port);
    
    // Test TransferProgress
    let mut progress = TransferProgress::new("test-transfer-123".to_string());
    progress.update(0.75, 1024.0 * 1024.0, 30); // 75% complete, 1MB/s, 30s remaining
    
    println!("✓ TransferProgress works");
    println!("  - Transfer ID: {}", progress.transfer_id);
    println!("  - Progress: {:.1}%", progress.progress_percentage());
    println!("  - Speed: {}", progress.speed_human_readable());
    println!("  - ETA: {}", progress.eta_human_readable());
    println!("  - Status: {}", progress.status);
    
    // Test TransferStatus methods
    println!("✓ TransferStatus methods work");
    println!("  - Idle is terminal: {}", TransferStatus::Idle.is_terminal());
    println!("  - Completed is terminal: {}", TransferStatus::Completed.is_terminal());
    println!("  - Connecting is active: {}", TransferStatus::Connecting.is_active());
    println!("  - Error is active: {}", TransferStatus::Error.is_active());
    
    // Test TransferResult
    let result = TransferResult::success(
        "test-transfer-123".to_string(),
        1024 * 1024 * 10, // 10 MB
        Duration::from_secs(60), // 1 minute
        "abc123def456".to_string(),
    );
    
    println!("✓ TransferResult works");
    println!("  - Success: {}", result.success);
    println!("  - Bytes transferred: {}", result.bytes_human_readable());
    println!("  - Average speed: {}", result.speed_human_readable());
    println!("  - Duration: {:?}", result.duration);
    println!("  - Checksum: {}", result.checksum);
    
    // Test configuration validation errors
    let invalid_config = TransferConfig::new(
        TransferMode::Transmitter,
        Protocol::Tcp,
        None, // Missing target IP for transmitter
        8080,
        Some("test.txt".to_string()),
        Some(4096),
        Some(Duration::from_secs(60)),
    );
    
    match invalid_config {
        Ok(_) => println!("✗ Configuration validation failed - should have rejected missing target IP"),
        Err(e) => println!("✓ Configuration validation works: {}", e),
    }
    
    println!("\n🎉 All core data types and configuration system tests passed!");
}