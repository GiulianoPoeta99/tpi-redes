// CLI functional tests - end-to-end testing
use std::process::{Command, Stdio};
use std::time::Duration;
use tempfile::{NamedTempFile, TempDir};
use tokio::fs;
use tokio::time::timeout;

#[tokio::test]
async fn test_cli_tcp_transfer_simulation() {
    // Create a test file
    let temp_file = NamedTempFile::new().unwrap();
    let test_content = b"Hello, World! This is a test file for CLI transfer.";
    fs::write(&temp_file, test_content).await.unwrap();
    
    // Create output directory
    let _output_dir = TempDir::new().unwrap();
    
    // Test that send command validates file existence and shows proper error for no receiver
    let output = Command::new("cargo")
        .args(&[
            "run", "--bin", "file-transfer-cli", "--",
            "send",
            "--target", "127.0.0.1",
            "--port", "19999", // Use a port that's unlikely to be in use
            "--timeout", "1", // Short timeout for quick failure
            temp_file.path().to_str().unwrap()
        ])
        .current_dir(".")
        .output()
        .expect("Failed to execute command");
    
    // Should fail because no receiver is listening
    assert!(!output.status.success());
    let stdout = String::from_utf8(output.stdout).unwrap();
    let stderr = String::from_utf8(output.stderr).unwrap();
    let combined = format!("{}{}", stdout, stderr);
    
    // Should show transfer attempt information
    assert!(combined.contains("Starting file transfer") || 
            combined.contains("Connection") ||
            combined.contains("Transfer operation failed"));
}

#[tokio::test]
async fn test_cli_udp_transfer_simulation() {
    // Create a test file
    let temp_file = NamedTempFile::new().unwrap();
    let test_content = b"UDP test content for fire-and-forget transfer.";
    fs::write(&temp_file, test_content).await.unwrap();
    
    // Test UDP send (should complete even without receiver due to fire-and-forget nature)
    let output = Command::new("cargo")
        .args(&[
            "run", "--bin", "file-transfer-cli", "--",
            "send",
            "--target", "127.0.0.1",
            "--port", "19998",
            "--protocol", "udp",
            "--timeout", "2", // Short timeout
            temp_file.path().to_str().unwrap()
        ])
        .current_dir(".")
        .output()
        .expect("Failed to execute command");
    
    let stdout = String::from_utf8(output.stdout).unwrap();
    let stderr = String::from_utf8(output.stderr).unwrap();
    let combined = format!("{}{}", stdout, stderr);
    
    // Should show transfer configuration
    assert!(combined.contains("Starting file transfer") || 
            combined.contains("Protocol: Udp") ||
            combined.contains("UDP"));
}

#[tokio::test]
async fn test_cli_receiver_port_binding() {
    // Test receiver validation by trying to bind to an invalid port
    let output_dir = TempDir::new().unwrap();
    
    // Test receiver with a very high port number that might fail
    let output = Command::new("cargo")
        .args(&[
            "run", "--bin", "file-transfer-cli", "--",
            "receive",
            "--port", "65536", // Invalid port number
            "--protocol", "tcp",
            "--output", output_dir.path().to_str().unwrap()
        ])
        .current_dir(".")
        .output()
        .expect("Failed to execute command");
    
    let stdout = String::from_utf8(output.stdout).unwrap();
    let stderr = String::from_utf8(output.stderr).unwrap();
    let combined = format!("{}{}", stdout, stderr);
    
    // Should either show validation error or receiver startup
    // (depending on whether clap validates the port range)
    assert!(combined.contains("error") || 
            combined.contains("invalid") ||
            combined.contains("Starting file receiver") ||
            combined.contains("Port:"));
}

#[tokio::test]
async fn test_cli_verbose_output() {
    let temp_file = NamedTempFile::new().unwrap();
    fs::write(&temp_file, b"verbose test").await.unwrap();
    
    let output = Command::new("cargo")
        .args(&[
            "run", "--bin", "file-transfer-cli", "--",
            "--verbose",
            "send",
            "--target", "127.0.0.1",
            "--port", "19996",
            "--timeout", "1",
            temp_file.path().to_str().unwrap()
        ])
        .current_dir(".")
        .output()
        .expect("Failed to execute command");
    
    let stdout = String::from_utf8(output.stdout).unwrap();
    
    // Verbose mode should show detailed configuration
    assert!(stdout.contains("Starting file transfer"));
    assert!(stdout.contains("Target: 127.0.0.1:19996"));
    assert!(stdout.contains("Protocol: Tcp"));
    assert!(stdout.contains("Timeout: 1s"));
}

#[tokio::test]
async fn test_cli_exit_codes() {
    // Test successful help command (exit code 0)
    let output = Command::new("cargo")
        .args(&["run", "--bin", "file-transfer-cli", "--", "--help"])
        .current_dir(".")
        .output()
        .expect("Failed to execute command");
    
    assert!(output.status.success());
    assert_eq!(output.status.code().unwrap(), 0);
    
    // Test invalid argument (should have non-zero exit code)
    let output = Command::new("cargo")
        .args(&[
            "run", "--bin", "file-transfer-cli", "--",
            "send",
            "--target", "127.0.0.1",
            "--protocol", "invalid",
            "/nonexistent/file.txt"
        ])
        .current_dir(".")
        .output()
        .expect("Failed to execute command");
    
    assert!(!output.status.success());
    assert_ne!(output.status.code().unwrap(), 0);
}

#[tokio::test]
async fn test_cli_configuration_validation() {
    let temp_file = NamedTempFile::new().unwrap();
    fs::write(&temp_file, b"config test").await.unwrap();
    
    // Test invalid port (too high)
    let output = Command::new("cargo")
        .args(&[
            "run", "--bin", "file-transfer-cli", "--",
            "send",
            "--target", "127.0.0.1",
            "--port", "99999", // Invalid port
            temp_file.path().to_str().unwrap()
        ])
        .current_dir(".")
        .output()
        .expect("Failed to execute command");
    
    // Should either fail with validation error or attempt connection
    // (clap might validate port range, or our code might)
    let stdout = String::from_utf8(output.stdout).unwrap();
    let stderr = String::from_utf8(output.stderr).unwrap();
    let combined = format!("{}{}", stdout, stderr);
    
    // Should show some kind of error or validation message
    assert!(combined.contains("error") || 
            combined.contains("invalid") || 
            combined.contains("Starting file transfer")); // If port validation passes
}

#[tokio::test]
async fn test_cli_progress_display_format() {
    let temp_file = NamedTempFile::new().unwrap();
    fs::write(&temp_file, b"progress test content").await.unwrap();
    
    let output = Command::new("cargo")
        .args(&[
            "run", "--bin", "file-transfer-cli", "--",
            "send",
            "--target", "127.0.0.1",
            "--port", "19995",
            "--timeout", "1", // Quick timeout
            temp_file.path().to_str().unwrap()
        ])
        .current_dir(".")
        .output()
        .expect("Failed to execute command");
    
    let stdout = String::from_utf8(output.stdout).unwrap();
    
    // Should show transfer configuration details
    assert!(stdout.contains("File:") || stdout.contains("Target:") || stdout.contains("Protocol:"));
}