// CLI integration tests
use std::process::Command;
use std::path::PathBuf;
use tempfile::{NamedTempFile, TempDir};
use tokio::fs;

#[tokio::test]
async fn test_cli_help_command() {
    let output = Command::new("cargo")
        .args(&["run", "--bin", "file-transfer-cli", "--", "--help"])
        .current_dir(".")
        .output()
        .expect("Failed to execute command");

    assert!(output.status.success());
    let stdout = String::from_utf8(output.stdout).unwrap();
    assert!(stdout.contains("A socket-based file transfer application"));
    assert!(stdout.contains("send"));
    assert!(stdout.contains("receive"));
    assert!(stdout.contains("list"));
    assert!(stdout.contains("cancel"));
}

#[tokio::test]
async fn test_cli_version_command() {
    let output = Command::new("cargo")
        .args(&["run", "--bin", "file-transfer-cli", "--", "--version"])
        .current_dir(".")
        .output()
        .expect("Failed to execute command");

    assert!(output.status.success());
    let stdout = String::from_utf8(output.stdout).unwrap();
    assert!(stdout.contains("0.1.0"));
}

#[tokio::test]
async fn test_cli_send_help() {
    let output = Command::new("cargo")
        .args(&["run", "--bin", "file-transfer-cli", "--", "send", "--help"])
        .current_dir(".")
        .output()
        .expect("Failed to execute command");

    assert!(output.status.success());
    let stdout = String::from_utf8(output.stdout).unwrap();
    assert!(stdout.contains("Send a file to another machine"));
    assert!(stdout.contains("--target"));
    assert!(stdout.contains("--port"));
    assert!(stdout.contains("--protocol"));
}

#[tokio::test]
async fn test_cli_receive_help() {
    let output = Command::new("cargo")
        .args(&["run", "--bin", "file-transfer-cli", "--", "receive", "--help"])
        .current_dir(".")
        .output()
        .expect("Failed to execute command");

    assert!(output.status.success());
    let stdout = String::from_utf8(output.stdout).unwrap();
    assert!(stdout.contains("Receive files from another machine"));
    assert!(stdout.contains("--port"));
    assert!(stdout.contains("--protocol"));
    assert!(stdout.contains("--output"));
}

#[tokio::test]
async fn test_cli_send_missing_target() {
    let temp_file = NamedTempFile::new().unwrap();
    fs::write(&temp_file, b"test content").await.unwrap();

    let output = Command::new("cargo")
        .args(&[
            "run", "--bin", "file-transfer-cli", "--",
            "send",
            temp_file.path().to_str().unwrap()
        ])
        .current_dir(".")
        .output()
        .expect("Failed to execute command");

    assert!(!output.status.success());
    let stderr = String::from_utf8(output.stderr).unwrap();
    assert!(stderr.contains("required") || stderr.contains("target"));
}

#[tokio::test]
async fn test_cli_send_nonexistent_file() {
    let output = Command::new("cargo")
        .args(&[
            "run", "--bin", "file-transfer-cli", "--",
            "send",
            "--target", "127.0.0.1",
            "/nonexistent/file.txt"
        ])
        .current_dir(".")
        .output()
        .expect("Failed to execute command");

    assert!(!output.status.success());
    let stdout = String::from_utf8(output.stdout).unwrap();
    let stderr = String::from_utf8(output.stderr).unwrap();
    let combined = format!("{}{}", stdout, stderr);
    assert!(combined.contains("does not exist") || combined.contains("No such file"));
}

#[tokio::test]
async fn test_cli_send_invalid_protocol() {
    let temp_file = NamedTempFile::new().unwrap();
    fs::write(&temp_file, b"test content").await.unwrap();

    let output = Command::new("cargo")
        .args(&[
            "run", "--bin", "file-transfer-cli", "--",
            "send",
            "--target", "127.0.0.1",
            "--protocol", "invalid",
            temp_file.path().to_str().unwrap()
        ])
        .current_dir(".")
        .output()
        .expect("Failed to execute command");

    assert!(!output.status.success());
    let stdout = String::from_utf8(output.stdout).unwrap();
    let stderr = String::from_utf8(output.stderr).unwrap();
    let combined = format!("{}{}", stdout, stderr);
    assert!(combined.contains("Invalid protocol"));
}

#[tokio::test]
async fn test_cli_receive_invalid_protocol() {
    let temp_dir = TempDir::new().unwrap();

    let output = Command::new("cargo")
        .args(&[
            "run", "--bin", "file-transfer-cli", "--",
            "receive",
            "--protocol", "invalid",
            "--output", temp_dir.path().to_str().unwrap()
        ])
        .current_dir(".")
        .output()
        .expect("Failed to execute command");

    assert!(!output.status.success());
    let stdout = String::from_utf8(output.stdout).unwrap();
    let stderr = String::from_utf8(output.stderr).unwrap();
    let combined = format!("{}{}", stdout, stderr);
    assert!(combined.contains("Invalid protocol"));
}

#[tokio::test]
async fn test_cli_list_no_active_transfers() {
    let output = Command::new("cargo")
        .args(&["run", "--bin", "file-transfer-cli", "--", "list"])
        .current_dir(".")
        .output()
        .expect("Failed to execute command");

    assert!(output.status.success());
    let stdout = String::from_utf8(output.stdout).unwrap();
    assert!(stdout.contains("No active transfers"));
}

#[tokio::test]
async fn test_cli_cancel_nonexistent_transfer() {
    let output = Command::new("cargo")
        .args(&[
            "run", "--bin", "file-transfer-cli", "--",
            "cancel", "nonexistent-id"
        ])
        .current_dir(".")
        .output()
        .expect("Failed to execute command");

    assert!(!output.status.success());
    let stdout = String::from_utf8(output.stdout).unwrap();
    let stderr = String::from_utf8(output.stderr).unwrap();
    let combined = format!("{}{}", stdout, stderr);
    assert!(combined.contains("Failed to cancel") || combined.contains("not found"));
}

#[tokio::test]
async fn test_cli_verbose_flag() {
    let temp_file = NamedTempFile::new().unwrap();
    fs::write(&temp_file, b"test content").await.unwrap();

    let output = Command::new("cargo")
        .args(&[
            "run", "--bin", "file-transfer-cli", "--",
            "--verbose",
            "send",
            "--target", "127.0.0.1",
            "--port", "9999", // Use a port that's likely to fail quickly
            temp_file.path().to_str().unwrap()
        ])
        .current_dir(".")
        .output()
        .expect("Failed to execute command");

    // The command should attempt to run (may fail due to no receiver)
    // but should show verbose output
    let stdout = String::from_utf8(output.stdout).unwrap();
    let stderr = String::from_utf8(output.stderr).unwrap();
    let combined = format!("{}{}", stdout, stderr);
    
    // Should show configuration details
    assert!(combined.contains("Starting file transfer") || 
            combined.contains("Target: 127.0.0.1:9999") ||
            combined.contains("Protocol: Tcp"));
}

#[tokio::test]
async fn test_cli_debug_flag() {
    let temp_file = NamedTempFile::new().unwrap();
    fs::write(&temp_file, b"test content").await.unwrap();

    let output = Command::new("cargo")
        .args(&[
            "run", "--bin", "file-transfer-cli", "--",
            "--debug",
            "send",
            "--target", "127.0.0.1",
            "--port", "9998", // Use a port that's likely to fail quickly
            temp_file.path().to_str().unwrap()
        ])
        .current_dir(".")
        .output()
        .expect("Failed to execute command");

    // The command should attempt to run (may fail due to no receiver)
    // but should show debug output
    let stdout = String::from_utf8(output.stdout).unwrap();
    let stderr = String::from_utf8(output.stderr).unwrap();
    let combined = format!("{}{}", stdout, stderr);
    
    // Should show configuration details and debug info
    assert!(combined.contains("Starting file transfer") || 
            combined.contains("Target: 127.0.0.1:9998") ||
            combined.contains("DEBUG") ||
            combined.contains("Transfer started with ID"));
}

#[tokio::test]
async fn test_cli_custom_chunk_size() {
    let temp_file = NamedTempFile::new().unwrap();
    fs::write(&temp_file, b"test content").await.unwrap();

    let output = Command::new("cargo")
        .args(&[
            "run", "--bin", "file-transfer-cli", "--",
            "send",
            "--target", "127.0.0.1",
            "--port", "9997",
            "--chunk-size", "4096",
            temp_file.path().to_str().unwrap()
        ])
        .current_dir(".")
        .output()
        .expect("Failed to execute command");

    let stdout = String::from_utf8(output.stdout).unwrap();
    assert!(stdout.contains("Chunk size: 4096 bytes"));
}

#[tokio::test]
async fn test_cli_custom_timeout() {
    let temp_file = NamedTempFile::new().unwrap();
    fs::write(&temp_file, b"test content").await.unwrap();

    let output = Command::new("cargo")
        .args(&[
            "run", "--bin", "file-transfer-cli", "--",
            "send",
            "--target", "127.0.0.1",
            "--port", "9996",
            "--timeout", "60",
            temp_file.path().to_str().unwrap()
        ])
        .current_dir(".")
        .output()
        .expect("Failed to execute command");

    let stdout = String::from_utf8(output.stdout).unwrap();
    assert!(stdout.contains("Timeout: 60s"));
}

#[tokio::test]
async fn test_cli_receive_custom_output_dir() {
    let temp_dir = TempDir::new().unwrap();

    let output = Command::new("cargo")
        .args(&[
            "run", "--bin", "file-transfer-cli", "--",
            "receive",
            "--port", "9995",
            "--output", temp_dir.path().to_str().unwrap()
        ])
        .current_dir(".")
        .output()
        .expect("Failed to execute command");

    let stdout = String::from_utf8(output.stdout).unwrap();
    assert!(stdout.contains("Output directory:"));
    assert!(stdout.contains(temp_dir.path().to_str().unwrap()));
}