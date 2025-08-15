// Performance Testing Module
// Tests transfer performance with various file sizes and conditions

use crate::e2e::{TestEnvironment, TestFileGenerator, NetworkUtils, TransferTestUtils, TestResult, PerformanceUtils};
use file_transfer_backend::{
    config::{TransferConfig, Protocol, TransferMode},
    core::transfer::CommunicationManager,
};
use std::net::{SocketAddr, IpAddr, Ipv4Addr};
use std::time::{Duration, Instant};
use tokio::time::timeout;

/// Performance test configuration
#[derive(Debug, Clone)]
pub struct PerformanceTestConfig {
    pub file_sizes: Vec<usize>,
    pub protocols: Vec<Protocol>,
    pub iterations: usize,
    pub timeout_seconds: u64,
}

impl Default for PerformanceTestConfig {
    fn default() -> Self {
        Self {
            file_sizes: vec![
                1024,           // 1KB
                10 * 1024,      // 10KB
                100 * 1024,     // 100KB
                1024 * 1024,    // 1MB
                10 * 1024 * 1024, // 10MB
            ],
            protocols: vec![Protocol::Tcp, Protocol::Udp],
            iterations: 3,
            timeout_seconds: 60,
        }
    }
}

/// Run comprehensive performance tests
pub async fn run_performance_suite() -> Vec<TestResult> {
    let mut results = Vec::new();
    let config = PerformanceTestConfig::default();
    
    // Basic performance tests
    results.extend(test_transfer_speeds(&config).await);
    
    // Memory usage tests
    results.extend(test_memory_usage(&config).await);
    
    // Throughput tests
    results.extend(test_throughput_scaling(&config).await);
    
    // Large file tests (if enabled)
    if std::env::var("E2E_LARGE_FILES").is_ok() {
        results.extend(test_large_file_performance().await);
    }
    
    results
}

/// Test transfer speeds for different file sizes
async fn test_transfer_speeds(config: &PerformanceTestConfig) -> Vec<TestResult> {
    let mut results = Vec::new();
    
    for &file_size in &config.file_sizes {
        for &protocol in &config.protocols {
            let test_name = format!("Transfer Speed - {} - {}KB", 
                match protocol {
                    Protocol::Tcp => "TCP",
                    Protocol::Udp => "UDP",
                },
                file_size / 1024
            );
            
            let mut iteration_results = Vec::new();
            
            for iteration in 0..config.iterations {
                let iteration_result = test_single_transfer_speed(
                    protocol, 
                    file_size, 
                    config.timeout_seconds,
                    iteration
                ).await;
                
                iteration_results.push(iteration_result);
            }
            
            // Aggregate results
            let successful_iterations: Vec<_> = iteration_results.iter()
                .filter(|r| r.success)
                .collect();
            
            if !successful_iterations.is_empty() {
                let avg_speed = successful_iterations.iter()
                    .map(|r| r.speed_mbps)
                    .sum::<f64>() / successful_iterations.len() as f64;
                
                let avg_duration = Duration::from_secs_f64(
                    successful_iterations.iter()
                        .map(|r| r.duration.as_secs_f64())
                        .sum::<f64>() / successful_iterations.len() as f64
                );
                
                let result = TestResult::new(test_name)
                    .with_success(true)
                    .with_duration(avg_duration)
                    .with_bytes_transferred(file_size as u64)
                    .add_metadata("protocol".to_string(), format!("{:?}", protocol))
                    .add_metadata("file_size_kb".to_string(), (file_size / 1024).to_string())
                    .add_metadata("iterations".to_string(), config.iterations.to_string())
                    .add_metadata("successful_iterations".to_string(), successful_iterations.len().to_string())
                    .add_metadata("avg_speed_mbps".to_string(), format!("{:.2}", avg_speed));
                
                results.push(result);
            } else {
                let result = TestResult::new(test_name)
                    .with_error("All iterations failed".to_string())
                    .add_metadata("protocol".to_string(), format!("{:?}", protocol))
                    .add_metadata("file_size_kb".to_string(), (file_size / 1024).to_string());
                
                results.push(result);
            }
        }
    }
    
    results
}

/// Test a single transfer for speed measurement
async fn test_single_transfer_speed(
    protocol: Protocol,
    file_size: usize,
    timeout_seconds: u64,
    iteration: usize,
) -> TestResult {
    let test_name = format!("Speed Test Iteration {}", iteration);
    let mut result = TestResult::new(test_name);
    
    let env = TestEnvironment::new().await;
    let port = NetworkUtils::get_available_port();
    let bind_addr = SocketAddr::new(IpAddr::V4(Ipv4Addr::new(127, 0, 0, 1)), port);
    
    // Create test file
    let test_file = env.test_files_dir.join(format!("perf_test_{}_{}.bin", 
        match protocol {
            Protocol::Tcp => "tcp",
            Protocol::Udp => "udp",
        },
        iteration
    ));
    
    if let Err(e) = TestFileGenerator::create_binary_file(&test_file, file_size).await {
        return result.with_error(format!("Failed to create test file: {}", e));
    }
    
    // Configure transfer
    let (receiver_config, sender_config) = match protocol {
        Protocol::Tcp => (
            TransferTestUtils::create_tcp_config(TransferMode::Receiver, port, None),
            TransferTestUtils::create_tcp_config(TransferMode::Transmitter, port, Some("127.0.0.1".to_string())),
        ),
        Protocol::Udp => (
            TransferTestUtils::create_udp_config(TransferMode::Receiver, port, None),
            TransferTestUtils::create_udp_config(TransferMode::Transmitter, port, Some("127.0.0.1".to_string())),
        ),
    };
    
    // Start receiver
    let receiver_output_dir = env.downloads_dir.clone();
    let receiver_task = tokio::spawn(async move {
        CommunicationManager::start_receiver(&receiver_config, bind_addr, receiver_output_dir).await
    });
    
    // Wait for receiver to bind
    let bind_delay = match protocol {
        Protocol::Tcp => Duration::from_millis(500),
        Protocol::Udp => Duration::from_millis(200),
    };
    tokio::time::sleep(bind_delay).await;
    
    // Measure transfer
    let start_time = Instant::now();
    let memory_before = PerformanceUtils::get_memory_usage();
    
    let sender_result = timeout(
        Duration::from_secs(timeout_seconds),
        CommunicationManager::start_sender(&sender_config, test_file, bind_addr)
    ).await;
    
    let transfer_duration = start_time.elapsed();
    let memory_after = PerformanceUtils::get_memory_usage();
    
    // Clean up receiver
    receiver_task.abort();
    
    match sender_result {
        Ok(Ok(transfer_result)) if transfer_result.success => {
            let speed_mbps = PerformanceUtils::calculate_speed_mbps(
                transfer_result.bytes_transferred, 
                transfer_duration
            );
            
            result = result
                .with_success(true)
                .with_duration(transfer_duration)
                .with_bytes_transferred(transfer_result.bytes_transferred)
                .add_metadata("speed_mbps".to_string(), format!("{:.2}", speed_mbps))
                .add_metadata("protocol".to_string(), format!("{:?}", protocol));
            
            // Add memory usage if available
            if let (Some(before), Some(after)) = (memory_before, memory_after) {
                let memory_delta = if after > before { after - before } else { 0 };
                result = result.add_metadata("memory_delta_mb".to_string(), 
                    format!("{:.2}", memory_delta as f64 / (1024.0 * 1024.0)));
            }
            
            result
        }
        Ok(Ok(transfer_result)) => {
            result.with_error(transfer_result.error.unwrap_or("Transfer failed".to_string()))
        }
        Ok(Err(e)) => result.with_error(format!("Transfer error: {}", e)),
        Err(_) => result.with_error("Transfer timed out".to_string()),
    }
}

/// Test memory usage during transfers
async fn test_memory_usage(config: &PerformanceTestConfig) -> Vec<TestResult> {
    let mut results = Vec::new();
    
    // Test memory usage with different file sizes
    for &file_size in &config.file_sizes {
        if file_size >= 1024 * 1024 { // Only test for files >= 1MB
            let result = test_memory_usage_single(file_size).await;
            results.push(result);
        }
    }
    
    results
}

async fn test_memory_usage_single(file_size: usize) -> TestResult {
    let test_name = format!("Memory Usage - {}MB", file_size / (1024 * 1024));
    let mut result = TestResult::new(test_name);
    
    let env = TestEnvironment::new().await;
    let test_file = env.test_files_dir.join("memory_test.bin");
    
    if let Err(e) = TestFileGenerator::create_binary_file(&test_file, file_size).await {
        return result.with_error(format!("Failed to create test file: {}", e));
    }
    
    let port = NetworkUtils::get_available_port();
    let bind_addr = SocketAddr::new(IpAddr::V4(Ipv4Addr::new(127, 0, 0, 1)), port);
    
    let receiver_config = TransferTestUtils::create_tcp_config(TransferMode::Receiver, port, None);
    let sender_config = TransferTestUtils::create_tcp_config(
        TransferMode::Transmitter, port, Some("127.0.0.1".to_string())
    );
    
    // Measure baseline memory
    let memory_baseline = PerformanceUtils::get_memory_usage();
    
    // Start receiver
    let receiver_output_dir = env.downloads_dir.clone();
    let receiver_task = tokio::spawn(async move {
        CommunicationManager::start_receiver(&receiver_config, bind_addr, receiver_output_dir).await
    });
    
    tokio::time::sleep(Duration::from_millis(500)).await;
    
    // Measure memory during transfer
    let memory_during_setup = PerformanceUtils::get_memory_usage();
    
    let sender_result = timeout(
        Duration::from_secs(60),
        CommunicationManager::start_sender(&sender_config, test_file, bind_addr)
    ).await;
    
    let memory_peak = PerformanceUtils::get_memory_usage();
    
    receiver_task.abort();
    
    // Wait for cleanup
    tokio::time::sleep(Duration::from_millis(500)).await;
    let memory_after = PerformanceUtils::get_memory_usage();
    
    match sender_result {
        Ok(Ok(transfer_result)) if transfer_result.success => {
            result = result
                .with_success(true)
                .with_bytes_transferred(transfer_result.bytes_transferred)
                .add_metadata("file_size_mb".to_string(), (file_size / (1024 * 1024)).to_string());
            
            if let Some(baseline) = memory_baseline {
                result = result.add_metadata("memory_baseline_mb".to_string(), 
                    format!("{:.2}", baseline as f64 / (1024.0 * 1024.0)));
            }
            
            if let Some(during) = memory_during_setup {
                result = result.add_metadata("memory_during_mb".to_string(), 
                    format!("{:.2}", during as f64 / (1024.0 * 1024.0)));
            }
            
            if let Some(peak) = memory_peak {
                result = result.add_metadata("memory_peak_mb".to_string(), 
                    format!("{:.2}", peak as f64 / (1024.0 * 1024.0)));
            }
            
            if let Some(after) = memory_after {
                result = result.add_metadata("memory_after_mb".to_string(), 
                    format!("{:.2}", after as f64 / (1024.0 * 1024.0)));
            }
            
            result
        }
        Ok(Ok(transfer_result)) => {
            result.with_error(transfer_result.error.unwrap_or("Transfer failed".to_string()))
        }
        Ok(Err(e)) => result.with_error(format!("Transfer error: {}", e)),
        Err(_) => result.with_error("Transfer timed out".to_string()),
    }
}

/// Test throughput scaling with different configurations
async fn test_throughput_scaling(config: &PerformanceTestConfig) -> Vec<TestResult> {
    let mut results = Vec::new();
    
    // Test different chunk sizes for TCP
    results.push(test_tcp_chunk_size_scaling().await);
    
    // Test UDP packet size impact
    results.push(test_udp_packet_size_scaling().await);
    
    results
}

async fn test_tcp_chunk_size_scaling() -> TestResult {
    let mut result = TestResult::new("TCP Chunk Size Scaling".to_string());
    
    let env = TestEnvironment::new().await;
    let file_size = 1024 * 1024; // 1MB test file
    let test_file = env.test_files_dir.join("chunk_scaling_test.bin");
    
    if let Err(e) = TestFileGenerator::create_binary_file(&test_file, file_size).await {
        return result.with_error(format!("Failed to create test file: {}", e));
    }
    
    let chunk_sizes = vec![1024, 4096, 8192, 16384, 32768]; // 1KB to 32KB
    let mut best_speed = 0.0;
    let mut best_chunk_size = 0;
    
    for chunk_size in chunk_sizes {
        let port = NetworkUtils::get_available_port();
        let bind_addr = SocketAddr::new(IpAddr::V4(Ipv4Addr::new(127, 0, 0, 1)), port);
        
        let mut receiver_config = TransferTestUtils::create_tcp_config(TransferMode::Receiver, port, None);
        receiver_config.chunk_size = chunk_size;
        
        let mut sender_config = TransferTestUtils::create_tcp_config(
            TransferMode::Transmitter, port, Some("127.0.0.1".to_string())
        );
        sender_config.chunk_size = chunk_size;
        
        let receiver_output_dir = env.downloads_dir.clone();
        let receiver_task = tokio::spawn(async move {
            CommunicationManager::start_receiver(&receiver_config, bind_addr, receiver_output_dir).await
        });
        
        tokio::time::sleep(Duration::from_millis(500)).await;
        
        let start_time = Instant::now();
        let sender_result = timeout(
            Duration::from_secs(30),
            CommunicationManager::start_sender(&sender_config, test_file.clone(), bind_addr)
        ).await;
        let transfer_duration = start_time.elapsed();
        
        receiver_task.abort();
        
        if let Ok(Ok(transfer_result)) = sender_result {
            if transfer_result.success {
                let speed = PerformanceUtils::calculate_speed_mbps(
                    transfer_result.bytes_transferred, 
                    transfer_duration
                );
                
                if speed > best_speed {
                    best_speed = speed;
                    best_chunk_size = chunk_size;
                }
            }
        }
        
        // Small delay between tests
        tokio::time::sleep(Duration::from_millis(200)).await;
    }
    
    if best_speed > 0.0 {
        result
            .with_success(true)
            .add_metadata("best_chunk_size".to_string(), best_chunk_size.to_string())
            .add_metadata("best_speed_mbps".to_string(), format!("{:.2}", best_speed))
            .add_metadata("file_size_mb".to_string(), "1".to_string())
    } else {
        result.with_error("No successful transfers with any chunk size".to_string())
    }
}

async fn test_udp_packet_size_scaling() -> TestResult {
    let mut result = TestResult::new("UDP Packet Size Scaling".to_string());
    
    let env = TestEnvironment::new().await;
    let file_size = 100 * 1024; // 100KB test file (smaller for UDP)
    let test_file = env.test_files_dir.join("udp_scaling_test.bin");
    
    if let Err(e) = TestFileGenerator::create_binary_file(&test_file, file_size).await {
        return result.with_error(format!("Failed to create test file: {}", e));
    }
    
    let packet_sizes = vec![512, 1024, 1400, 2048]; // Up to typical MTU
    let mut best_speed = 0.0;
    let mut best_packet_size = 0;
    
    for packet_size in packet_sizes {
        let port = NetworkUtils::get_available_port();
        let bind_addr = SocketAddr::new(IpAddr::V4(Ipv4Addr::new(127, 0, 0, 1)), port);
        
        let mut receiver_config = TransferTestUtils::create_udp_config(TransferMode::Receiver, port, None);
        receiver_config.chunk_size = packet_size;
        
        let mut sender_config = TransferTestUtils::create_udp_config(
            TransferMode::Transmitter, port, Some("127.0.0.1".to_string())
        );
        sender_config.chunk_size = packet_size;
        
        let receiver_output_dir = env.downloads_dir.clone();
        let receiver_task = tokio::spawn(async move {
            CommunicationManager::start_receiver(&receiver_config, bind_addr, receiver_output_dir).await
        });
        
        tokio::time::sleep(Duration::from_millis(200)).await;
        
        let start_time = Instant::now();
        let sender_result = timeout(
            Duration::from_secs(20),
            CommunicationManager::start_sender(&sender_config, test_file.clone(), bind_addr)
        ).await;
        let transfer_duration = start_time.elapsed();
        
        let _receiver_result = timeout(Duration::from_secs(25), receiver_task).await;
        
        if let Ok(Ok(transfer_result)) = sender_result {
            if transfer_result.success {
                let speed = PerformanceUtils::calculate_speed_mbps(
                    transfer_result.bytes_transferred, 
                    transfer_duration
                );
                
                if speed > best_speed {
                    best_speed = speed;
                    best_packet_size = packet_size;
                }
            }
        }
        
        tokio::time::sleep(Duration::from_millis(200)).await;
    }
    
    if best_speed > 0.0 {
        result
            .with_success(true)
            .add_metadata("best_packet_size".to_string(), best_packet_size.to_string())
            .add_metadata("best_speed_mbps".to_string(), format!("{:.2}", best_speed))
            .add_metadata("file_size_kb".to_string(), "100".to_string())
    } else {
        result.with_error("No successful transfers with any packet size".to_string())
    }
}

/// Test large file performance (only if enabled)
async fn test_large_file_performance() -> Vec<TestResult> {
    let mut results = Vec::new();
    
    let large_sizes = vec![
        100 * 1024 * 1024, // 100MB
        500 * 1024 * 1024, // 500MB
    ];
    
    for size in large_sizes {
        results.push(test_large_file_single(size).await);
    }
    
    results
}

async fn test_large_file_single(file_size: usize) -> TestResult {
    let test_name = format!("Large File Performance - {}MB", file_size / (1024 * 1024));
    let mut result = TestResult::new(test_name);
    
    let env = TestEnvironment::new().await;
    let test_file = env.test_files_dir.join(format!("large_perf_{}.bin", file_size / (1024 * 1024)));
    
    // Create large file
    println!("Creating {}MB test file...", file_size / (1024 * 1024));
    if let Err(e) = TestFileGenerator::create_binary_file(&test_file, file_size).await {
        return result.with_error(format!("Failed to create large test file: {}", e));
    }
    
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
    
    tokio::time::sleep(Duration::from_millis(1000)).await;
    
    let start_time = Instant::now();
    let memory_before = PerformanceUtils::get_memory_usage();
    
    let sender_result = timeout(
        Duration::from_secs(300), // 5 minute timeout for large files
        CommunicationManager::start_sender(&sender_config, test_file, bind_addr)
    ).await;
    
    let transfer_duration = start_time.elapsed();
    let memory_after = PerformanceUtils::get_memory_usage();
    
    receiver_task.abort();
    
    match sender_result {
        Ok(Ok(transfer_result)) if transfer_result.success => {
            let speed_mbps = PerformanceUtils::calculate_speed_mbps(
                transfer_result.bytes_transferred, 
                transfer_duration
            );
            
            result = result
                .with_success(true)
                .with_duration(transfer_duration)
                .with_bytes_transferred(transfer_result.bytes_transferred)
                .add_metadata("speed_mbps".to_string(), format!("{:.2}", speed_mbps))
                .add_metadata("file_size_mb".to_string(), (file_size / (1024 * 1024)).to_string());
            
            if let (Some(before), Some(after)) = (memory_before, memory_after) {
                let memory_delta = if after > before { after - before } else { 0 };
                result = result.add_metadata("memory_delta_mb".to_string(), 
                    format!("{:.2}", memory_delta as f64 / (1024.0 * 1024.0)));
            }
            
            result
        }
        Ok(Ok(transfer_result)) => {
            result.with_error(transfer_result.error.unwrap_or("Transfer failed".to_string()))
        }
        Ok(Err(e)) => result.with_error(format!("Transfer error: {}", e)),
        Err(_) => result.with_error("Transfer timed out".to_string()),
    }
}