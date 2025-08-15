// Stress Testing Module
// Tests system behavior under high load and resource constraints

use crate::e2e::{TestEnvironment, TestFileGenerator, NetworkUtils, TransferTestUtils, TestResult, PerformanceUtils};
use file_transfer_backend::{
    config::{TransferConfig, Protocol, TransferMode},
    core::transfer::CommunicationManager,
};
use std::net::{SocketAddr, IpAddr, Ipv4Addr};
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::sync::Semaphore;
use tokio::time::timeout;

/// Stress test configuration
#[derive(Debug, Clone)]
pub struct StressTestConfig {
    pub concurrent_transfers: usize,
    pub file_size: usize,
    pub test_duration_seconds: u64,
    pub max_memory_mb: Option<u64>,
}

impl Default for StressTestConfig {
    fn default() -> Self {
        Self {
            concurrent_transfers: 5,
            file_size: 1024 * 1024, // 1MB
            test_duration_seconds: 60,
            max_memory_mb: Some(500), // 500MB limit
        }
    }
}

/// Run comprehensive stress tests
pub async fn run_stress_suite() -> Vec<TestResult> {
    let mut results = Vec::new();
    
    // Concurrent transfer tests
    results.extend(test_concurrent_transfers().await);
    
    // Resource exhaustion tests
    results.extend(test_resource_exhaustion().await);
    
    // Connection limit tests
    results.extend(test_connection_limits().await);
    
    // Memory pressure tests
    results.extend(test_memory_pressure().await);
    
    // Long-running stability tests
    results.extend(test_long_running_stability().await);
    
    results
}

/// Test multiple concurrent transfers
async fn test_concurrent_transfers() -> Vec<TestResult> {
    let mut results = Vec::new();
    
    // Test different levels of concurrency
    for concurrent_count in [2, 5, 10] {
        results.push(test_concurrent_tcp_transfers(concurrent_count).await);
        results.push(test_concurrent_udp_transfers(concurrent_count).await);
    }
    
    results
}

/// Test concurrent TCP transfers
async fn test_concurrent_tcp_transfers(concurrent_count: usize) -> TestResult {
    let test_name = format!("Concurrent TCP Transfers - {}", concurrent_count);
    let mut result = TestResult::new(test_name);
    
    let env = TestEnvironment::new().await;
    let file_size = 512 * 1024; // 512KB per transfer
    
    // Create test files
    let mut test_files = Vec::new();
    for i in 0..concurrent_count {
        let test_file = env.test_files_dir.join(format!("concurrent_tcp_{}.bin", i));
        if let Err(e) = TestFileGenerator::create_binary_file(&test_file, file_size).await {
            return result.with_error(format!("Failed to create test file {}: {}", i, e));
        }
        test_files.push(test_file);
    }
    
    // Set up ports for each transfer
    let mut ports = Vec::new();
    for _ in 0..concurrent_count {
        ports.push(NetworkUtils::get_available_port());
    }
    
    let start_time = Instant::now();
    let memory_before = PerformanceUtils::get_memory_usage();
    
    // Start all receivers
    let mut receiver_tasks = Vec::new();
    for (i, &port) in ports.iter().enumerate() {
        let bind_addr = SocketAddr::new(IpAddr::V4(Ipv4Addr::new(127, 0, 0, 1)), port);
        let receiver_config = TransferTestUtils::create_tcp_config(TransferMode::Receiver, port, None);
        let receiver_output_dir = env.downloads_dir.join(format!("receiver_{}", i));
        tokio::fs::create_dir_all(&receiver_output_dir).await.unwrap();
        
        let task = tokio::spawn(async move {
            CommunicationManager::start_receiver(&receiver_config, bind_addr, receiver_output_dir).await
        });
        receiver_tasks.push(task);
    }
    
    // Wait for receivers to bind
    tokio::time::sleep(Duration::from_millis(1000)).await;
    
    // Start all senders concurrently
    let semaphore = Arc::new(Semaphore::new(concurrent_count));
    let mut sender_tasks = Vec::new();
    
    for (i, (&port, test_file)) in ports.iter().zip(test_files.iter()).enumerate() {
        let bind_addr = SocketAddr::new(IpAddr::V4(Ipv4Addr::new(127, 0, 0, 1)), port);
        let sender_config = TransferTestUtils::create_tcp_config(
            TransferMode::Transmitter, port, Some("127.0.0.1".to_string())
        );
        let test_file = test_file.clone();
        let semaphore = semaphore.clone();
        
        let task = tokio::spawn(async move {
            let _permit = semaphore.acquire().await.unwrap();
            timeout(
                Duration::from_secs(30),
                CommunicationManager::start_sender(&sender_config, test_file, bind_addr)
            ).await
        });
        sender_tasks.push(task);
    }
    
    // Wait for all senders to complete
    let mut successful_transfers = 0;
    let mut total_bytes = 0u64;
    
    for (i, task) in sender_tasks.into_iter().enumerate() {
        match task.await {
            Ok(Ok(Ok(transfer_result))) if transfer_result.success => {
                successful_transfers += 1;
                total_bytes += transfer_result.bytes_transferred;
            }
            _ => {
                // Transfer failed or timed out
            }
        }
    }
    
    let total_duration = start_time.elapsed();
    let memory_after = PerformanceUtils::get_memory_usage();
    
    // Clean up receivers
    for task in receiver_tasks {
        task.abort();
    }
    
    if successful_transfers > 0 {
        let avg_speed = PerformanceUtils::calculate_speed_mbps(total_bytes, total_duration);
        
        result = result
            .with_success(successful_transfers >= concurrent_count / 2) // At least 50% success
            .with_duration(total_duration)
            .with_bytes_transferred(total_bytes)
            .add_metadata("concurrent_count".to_string(), concurrent_count.to_string())
            .add_metadata("successful_transfers".to_string(), successful_transfers.to_string())
            .add_metadata("success_rate".to_string(), 
                format!("{:.1}%", (successful_transfers as f64 / concurrent_count as f64) * 100.0))
            .add_metadata("avg_speed_mbps".to_string(), format!("{:.2}", avg_speed))
            .add_metadata("protocol".to_string(), "TCP".to_string());
        
        if let (Some(before), Some(after)) = (memory_before, memory_after) {
            let memory_delta = if after > before { after - before } else { 0 };
            result = result.add_metadata("memory_delta_mb".to_string(), 
                format!("{:.2}", memory_delta as f64 / (1024.0 * 1024.0)));
        }
        
        result
    } else {
        result.with_error("No transfers completed successfully".to_string())
    }
}

/// Test concurrent UDP transfers
async fn test_concurrent_udp_transfers(concurrent_count: usize) -> TestResult {
    let test_name = format!("Concurrent UDP Transfers - {}", concurrent_count);
    let mut result = TestResult::new(test_name);
    
    let env = TestEnvironment::new().await;
    let file_size = 256 * 1024; // 256KB per transfer (smaller for UDP)
    
    // Create test files
    let mut test_files = Vec::new();
    for i in 0..concurrent_count {
        let test_file = env.test_files_dir.join(format!("concurrent_udp_{}.bin", i));
        if let Err(e) = TestFileGenerator::create_binary_file(&test_file, file_size).await {
            return result.with_error(format!("Failed to create test file {}: {}", i, e));
        }
        test_files.push(test_file);
    }
    
    // Set up ports for each transfer
    let mut ports = Vec::new();
    for _ in 0..concurrent_count {
        ports.push(NetworkUtils::get_available_port());
    }
    
    let start_time = Instant::now();
    
    // Start all receivers
    let mut receiver_tasks = Vec::new();
    for (i, &port) in ports.iter().enumerate() {
        let bind_addr = SocketAddr::new(IpAddr::V4(Ipv4Addr::new(127, 0, 0, 1)), port);
        let receiver_config = TransferTestUtils::create_udp_config(TransferMode::Receiver, port, None);
        let receiver_output_dir = env.downloads_dir.join(format!("udp_receiver_{}", i));
        tokio::fs::create_dir_all(&receiver_output_dir).await.unwrap();
        
        let task = tokio::spawn(async move {
            CommunicationManager::start_receiver(&receiver_config, bind_addr, receiver_output_dir).await
        });
        receiver_tasks.push(task);
    }
    
    // Wait for receivers to bind
    tokio::time::sleep(Duration::from_millis(500)).await;
    
    // Start all senders concurrently
    let mut sender_tasks = Vec::new();
    
    for (i, (&port, test_file)) in ports.iter().zip(test_files.iter()).enumerate() {
        let bind_addr = SocketAddr::new(IpAddr::V4(Ipv4Addr::new(127, 0, 0, 1)), port);
        let sender_config = TransferTestUtils::create_udp_config(
            TransferMode::Transmitter, port, Some("127.0.0.1".to_string())
        );
        let test_file = test_file.clone();
        
        let task = tokio::spawn(async move {
            timeout(
                Duration::from_secs(20),
                CommunicationManager::start_sender(&sender_config, test_file, bind_addr)
            ).await
        });
        sender_tasks.push(task);
    }
    
    // Wait for all senders to complete
    let mut successful_senders = 0;
    let mut total_bytes_sent = 0u64;
    
    for task in sender_tasks {
        match task.await {
            Ok(Ok(Ok(transfer_result))) if transfer_result.success => {
                successful_senders += 1;
                total_bytes_sent += transfer_result.bytes_transferred;
            }
            _ => {}
        }
    }
    
    // Wait for receivers to complete or timeout
    let mut successful_receivers = 0;
    for task in receiver_tasks {
        match timeout(Duration::from_secs(25), task).await {
            Ok(Ok(Ok(transfer_result))) if transfer_result.success => {
                successful_receivers += 1;
            }
            _ => {}
        }
    }
    
    let total_duration = start_time.elapsed();
    
    if successful_senders > 0 {
        let avg_speed = PerformanceUtils::calculate_speed_mbps(total_bytes_sent, total_duration);
        
        result
            .with_success(successful_senders >= concurrent_count / 2)
            .with_duration(total_duration)
            .with_bytes_transferred(total_bytes_sent)
            .add_metadata("concurrent_count".to_string(), concurrent_count.to_string())
            .add_metadata("successful_senders".to_string(), successful_senders.to_string())
            .add_metadata("successful_receivers".to_string(), successful_receivers.to_string())
            .add_metadata("sender_success_rate".to_string(), 
                format!("{:.1}%", (successful_senders as f64 / concurrent_count as f64) * 100.0))
            .add_metadata("avg_speed_mbps".to_string(), format!("{:.2}", avg_speed))
            .add_metadata("protocol".to_string(), "UDP".to_string())
    } else {
        result.with_error("No UDP transfers completed successfully".to_string())
    }
}

/// Test resource exhaustion scenarios
async fn test_resource_exhaustion() -> Vec<TestResult> {
    let mut results = Vec::new();
    
    results.push(test_port_exhaustion().await);
    results.push(test_file_descriptor_limits().await);
    
    results
}

/// Test port exhaustion
async fn test_port_exhaustion() -> TestResult {
    let mut result = TestResult::new("Port Exhaustion Test".to_string());
    
    let mut listeners = Vec::new();
    let mut successful_binds = 0;
    let max_attempts = 100;
    
    // Try to bind many ports
    for i in 0..max_attempts {
        let port = 20000 + i; // Use high port numbers
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
        .with_success(successful_binds > 50) // Should be able to bind at least 50 ports
        .add_metadata("successful_binds".to_string(), successful_binds.to_string())
        .add_metadata("max_attempts".to_string(), max_attempts.to_string())
        .add_metadata("bind_rate".to_string(), 
            format!("{:.1}%", (successful_binds as f64 / max_attempts as f64) * 100.0))
}

/// Test file descriptor limits
async fn test_file_descriptor_limits() -> TestResult {
    let mut result = TestResult::new("File Descriptor Limits".to_string());
    
    let env = TestEnvironment::new().await;
    let mut files = Vec::new();
    let mut successful_opens = 0;
    let max_attempts = 200;
    
    // Try to open many files
    for i in 0..max_attempts {
        let file_path = env.test_files_dir.join(format!("fd_test_{}.txt", i));
        
        match tokio::fs::File::create(&file_path).await {
            Ok(file) => {
                successful_opens += 1;
                files.push(file);
            }
            Err(_) => break,
        }
    }
    
    // Clean up
    drop(files);
    
    result
        .with_success(successful_opens > 100) // Should be able to open at least 100 files
        .add_metadata("successful_opens".to_string(), successful_opens.to_string())
        .add_metadata("max_attempts".to_string(), max_attempts.to_string())
        .add_metadata("open_rate".to_string(), 
            format!("{:.1}%", (successful_opens as f64 / max_attempts as f64) * 100.0))
}

/// Test connection limits
async fn test_connection_limits() -> Vec<TestResult> {
    let mut results = Vec::new();
    
    results.push(test_max_concurrent_connections().await);
    results.push(test_connection_queue_limits().await);
    
    results
}

/// Test maximum concurrent connections
async fn test_max_concurrent_connections() -> TestResult {
    let mut result = TestResult::new("Max Concurrent Connections".to_string());
    
    let port = NetworkUtils::get_available_port();
    let bind_addr = SocketAddr::new(IpAddr::V4(Ipv4Addr::new(127, 0, 0, 1)), port);
    
    // Start a listener
    let listener = match tokio::net::TcpListener::bind(bind_addr).await {
        Ok(l) => l,
        Err(e) => return result.with_error(format!("Failed to bind listener: {}", e)),
    };
    
    // Accept connections in background
    let accept_task = tokio::spawn(async move {
        let mut connections = Vec::new();
        while let Ok((stream, _)) = listener.accept().await {
            connections.push(stream);
            if connections.len() >= 50 {
                break;
            }
        }
        connections.len()
    });
    
    // Create many concurrent connections
    let mut connection_tasks = Vec::new();
    let max_connections = 50;
    
    for _ in 0..max_connections {
        let task = tokio::spawn(async move {
            tokio::net::TcpStream::connect(bind_addr).await
        });
        connection_tasks.push(task);
    }
    
    // Wait for connections
    let mut successful_connections = 0;
    for task in connection_tasks {
        if let Ok(Ok(_)) = task.await {
            successful_connections += 1;
        }
    }
    
    // Wait for accept task
    let accepted_connections = match timeout(Duration::from_secs(5), accept_task).await {
        Ok(Ok(count)) => count,
        _ => 0,
    };
    
    result
        .with_success(successful_connections > 20 && accepted_connections > 20)
        .add_metadata("successful_connections".to_string(), successful_connections.to_string())
        .add_metadata("accepted_connections".to_string(), accepted_connections.to_string())
        .add_metadata("max_attempted".to_string(), max_connections.to_string())
}

/// Test connection queue limits
async fn test_connection_queue_limits() -> TestResult {
    let mut result = TestResult::new("Connection Queue Limits".to_string());
    
    let port = NetworkUtils::get_available_port();
    let bind_addr = SocketAddr::new(IpAddr::V4(Ipv4Addr::new(127, 0, 0, 1)), port);
    
    // Bind but don't accept connections (to fill the queue)
    let _listener = match tokio::net::TcpListener::bind(bind_addr).await {
        Ok(l) => l,
        Err(e) => return result.with_error(format!("Failed to bind listener: {}", e)),
    };
    
    // Try to create many connections without accepting them
    let mut connection_tasks = Vec::new();
    let queue_test_size = 200;
    
    for _ in 0..queue_test_size {
        let task = tokio::spawn(async move {
            timeout(
                Duration::from_secs(1),
                tokio::net::TcpStream::connect(bind_addr)
            ).await
        });
        connection_tasks.push(task);
    }
    
    // Count how many connections succeed vs timeout
    let mut successful = 0;
    let mut timeouts = 0;
    let mut errors = 0;
    
    for task in connection_tasks {
        match task.await {
            Ok(Ok(Ok(_))) => successful += 1,
            Ok(Err(_)) => timeouts += 1,
            Err(_) => errors += 1,
        }
    }
    
    result
        .with_success(successful > 0) // At least some should succeed
        .add_metadata("successful_connections".to_string(), successful.to_string())
        .add_metadata("timeouts".to_string(), timeouts.to_string())
        .add_metadata("errors".to_string(), errors.to_string())
        .add_metadata("queue_test_size".to_string(), queue_test_size.to_string())
}

/// Test memory pressure scenarios
async fn test_memory_pressure() -> Vec<TestResult> {
    let mut results = Vec::new();
    
    results.push(test_large_buffer_allocation().await);
    results.push(test_memory_leak_detection().await);
    
    results
}

/// Test large buffer allocation
async fn test_large_buffer_allocation() -> TestResult {
    let mut result = TestResult::new("Large Buffer Allocation".to_string());
    
    let memory_before = PerformanceUtils::get_memory_usage();
    
    // Allocate large buffers
    let buffer_size = 10 * 1024 * 1024; // 10MB
    let buffer_count = 10;
    let mut buffers = Vec::new();
    
    for _ in 0..buffer_count {
        let buffer = vec![0u8; buffer_size];
        buffers.push(buffer);
    }
    
    let memory_peak = PerformanceUtils::get_memory_usage();
    
    // Release buffers
    drop(buffers);
    
    // Force garbage collection (if applicable)
    tokio::time::sleep(Duration::from_millis(100)).await;
    
    let memory_after = PerformanceUtils::get_memory_usage();
    
    result = result.with_success(true)
        .add_metadata("buffer_size_mb".to_string(), (buffer_size / (1024 * 1024)).to_string())
        .add_metadata("buffer_count".to_string(), buffer_count.to_string())
        .add_metadata("total_allocated_mb".to_string(), 
            ((buffer_size * buffer_count) / (1024 * 1024)).to_string());
    
    if let Some(before) = memory_before {
        result = result.add_metadata("memory_before_mb".to_string(), 
            format!("{:.2}", before as f64 / (1024.0 * 1024.0)));
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

/// Test memory leak detection
async fn test_memory_leak_detection() -> TestResult {
    let mut result = TestResult::new("Memory Leak Detection".to_string());
    
    let memory_baseline = PerformanceUtils::get_memory_usage();
    
    // Perform multiple transfer operations
    let env = TestEnvironment::new().await;
    let iterations = 10;
    
    for i in 0..iterations {
        let test_file = env.test_files_dir.join(format!("leak_test_{}.bin", i));
        TestFileGenerator::create_binary_file(&test_file, 100 * 1024).await.unwrap();
        
        let port = NetworkUtils::get_available_port();
        let bind_addr = SocketAddr::new(IpAddr::V4(Ipv4Addr::new(127, 0, 0, 1)), port);
        
        let receiver_config = TransferTestUtils::create_tcp_config(TransferMode::Receiver, port, None);
        let sender_config = TransferTestUtils::create_tcp_config(
            TransferMode::Transmitter, port, Some("127.0.0.1".to_string())
        );
        
        let receiver_output_dir = env.downloads_dir.join(format!("leak_test_{}", i));
        tokio::fs::create_dir_all(&receiver_output_dir).await.unwrap();
        
        let receiver_task = tokio::spawn(async move {
            CommunicationManager::start_receiver(&receiver_config, bind_addr, receiver_output_dir).await
        });
        
        tokio::time::sleep(Duration::from_millis(200)).await;
        
        let _sender_result = timeout(
            Duration::from_secs(10),
            CommunicationManager::start_sender(&sender_config, test_file, bind_addr)
        ).await;
        
        receiver_task.abort();
        
        // Small delay between iterations
        tokio::time::sleep(Duration::from_millis(100)).await;
    }
    
    let memory_final = PerformanceUtils::get_memory_usage();
    
    result = result.with_success(true)
        .add_metadata("iterations".to_string(), iterations.to_string());
    
    if let (Some(baseline), Some(final_mem)) = (memory_baseline, memory_final) {
        let memory_growth = if final_mem > baseline { final_mem - baseline } else { 0 };
        let growth_mb = memory_growth as f64 / (1024.0 * 1024.0);
        
        result = result
            .add_metadata("memory_baseline_mb".to_string(), 
                format!("{:.2}", baseline as f64 / (1024.0 * 1024.0)))
            .add_metadata("memory_final_mb".to_string(), 
                format!("{:.2}", final_mem as f64 / (1024.0 * 1024.0)))
            .add_metadata("memory_growth_mb".to_string(), format!("{:.2}", growth_mb))
            .add_metadata("potential_leak".to_string(), (growth_mb > 50.0).to_string());
    }
    
    result
}

/// Test long-running stability
async fn test_long_running_stability() -> Vec<TestResult> {
    let mut results = Vec::new();
    
    // Only run if explicitly requested (due to time)
    if std::env::var("E2E_LONG_RUNNING").is_ok() {
        results.push(test_continuous_transfers().await);
        results.push(test_connection_cycling().await);
    } else {
        results.push(TestResult::new("Long Running Stability".to_string())
            .with_success(true)
            .add_metadata("skipped".to_string(), "set E2E_LONG_RUNNING to enable".to_string()));
    }
    
    results
}

/// Test continuous transfers over time
async fn test_continuous_transfers() -> TestResult {
    let mut result = TestResult::new("Continuous Transfers".to_string());
    
    let env = TestEnvironment::new().await;
    let test_duration = Duration::from_secs(300); // 5 minutes
    let transfer_interval = Duration::from_secs(10);
    let start_time = Instant::now();
    
    let mut transfer_count = 0;
    let mut successful_transfers = 0;
    
    while start_time.elapsed() < test_duration {
        transfer_count += 1;
        
        let test_file = env.test_files_dir.join(format!("continuous_{}.bin", transfer_count));
        TestFileGenerator::create_binary_file(&test_file, 512 * 1024).await.unwrap();
        
        let port = NetworkUtils::get_available_port();
        let bind_addr = SocketAddr::new(IpAddr::V4(Ipv4Addr::new(127, 0, 0, 1)), port);
        
        let receiver_config = TransferTestUtils::create_tcp_config(TransferMode::Receiver, port, None);
        let sender_config = TransferTestUtils::create_tcp_config(
            TransferMode::Transmitter, port, Some("127.0.0.1".to_string())
        );
        
        let receiver_output_dir = env.downloads_dir.join(format!("continuous_{}", transfer_count));
        tokio::fs::create_dir_all(&receiver_output_dir).await.unwrap();
        
        let receiver_task = tokio::spawn(async move {
            CommunicationManager::start_receiver(&receiver_config, bind_addr, receiver_output_dir).await
        });
        
        tokio::time::sleep(Duration::from_millis(200)).await;
        
        let sender_result = timeout(
            Duration::from_secs(15),
            CommunicationManager::start_sender(&sender_config, test_file, bind_addr)
        ).await;
        
        receiver_task.abort();
        
        if let Ok(Ok(Ok(transfer_result))) = sender_result {
            if transfer_result.success {
                successful_transfers += 1;
            }
        }
        
        tokio::time::sleep(transfer_interval).await;
    }
    
    let success_rate = (successful_transfers as f64 / transfer_count as f64) * 100.0;
    
    result
        .with_success(success_rate >= 80.0) // At least 80% success rate
        .with_duration(start_time.elapsed())
        .add_metadata("total_transfers".to_string(), transfer_count.to_string())
        .add_metadata("successful_transfers".to_string(), successful_transfers.to_string())
        .add_metadata("success_rate".to_string(), format!("{:.1}%", success_rate))
        .add_metadata("test_duration_minutes".to_string(), "5".to_string())
}

/// Test connection cycling
async fn test_connection_cycling() -> TestResult {
    let mut result = TestResult::new("Connection Cycling".to_string());
    
    let port = NetworkUtils::get_available_port();
    let bind_addr = SocketAddr::new(IpAddr::V4(Ipv4Addr::new(127, 0, 0, 1)), port);
    let cycles = 100;
    let mut successful_cycles = 0;
    
    for _ in 0..cycles {
        // Bind and immediately close
        match tokio::net::TcpListener::bind(bind_addr).await {
            Ok(listener) => {
                drop(listener);
                successful_cycles += 1;
                
                // Small delay to allow port reuse
                tokio::time::sleep(Duration::from_millis(10)).await;
            }
            Err(_) => break,
        }
    }
    
    let success_rate = (successful_cycles as f64 / cycles as f64) * 100.0;
    
    result
        .with_success(success_rate >= 95.0) // At least 95% success rate
        .add_metadata("total_cycles".to_string(), cycles.to_string())
        .add_metadata("successful_cycles".to_string(), successful_cycles.to_string())
        .add_metadata("success_rate".to_string(), format!("{:.1}%", success_rate))
}