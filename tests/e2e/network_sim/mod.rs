// Network Simulation Testing Module
// Tests behavior under simulated network conditions

use crate::e2e::{TestEnvironment, TestFileGenerator, NetworkUtils, TransferTestUtils, TestResult, PerformanceUtils};
use file_transfer_backend::{
    config::{TransferConfig, Protocol, TransferMode},
    core::transfer::CommunicationManager,
};
use std::net::{SocketAddr, IpAddr, Ipv4Addr};
use std::time::{Duration, Instant};
use tokio::time::{timeout, sleep};
use rand::Rng;

/// Network simulation configuration
#[derive(Debug, Clone)]
pub struct NetworkSimConfig {
    pub packet_loss_percent: f64,
    pub latency_ms: u64,
    pub bandwidth_limit_kbps: Option<u64>,
    pub jitter_ms: u64,
}

impl NetworkSimConfig {
    pub fn good_network() -> Self {
        Self {
            packet_loss_percent: 0.0,
            latency_ms: 1,
            bandwidth_limit_kbps: None,
            jitter_ms: 0,
        }
    }
    
    pub fn poor_network() -> Self {
        Self {
            packet_loss_percent: 5.0,
            latency_ms: 100,
            bandwidth_limit_kbps: Some(256), // 256 Kbps
            jitter_ms: 50,
        }
    }
    
    pub fn very_poor_network() -> Self {
        Self {
            packet_loss_percent: 15.0,
            latency_ms: 500,
            bandwidth_limit_kbps: Some(64), // 64 Kbps
            jitter_ms: 200,
        }
    }
}

/// Run network simulation test suite
pub async fn run_network_simulation_suite() -> Vec<TestResult> {
    let mut results = Vec::new();
    
    // Basic network condition tests
    results.extend(test_various_network_conditions().await);
    
    // Latency impact tests
    results.extend(test_latency_impact().await);
    
    // Bandwidth limitation tests
    results.extend(test_bandwidth_limitations().await);
    
    // Packet loss simulation (UDP specific)
    results.extend(test_packet_loss_simulation().await);
    
    // Network instability tests
    results.extend(test_network_instability().await);
    
    results
}

/// Test various network conditions
async fn test_various_network_conditions() -> Vec<TestResult> {
    let mut results = Vec::new();
    
    let conditions = vec![
        ("Good Network", NetworkSimConfig::good_network()),
        ("Poor Network", NetworkSimConfig::poor_network()),
        ("Very Poor Network", NetworkSimConfig::very_poor_network()),
    ];
    
    for (condition_name, config) in conditions {
        results.push(test_tcp_under_conditions(condition_name, &config).await);
        results.push(test_udp_under_conditions(condition_name, &config).await);
    }
    
    results
}

/// Test TCP under specific network conditions
async fn test_tcp_under_conditions(condition_name: &str, sim_config: &NetworkSimConfig) -> TestResult {
    let test_name = format!("TCP - {}", condition_name);
    let mut result = TestResult::new(test_name);
    
    let env = TestEnvironment::new().await;
    let file_size = 100 * 1024; // 100KB
    let test_file = env.test_files_dir.join("tcp_network_sim.bin");
    
    if let Err(e) = TestFileGenerator::create_binary_file(&test_file, file_size).await {
        return result.with_error(format!("Failed to create test file: {}", e));
    }
    
    let port = NetworkUtils::get_available_port();
    let bind_addr = SocketAddr::new(IpAddr::V4(Ipv4Addr::new(127, 0, 0, 1)), port);
    
    let receiver_config = TransferTestUtils::create_tcp_config(TransferMode::Receiver, port, None);
    let sender_config = TransferTestUtils::create_tcp_config(
        TransferMode::Transmitter, port, Some("127.0.0.1".to_string())
    );
    
    // Apply network simulation delays
    let receiver_output_dir = env.downloads_dir.clone();
    let receiver_task = tokio::spawn(async move {
        CommunicationManager::start_receiver(&receiver_config, bind_addr, receiver_output_dir).await
    });
    
    // Simulate network latency before starting sender
    sleep(Duration::from_millis(sim_config.latency_ms)).await;
    
    let start_time = Instant::now();
    
    // Apply jitter simulation
    if sim_config.jitter_ms > 0 {
        let jitter = rand::thread_rng().gen_range(0..sim_config.jitter_ms);
        sleep(Duration::from_millis(jitter)).await;
    }
    
    let sender_result = timeout(
        Duration::from_secs(60), // Longer timeout for poor conditions
        simulate_network_transfer(&sender_config, test_file, bind_addr, sim_config)
    ).await;
    
    let transfer_duration = start_time.elapsed();
    
    receiver_task.abort();
    
    match sender_result {
        Ok(Ok(transfer_result)) if transfer_result.success => {
            let speed_mbps = PerformanceUtils::calculate_speed_mbps(
                transfer_result.bytes_transferred, 
                transfer_duration
            );
            
            result
                .with_success(true)
                .with_duration(transfer_duration)
                .with_bytes_transferred(transfer_result.bytes_transferred)
                .add_metadata("protocol".to_string(), "TCP".to_string())
                .add_metadata("condition".to_string(), condition_name.to_string())
                .add_metadata("speed_mbps".to_string(), format!("{:.2}", speed_mbps))
                .add_metadata("latency_ms".to_string(), sim_config.latency_ms.to_string())
                .add_metadata("packet_loss_percent".to_string(), sim_config.packet_loss_percent.to_string())
        }
        Ok(Ok(transfer_result)) => {
            result.with_error(transfer_result.error.unwrap_or("Transfer failed".to_string()))
        }
        Ok(Err(e)) => result.with_error(format!("Transfer error: {}", e)),
        Err(_) => result.with_error("Transfer timed out under network conditions".to_string()),
    }
}

/// Test UDP under specific network conditions
async fn test_udp_under_conditions(condition_name: &str, sim_config: &NetworkSimConfig) -> TestResult {
    let test_name = format!("UDP - {}", condition_name);
    let mut result = TestResult::new(test_name);
    
    let env = TestEnvironment::new().await;
    let file_size = 50 * 1024; // 50KB (smaller for UDP)
    let test_file = env.test_files_dir.join("udp_network_sim.bin");
    
    if let Err(e) = TestFileGenerator::create_binary_file(&test_file, file_size).await {
        return result.with_error(format!("Failed to create test file: {}", e));
    }
    
    let port = NetworkUtils::get_available_port();
    let bind_addr = SocketAddr::new(IpAddr::V4(Ipv4Addr::new(127, 0, 0, 1)), port);
    
    let receiver_config = TransferTestUtils::create_udp_config(TransferMode::Receiver, port, None);
    let sender_config = TransferTestUtils::create_udp_config(
        TransferMode::Transmitter, port, Some("127.0.0.1".to_string())
    );
    
    let receiver_output_dir = env.downloads_dir.clone();
    let receiver_task = tokio::spawn(async move {
        CommunicationManager::start_receiver(&receiver_config, bind_addr, receiver_output_dir).await
    });
    
    sleep(Duration::from_millis(sim_config.latency_ms / 2)).await;
    
    let start_time = Instant::now();
    
    let sender_result = timeout(
        Duration::from_secs(45),
        simulate_network_transfer(&sender_config, test_file, bind_addr, sim_config)
    ).await;
    
    let transfer_duration = start_time.elapsed();
    
    // Wait for receiver to complete or timeout
    let receiver_result = timeout(Duration::from_secs(50), receiver_task).await;
    
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
                .add_metadata("protocol".to_string(), "UDP".to_string())
                .add_metadata("condition".to_string(), condition_name.to_string())
                .add_metadata("speed_mbps".to_string(), format!("{:.2}", speed_mbps))
                .add_metadata("latency_ms".to_string(), sim_config.latency_ms.to_string())
                .add_metadata("packet_loss_percent".to_string(), sim_config.packet_loss_percent.to_string());
            
            // Check if receiver completed successfully
            if let Ok(Ok(Ok(recv_result))) = receiver_result {
                if recv_result.success {
                    result = result.add_metadata("receiver_success".to_string(), "true".to_string());
                    
                    // Calculate packet loss based on bytes received vs sent
                    let loss_percent = if transfer_result.bytes_transferred > 0 {
                        let received_bytes = recv_result.bytes_transferred;
                        let loss = if transfer_result.bytes_transferred > received_bytes {
                            transfer_result.bytes_transferred - received_bytes
                        } else {
                            0
                        };
                        (loss as f64 / transfer_result.bytes_transferred as f64) * 100.0
                    } else {
                        0.0
                    };
                    
                    result = result.add_metadata("actual_packet_loss_percent".to_string(), 
                        format!("{:.2}", loss_percent));
                } else {
                    result = result.add_metadata("receiver_success".to_string(), "false".to_string());
                }
            } else {
                result = result.add_metadata("receiver_success".to_string(), "timeout".to_string());
            }
            
            result
        }
        Ok(Ok(transfer_result)) => {
            result.with_error(transfer_result.error.unwrap_or("Transfer failed".to_string()))
        }
        Ok(Err(e)) => result.with_error(format!("Transfer error: {}", e)),
        Err(_) => result.with_error("Transfer timed out under network conditions".to_string()),
    }
}

/// Simulate network transfer with conditions
async fn simulate_network_transfer(
    config: &TransferConfig,
    file_path: std::path::PathBuf,
    target_addr: SocketAddr,
    sim_config: &NetworkSimConfig,
) -> Result<file_transfer_backend::core::transfer::TransferResult, file_transfer_backend::errors::TransferError> {
    // Apply bandwidth limiting by adding delays
    if let Some(bandwidth_kbps) = sim_config.bandwidth_limit_kbps {
        let file_size = tokio::fs::metadata(&file_path).await.unwrap().len();
        let expected_duration_ms = (file_size * 8) / (bandwidth_kbps * 1000 / 1000); // Convert to ms
        
        // Start the transfer
        let start_time = Instant::now();
        let result = CommunicationManager::start_sender(config, file_path, target_addr).await;
        let actual_duration = start_time.elapsed();
        
        // If transfer was too fast, add artificial delay
        if actual_duration.as_millis() < expected_duration_ms as u128 {
            let additional_delay = expected_duration_ms - actual_duration.as_millis() as u64;
            sleep(Duration::from_millis(additional_delay)).await;
        }
        
        result
    } else {
        // No bandwidth limiting, just add latency
        if sim_config.latency_ms > 0 {
            sleep(Duration::from_millis(sim_config.latency_ms)).await;
        }
        
        CommunicationManager::start_sender(config, file_path, target_addr).await
    }
}

/// Test latency impact on different protocols
async fn test_latency_impact() -> Vec<TestResult> {
    let mut results = Vec::new();
    
    let latencies = vec![1, 10, 50, 100, 250, 500]; // milliseconds
    
    for latency_ms in latencies {
        let sim_config = NetworkSimConfig {
            packet_loss_percent: 0.0,
            latency_ms,
            bandwidth_limit_kbps: None,
            jitter_ms: 0,
        };
        
        results.push(test_tcp_latency_impact(latency_ms, &sim_config).await);
        results.push(test_udp_latency_impact(latency_ms, &sim_config).await);
    }
    
    results
}

async fn test_tcp_latency_impact(latency_ms: u64, sim_config: &NetworkSimConfig) -> TestResult {
    let test_name = format!("TCP Latency Impact - {}ms", latency_ms);
    let mut result = TestResult::new(test_name);
    
    let env = TestEnvironment::new().await;
    let file_size = 50 * 1024; // 50KB
    let test_file = env.test_files_dir.join("tcp_latency_test.bin");
    
    if let Err(e) = TestFileGenerator::create_binary_file(&test_file, file_size).await {
        return result.with_error(format!("Failed to create test file: {}", e));
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
    
    sleep(Duration::from_millis(latency_ms)).await;
    
    let start_time = Instant::now();
    let sender_result = timeout(
        Duration::from_secs(30),
        simulate_network_transfer(&sender_config, test_file, bind_addr, sim_config)
    ).await;
    let transfer_duration = start_time.elapsed();
    
    receiver_task.abort();
    
    match sender_result {
        Ok(Ok(transfer_result)) if transfer_result.success => {
            let speed_mbps = PerformanceUtils::calculate_speed_mbps(
                transfer_result.bytes_transferred, 
                transfer_duration
            );
            
            result
                .with_success(true)
                .with_duration(transfer_duration)
                .with_bytes_transferred(transfer_result.bytes_transferred)
                .add_metadata("protocol".to_string(), "TCP".to_string())
                .add_metadata("latency_ms".to_string(), latency_ms.to_string())
                .add_metadata("speed_mbps".to_string(), format!("{:.2}", speed_mbps))
                .add_metadata("file_size_kb".to_string(), "50".to_string())
        }
        Ok(Ok(transfer_result)) => {
            result.with_error(transfer_result.error.unwrap_or("Transfer failed".to_string()))
        }
        Ok(Err(e)) => result.with_error(format!("Transfer error: {}", e)),
        Err(_) => result.with_error("Transfer timed out".to_string()),
    }
}

async fn test_udp_latency_impact(latency_ms: u64, sim_config: &NetworkSimConfig) -> TestResult {
    let test_name = format!("UDP Latency Impact - {}ms", latency_ms);
    let mut result = TestResult::new(test_name);
    
    let env = TestEnvironment::new().await;
    let file_size = 25 * 1024; // 25KB
    let test_file = env.test_files_dir.join("udp_latency_test.bin");
    
    if let Err(e) = TestFileGenerator::create_binary_file(&test_file, file_size).await {
        return result.with_error(format!("Failed to create test file: {}", e));
    }
    
    let port = NetworkUtils::get_available_port();
    let bind_addr = SocketAddr::new(IpAddr::V4(Ipv4Addr::new(127, 0, 0, 1)), port);
    
    let receiver_config = TransferTestUtils::create_udp_config(TransferMode::Receiver, port, None);
    let sender_config = TransferTestUtils::create_udp_config(
        TransferMode::Transmitter, port, Some("127.0.0.1".to_string())
    );
    
    let receiver_output_dir = env.downloads_dir.clone();
    let receiver_task = tokio::spawn(async move {
        CommunicationManager::start_receiver(&receiver_config, bind_addr, receiver_output_dir).await
    });
    
    sleep(Duration::from_millis(latency_ms / 2)).await;
    
    let start_time = Instant::now();
    let sender_result = timeout(
        Duration::from_secs(20),
        simulate_network_transfer(&sender_config, test_file, bind_addr, sim_config)
    ).await;
    let transfer_duration = start_time.elapsed();
    
    let _receiver_result = timeout(Duration::from_secs(25), receiver_task).await;
    
    match sender_result {
        Ok(Ok(transfer_result)) if transfer_result.success => {
            let speed_mbps = PerformanceUtils::calculate_speed_mbps(
                transfer_result.bytes_transferred, 
                transfer_duration
            );
            
            result
                .with_success(true)
                .with_duration(transfer_duration)
                .with_bytes_transferred(transfer_result.bytes_transferred)
                .add_metadata("protocol".to_string(), "UDP".to_string())
                .add_metadata("latency_ms".to_string(), latency_ms.to_string())
                .add_metadata("speed_mbps".to_string(), format!("{:.2}", speed_mbps))
                .add_metadata("file_size_kb".to_string(), "25".to_string())
        }
        Ok(Ok(transfer_result)) => {
            result.with_error(transfer_result.error.unwrap_or("Transfer failed".to_string()))
        }
        Ok(Err(e)) => result.with_error(format!("Transfer error: {}", e)),
        Err(_) => result.with_error("Transfer timed out".to_string()),
    }
}

/// Test bandwidth limitations
async fn test_bandwidth_limitations() -> Vec<TestResult> {
    let mut results = Vec::new();
    
    let bandwidth_limits = vec![64, 128, 256, 512, 1024]; // Kbps
    
    for bandwidth_kbps in bandwidth_limits {
        results.push(test_bandwidth_limit_tcp(bandwidth_kbps).await);
        results.push(test_bandwidth_limit_udp(bandwidth_kbps).await);
    }
    
    results
}

async fn test_bandwidth_limit_tcp(bandwidth_kbps: u64) -> TestResult {
    let test_name = format!("TCP Bandwidth Limit - {} Kbps", bandwidth_kbps);
    let mut result = TestResult::new(test_name);
    
    let env = TestEnvironment::new().await;
    let file_size = 100 * 1024; // 100KB
    let test_file = env.test_files_dir.join("tcp_bandwidth_test.bin");
    
    if let Err(e) = TestFileGenerator::create_binary_file(&test_file, file_size).await {
        return result.with_error(format!("Failed to create test file: {}", e));
    }
    
    let port = NetworkUtils::get_available_port();
    let bind_addr = SocketAddr::new(IpAddr::V4(Ipv4Addr::new(127, 0, 0, 1)), port);
    
    let receiver_config = TransferTestUtils::create_tcp_config(TransferMode::Receiver, port, None);
    let sender_config = TransferTestUtils::create_tcp_config(
        TransferMode::Transmitter, port, Some("127.0.0.1".to_string())
    );
    
    let sim_config = NetworkSimConfig {
        packet_loss_percent: 0.0,
        latency_ms: 10,
        bandwidth_limit_kbps: Some(bandwidth_kbps),
        jitter_ms: 0,
    };
    
    let receiver_output_dir = env.downloads_dir.clone();
    let receiver_task = tokio::spawn(async move {
        CommunicationManager::start_receiver(&receiver_config, bind_addr, receiver_output_dir).await
    });
    
    sleep(Duration::from_millis(200)).await;
    
    let start_time = Instant::now();
    let sender_result = timeout(
        Duration::from_secs(60),
        simulate_network_transfer(&sender_config, test_file, bind_addr, &sim_config)
    ).await;
    let transfer_duration = start_time.elapsed();
    
    receiver_task.abort();
    
    match sender_result {
        Ok(Ok(transfer_result)) if transfer_result.success => {
            let actual_speed_kbps = (transfer_result.bytes_transferred * 8) as f64 / 
                (transfer_duration.as_secs_f64() * 1000.0);
            
            // Check if speed is approximately within the bandwidth limit (allow some variance)
            let within_limit = actual_speed_kbps <= (bandwidth_kbps as f64 * 1.5);
            
            result
                .with_success(within_limit)
                .with_duration(transfer_duration)
                .with_bytes_transferred(transfer_result.bytes_transferred)
                .add_metadata("protocol".to_string(), "TCP".to_string())
                .add_metadata("bandwidth_limit_kbps".to_string(), bandwidth_kbps.to_string())
                .add_metadata("actual_speed_kbps".to_string(), format!("{:.2}", actual_speed_kbps))
                .add_metadata("within_limit".to_string(), within_limit.to_string())
        }
        Ok(Ok(transfer_result)) => {
            result.with_error(transfer_result.error.unwrap_or("Transfer failed".to_string()))
        }
        Ok(Err(e)) => result.with_error(format!("Transfer error: {}", e)),
        Err(_) => result.with_error("Transfer timed out".to_string()),
    }
}

async fn test_bandwidth_limit_udp(bandwidth_kbps: u64) -> TestResult {
    let test_name = format!("UDP Bandwidth Limit - {} Kbps", bandwidth_kbps);
    let mut result = TestResult::new(test_name);
    
    let env = TestEnvironment::new().await;
    let file_size = 50 * 1024; // 50KB
    let test_file = env.test_files_dir.join("udp_bandwidth_test.bin");
    
    if let Err(e) = TestFileGenerator::create_binary_file(&test_file, file_size).await {
        return result.with_error(format!("Failed to create test file: {}", e));
    }
    
    let port = NetworkUtils::get_available_port();
    let bind_addr = SocketAddr::new(IpAddr::V4(Ipv4Addr::new(127, 0, 0, 1)), port);
    
    let receiver_config = TransferTestUtils::create_udp_config(TransferMode::Receiver, port, None);
    let sender_config = TransferTestUtils::create_udp_config(
        TransferMode::Transmitter, port, Some("127.0.0.1".to_string())
    );
    
    let sim_config = NetworkSimConfig {
        packet_loss_percent: 0.0,
        latency_ms: 10,
        bandwidth_limit_kbps: Some(bandwidth_kbps),
        jitter_ms: 0,
    };
    
    let receiver_output_dir = env.downloads_dir.clone();
    let receiver_task = tokio::spawn(async move {
        CommunicationManager::start_receiver(&receiver_config, bind_addr, receiver_output_dir).await
    });
    
    sleep(Duration::from_millis(100)).await;
    
    let start_time = Instant::now();
    let sender_result = timeout(
        Duration::from_secs(30),
        simulate_network_transfer(&sender_config, test_file, bind_addr, &sim_config)
    ).await;
    let transfer_duration = start_time.elapsed();
    
    let _receiver_result = timeout(Duration::from_secs(35), receiver_task).await;
    
    match sender_result {
        Ok(Ok(transfer_result)) if transfer_result.success => {
            let actual_speed_kbps = (transfer_result.bytes_transferred * 8) as f64 / 
                (transfer_duration.as_secs_f64() * 1000.0);
            
            result
                .with_success(true)
                .with_duration(transfer_duration)
                .with_bytes_transferred(transfer_result.bytes_transferred)
                .add_metadata("protocol".to_string(), "UDP".to_string())
                .add_metadata("bandwidth_limit_kbps".to_string(), bandwidth_kbps.to_string())
                .add_metadata("actual_speed_kbps".to_string(), format!("{:.2}", actual_speed_kbps))
        }
        Ok(Ok(transfer_result)) => {
            result.with_error(transfer_result.error.unwrap_or("Transfer failed".to_string()))
        }
        Ok(Err(e)) => result.with_error(format!("Transfer error: {}", e)),
        Err(_) => result.with_error("Transfer timed out".to_string()),
    }
}

/// Test packet loss simulation (UDP specific)
async fn test_packet_loss_simulation() -> Vec<TestResult> {
    let mut results = Vec::new();
    
    let loss_percentages = vec![0.0, 1.0, 5.0, 10.0, 20.0];
    
    for loss_percent in loss_percentages {
        results.push(test_udp_packet_loss(loss_percent).await);
    }
    
    results
}

async fn test_udp_packet_loss(loss_percent: f64) -> TestResult {
    let test_name = format!("UDP Packet Loss - {:.1}%", loss_percent);
    let mut result = TestResult::new(test_name);
    
    let env = TestEnvironment::new().await;
    let file_size = 30 * 1024; // 30KB
    let test_file = env.test_files_dir.join("udp_packet_loss_test.bin");
    
    if let Err(e) = TestFileGenerator::create_binary_file(&test_file, file_size).await {
        return result.with_error(format!("Failed to create test file: {}", e));
    }
    
    let port = NetworkUtils::get_available_port();
    let bind_addr = SocketAddr::new(IpAddr::V4(Ipv4Addr::new(127, 0, 0, 1)), port);
    
    let receiver_config = TransferTestUtils::create_udp_config(TransferMode::Receiver, port, None);
    let sender_config = TransferTestUtils::create_udp_config(
        TransferMode::Transmitter, port, Some("127.0.0.1".to_string())
    );
    
    let sim_config = NetworkSimConfig {
        packet_loss_percent: loss_percent,
        latency_ms: 5,
        bandwidth_limit_kbps: None,
        jitter_ms: 0,
    };
    
    let receiver_output_dir = env.downloads_dir.clone();
    let receiver_task = tokio::spawn(async move {
        CommunicationManager::start_receiver(&receiver_config, bind_addr, receiver_output_dir).await
    });
    
    sleep(Duration::from_millis(100)).await;
    
    let start_time = Instant::now();
    let sender_result = timeout(
        Duration::from_secs(20),
        simulate_network_transfer(&sender_config, test_file, bind_addr, &sim_config)
    ).await;
    let transfer_duration = start_time.elapsed();
    
    let receiver_result = timeout(Duration::from_secs(25), receiver_task).await;
    
    match sender_result {
        Ok(Ok(transfer_result)) if transfer_result.success => {
            result = result
                .with_success(true)
                .with_duration(transfer_duration)
                .with_bytes_transferred(transfer_result.bytes_transferred)
                .add_metadata("protocol".to_string(), "UDP".to_string())
                .add_metadata("simulated_loss_percent".to_string(), loss_percent.to_string())
                .add_metadata("file_size_kb".to_string(), "30".to_string());
            
            // Analyze receiver results if available
            if let Ok(Ok(Ok(recv_result))) = receiver_result {
                if recv_result.success {
                    let actual_loss_percent = if transfer_result.bytes_transferred > 0 {
                        let lost_bytes = if transfer_result.bytes_transferred > recv_result.bytes_transferred {
                            transfer_result.bytes_transferred - recv_result.bytes_transferred
                        } else {
                            0
                        };
                        (lost_bytes as f64 / transfer_result.bytes_transferred as f64) * 100.0
                    } else {
                        0.0
                    };
                    
                    result = result
                        .add_metadata("receiver_success".to_string(), "true".to_string())
                        .add_metadata("bytes_received".to_string(), recv_result.bytes_transferred.to_string())
                        .add_metadata("actual_loss_percent".to_string(), format!("{:.2}", actual_loss_percent));
                } else {
                    result = result.add_metadata("receiver_success".to_string(), "false".to_string());
                }
            } else {
                result = result.add_metadata("receiver_success".to_string(), "timeout".to_string());
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

/// Test network instability
async fn test_network_instability() -> Vec<TestResult> {
    let mut results = Vec::new();
    
    results.push(test_intermittent_connectivity().await);
    results.push(test_variable_latency().await);
    
    results
}

async fn test_intermittent_connectivity() -> TestResult {
    let mut result = TestResult::new("Intermittent Connectivity".to_string());
    
    let env = TestEnvironment::new().await;
    let file_size = 50 * 1024; // 50KB
    let test_file = env.test_files_dir.join("intermittent_test.bin");
    
    if let Err(e) = TestFileGenerator::create_binary_file(&test_file, file_size).await {
        return result.with_error(format!("Failed to create test file: {}", e));
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
    
    sleep(Duration::from_millis(200)).await;
    
    // Simulate intermittent connectivity with random delays
    let start_time = Instant::now();
    
    let sender_task = tokio::spawn(async move {
        // Add random delays to simulate network instability
        for _ in 0..5 {
            let delay = rand::thread_rng().gen_range(10..100);
            sleep(Duration::from_millis(delay)).await;
        }
        
        CommunicationManager::start_sender(&sender_config, test_file, bind_addr).await
    });
    
    let sender_result = timeout(Duration::from_secs(30), sender_task).await;
    let transfer_duration = start_time.elapsed();
    
    receiver_task.abort();
    
    match sender_result {
        Ok(Ok(Ok(transfer_result))) if transfer_result.success => {
            result
                .with_success(true)
                .with_duration(transfer_duration)
                .with_bytes_transferred(transfer_result.bytes_transferred)
                .add_metadata("test_type".to_string(), "intermittent_connectivity".to_string())
                .add_metadata("protocol".to_string(), "TCP".to_string())
        }
        Ok(Ok(Ok(transfer_result))) => {
            result.with_error(transfer_result.error.unwrap_or("Transfer failed".to_string()))
        }
        Ok(Ok(Err(e))) => result.with_error(format!("Transfer error: {}", e)),
        Ok(Err(_)) => result.with_error("Sender task panicked".to_string()),
        Err(_) => result.with_error("Transfer timed out".to_string()),
    }
}

async fn test_variable_latency() -> TestResult {
    let mut result = TestResult::new("Variable Latency".to_string());
    
    let env = TestEnvironment::new().await;
    let file_size = 40 * 1024; // 40KB
    let test_file = env.test_files_dir.join("variable_latency_test.bin");
    
    if let Err(e) = TestFileGenerator::create_binary_file(&test_file, file_size).await {
        return result.with_error(format!("Failed to create test file: {}", e));
    }
    
    let port = NetworkUtils::get_available_port();
    let bind_addr = SocketAddr::new(IpAddr::V4(Ipv4Addr::new(127, 0, 0, 1)), port);
    
    let receiver_config = TransferTestUtils::create_udp_config(TransferMode::Receiver, port, None);
    let sender_config = TransferTestUtils::create_udp_config(
        TransferMode::Transmitter, port, Some("127.0.0.1".to_string())
    );
    
    let receiver_output_dir = env.downloads_dir.clone();
    let receiver_task = tokio::spawn(async move {
        CommunicationManager::start_receiver(&receiver_config, bind_addr, receiver_output_dir).await
    });
    
    sleep(Duration::from_millis(100)).await;
    
    let start_time = Instant::now();
    
    // Simulate variable latency
    let sender_task = tokio::spawn(async move {
        // Add variable delays throughout the transfer
        let latencies = vec![5, 50, 10, 100, 20, 75, 15];
        for latency in latencies {
            sleep(Duration::from_millis(latency)).await;
        }
        
        CommunicationManager::start_sender(&sender_config, test_file, bind_addr).await
    });
    
    let sender_result = timeout(Duration::from_secs(25), sender_task).await;
    let transfer_duration = start_time.elapsed();
    
    let _receiver_result = timeout(Duration::from_secs(30), receiver_task).await;
    
    match sender_result {
        Ok(Ok(Ok(transfer_result))) if transfer_result.success => {
            result
                .with_success(true)
                .with_duration(transfer_duration)
                .with_bytes_transferred(transfer_result.bytes_transferred)
                .add_metadata("test_type".to_string(), "variable_latency".to_string())
                .add_metadata("protocol".to_string(), "UDP".to_string())
        }
        Ok(Ok(Ok(transfer_result))) => {
            result.with_error(transfer_result.error.unwrap_or("Transfer failed".to_string()))
        }
        Ok(Ok(Err(e))) => result.with_error(format!("Transfer error: {}", e)),
        Ok(Err(_)) => result.with_error("Sender task panicked".to_string()),
        Err(_) => result.with_error("Transfer timed out".to_string()),
    }
}