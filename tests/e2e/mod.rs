// End-to-End Testing Module
// Provides common utilities and setup for all E2E tests

use file_transfer_backend::{
    config::{TransferConfig, Protocol, TransferMode},
    core::transfer::CommunicationManager,
    errors::TransferError,
};
use std::net::{SocketAddr, IpAddr, Ipv4Addr};
use std::path::{Path, PathBuf};
use std::time::{Duration, Instant};
use tempfile::{NamedTempFile, TempDir};
use tokio::fs;
use tokio::io::AsyncWriteExt;
use rand::{Rng, RngCore};

pub mod workflows;
pub mod cross_platform;
pub mod performance;
pub mod stress;
pub mod network_sim;
pub mod security;

/// Test environment configuration
#[derive(Debug, Clone)]
pub struct TestEnvironment {
    pub temp_dir: PathBuf,
    pub test_files_dir: PathBuf,
    pub downloads_dir: PathBuf,
}

impl TestEnvironment {
    pub async fn new() -> Self {
        let temp_dir = TempDir::new().unwrap().into_path();
        let test_files_dir = temp_dir.join("test_files");
        let downloads_dir = temp_dir.join("downloads");
        
        fs::create_dir_all(&test_files_dir).await.unwrap();
        fs::create_dir_all(&downloads_dir).await.unwrap();
        
        Self {
            temp_dir,
            test_files_dir,
            downloads_dir,
        }
    }
}

/// Test file generator for various sizes and types
pub struct TestFileGenerator;

impl TestFileGenerator {
    /// Generate a text file with specified size
    pub async fn create_text_file(path: &Path, size_bytes: usize) -> Result<(), std::io::Error> {
        let mut file = fs::File::create(path).await?;
        let content = "Lorem ipsum dolor sit amet, consectetur adipiscing elit. ".repeat(size_bytes / 56 + 1);
        let truncated = &content.as_bytes()[..size_bytes];
        file.write_all(truncated).await?;
        file.flush().await?;
        Ok(())
    }
    
    /// Generate a binary file with random data
    pub async fn create_binary_file(path: &Path, size_bytes: usize) -> Result<(), std::io::Error> {
        let mut file = fs::File::create(path).await?;
        let mut rng = rand::thread_rng();
        
        const CHUNK_SIZE: usize = 8192;
        let mut remaining = size_bytes;
        
        while remaining > 0 {
            let chunk_size = std::cmp::min(CHUNK_SIZE, remaining);
            let mut chunk = vec![0u8; chunk_size];
            rng.fill_bytes(&mut chunk);
            file.write_all(&chunk).await?;
            remaining -= chunk_size;
        }
        
        file.flush().await?;
        Ok(())
    }
    
    /// Create test files of various sizes
    pub async fn create_test_suite(base_dir: &Path) -> Result<Vec<PathBuf>, std::io::Error> {
        let mut files = Vec::new();
        
        // Small files (1KB - 100KB)
        for (name, size) in [
            ("small_text_1kb.txt", 1024),
            ("small_text_10kb.txt", 10 * 1024),
            ("small_binary_50kb.bin", 50 * 1024),
            ("small_binary_100kb.bin", 100 * 1024),
        ] {
            let path = base_dir.join(name);
            if name.ends_with(".txt") {
                Self::create_text_file(&path, size).await?;
            } else {
                Self::create_binary_file(&path, size).await?;
            }
            files.push(path);
        }
        
        // Medium files (1MB - 10MB)
        for (name, size) in [
            ("medium_text_1mb.txt", 1024 * 1024),
            ("medium_binary_5mb.bin", 5 * 1024 * 1024),
            ("medium_binary_10mb.bin", 10 * 1024 * 1024),
        ] {
            let path = base_dir.join(name);
            if name.ends_with(".txt") {
                Self::create_text_file(&path, size).await?;
            } else {
                Self::create_binary_file(&path, size).await?;
            }
            files.push(path);
        }
        
        // Large files (100MB - 1GB) - only create if explicitly requested
        if std::env::var("E2E_LARGE_FILES").is_ok() {
            for (name, size) in [
                ("large_binary_100mb.bin", 100 * 1024 * 1024),
                ("large_binary_1gb.bin", 1024 * 1024 * 1024),
            ] {
                let path = base_dir.join(name);
                Self::create_binary_file(&path, size).await?;
                files.push(path);
            }
        }
        
        Ok(files)
    }
}

/// Network utilities for testing
pub struct NetworkUtils;

impl NetworkUtils {
    /// Get an available port for testing
    pub fn get_available_port() -> u16 {
        let listener = std::net::TcpListener::bind("127.0.0.1:0").unwrap();
        let port = listener.local_addr().unwrap().port();
        drop(listener);
        port
    }
    
    /// Check if a port is available
    pub fn is_port_available(port: u16) -> bool {
        std::net::TcpListener::bind(format!("127.0.0.1:{}", port)).is_ok()
    }
    
    /// Wait for a service to be available on a port
    pub async fn wait_for_service(addr: SocketAddr, timeout: Duration) -> bool {
        let start = Instant::now();
        
        while start.elapsed() < timeout {
            if let Ok(_) = tokio::net::TcpStream::connect(addr).await {
                return true;
            }
            tokio::time::sleep(Duration::from_millis(100)).await;
        }
        
        false
    }
}

/// Transfer test utilities
pub struct TransferTestUtils;

impl TransferTestUtils {
    /// Create a standard TCP configuration for testing
    pub fn create_tcp_config(mode: TransferMode, port: u16, target_ip: Option<String>) -> TransferConfig {
        TransferConfig {
            mode,
            protocol: Protocol::Tcp,
            target_ip,
            port,
            filename: None,
            chunk_size: 8192,
            timeout: Duration::from_secs(30),
        }
    }
    
    /// Create a standard UDP configuration for testing
    pub fn create_udp_config(mode: TransferMode, port: u16, target_ip: Option<String>) -> TransferConfig {
        TransferConfig {
            mode,
            protocol: Protocol::Udp,
            target_ip,
            port,
            filename: None,
            chunk_size: 1024,
            timeout: Duration::from_secs(30),
        }
    }
    
    /// Verify file integrity after transfer
    pub async fn verify_file_integrity(original: &Path, transferred: &Path) -> Result<bool, std::io::Error> {
        let original_content = fs::read(original).await?;
        let transferred_content = fs::read(transferred).await?;
        Ok(original_content == transferred_content)
    }
    
    /// Calculate file checksum
    pub async fn calculate_checksum(path: &Path) -> Result<String, std::io::Error> {
        use sha2::{Sha256, Digest};
        
        let content = fs::read(path).await?;
        let mut hasher = Sha256::new();
        hasher.update(&content);
        Ok(format!("{:x}", hasher.finalize()))
    }
}

/// Performance measurement utilities
pub struct PerformanceUtils;

impl PerformanceUtils {
    /// Measure transfer performance
    pub fn measure_transfer<F, Fut>(operation: F) -> impl std::future::Future<Output = (Duration, F::Output)>
    where
        F: FnOnce() -> Fut,
        Fut: std::future::Future,
    {
        async move {
            let start = Instant::now();
            let result = operation().await;
            let duration = start.elapsed();
            (duration, result)
        }
    }
    
    /// Calculate transfer speed in MB/s
    pub fn calculate_speed_mbps(bytes: u64, duration: Duration) -> f64 {
        let seconds = duration.as_secs_f64();
        let megabytes = bytes as f64 / (1024.0 * 1024.0);
        if seconds > 0.0 {
            megabytes / seconds
        } else {
            0.0
        }
    }
    
    /// Get system memory usage
    pub fn get_memory_usage() -> Option<u64> {
        // Platform-specific memory usage detection
        #[cfg(target_os = "linux")]
        {
            use std::fs;
            if let Ok(status) = fs::read_to_string("/proc/self/status") {
                for line in status.lines() {
                    if line.starts_with("VmRSS:") {
                        if let Some(kb_str) = line.split_whitespace().nth(1) {
                            if let Ok(kb) = kb_str.parse::<u64>() {
                                return Some(kb * 1024); // Convert to bytes
                            }
                        }
                    }
                }
            }
        }
        
        #[cfg(target_os = "windows")]
        {
            // Windows memory usage would require additional dependencies
            // For now, return None to indicate unavailable
        }
        
        #[cfg(target_os = "macos")]
        {
            // macOS memory usage would require additional dependencies
            // For now, return None to indicate unavailable
        }
        
        None
    }
}

/// Test result aggregation
#[derive(Debug, Clone)]
pub struct TestResult {
    pub test_name: String,
    pub success: bool,
    pub duration: Duration,
    pub bytes_transferred: u64,
    pub speed_mbps: f64,
    pub error: Option<String>,
    pub metadata: std::collections::HashMap<String, String>,
}

impl TestResult {
    pub fn new(test_name: String) -> Self {
        Self {
            test_name,
            success: false,
            duration: Duration::ZERO,
            bytes_transferred: 0,
            speed_mbps: 0.0,
            error: None,
            metadata: std::collections::HashMap::new(),
        }
    }
    
    pub fn with_success(mut self, success: bool) -> Self {
        self.success = success;
        self
    }
    
    pub fn with_duration(mut self, duration: Duration) -> Self {
        self.duration = duration;
        self
    }
    
    pub fn with_bytes_transferred(mut self, bytes: u64) -> Self {
        self.bytes_transferred = bytes;
        self.speed_mbps = PerformanceUtils::calculate_speed_mbps(bytes, self.duration);
        self
    }
    
    pub fn with_error(mut self, error: String) -> Self {
        self.error = Some(error);
        self.success = false;
        self
    }
    
    pub fn add_metadata(mut self, key: String, value: String) -> Self {
        self.metadata.insert(key, value);
        self
    }
}

/// Test suite runner
pub struct TestSuiteRunner {
    pub results: Vec<TestResult>,
}

impl TestSuiteRunner {
    pub fn new() -> Self {
        Self {
            results: Vec::new(),
        }
    }
    
    pub fn add_result(&mut self, result: TestResult) {
        self.results.push(result);
    }
    
    pub fn print_summary(&self) {
        println!("\n=== E2E Test Suite Summary ===");
        
        let total = self.results.len();
        let passed = self.results.iter().filter(|r| r.success).count();
        let failed = total - passed;
        
        println!("Total tests: {}", total);
        println!("Passed: {}", passed);
        println!("Failed: {}", failed);
        println!("Success rate: {:.1}%", (passed as f64 / total as f64) * 100.0);
        
        if failed > 0 {
            println!("\nFailed tests:");
            for result in &self.results {
                if !result.success {
                    println!("  - {}: {}", result.test_name, 
                        result.error.as_ref().unwrap_or(&"Unknown error".to_string()));
                }
            }
        }
        
        // Performance summary
        let total_bytes: u64 = self.results.iter().map(|r| r.bytes_transferred).sum();
        let avg_speed: f64 = self.results.iter()
            .filter(|r| r.success && r.speed_mbps > 0.0)
            .map(|r| r.speed_mbps)
            .sum::<f64>() / self.results.iter().filter(|r| r.success).count() as f64;
        
        println!("\nPerformance Summary:");
        println!("Total bytes transferred: {:.2} MB", total_bytes as f64 / (1024.0 * 1024.0));
        println!("Average transfer speed: {:.2} MB/s", avg_speed);
    }
}