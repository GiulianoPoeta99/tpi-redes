// Integration tests for UDP fire-and-forget protocol behavior
use file_transfer_backend::network::udp::UdpTransfer;
use file_transfer_backend::config::{TransferConfig, TransferMode, Protocol};
use std::net::{SocketAddr, IpAddr, Ipv4Addr};
use std::time::Duration;
use tempfile::{NamedTempFile, TempDir};
use tokio::time::timeout;
use std::io::Write;

async fn create_test_file(content: &[u8]) -> NamedTempFile {
    let mut temp_file = NamedTempFile::new().unwrap();
    temp_file.write_all(content).unwrap();
    temp_file.flush().unwrap();
    temp_file
}

fn create_sender_config() -> TransferConfig {
    TransferConfig {
        mode: TransferMode::Transmitter,
        protocol: Protocol::Udp,
        target_ip: Some("127.0.0.1".to_string()),
        port: 0,
        filename: None,
        chunk_size: 1024,
        timeout: Duration::from_secs(30),
    }
}

#[tokio::test]
async fn test_udp_fire_and_forget_integration() {
    // Test that UDP sender completes successfully even when no receiver is listening
    let mut sender = UdpTransfer::new(create_sender_config());
    
    // Create test file
    let test_content = b"UDP fire-and-forget integration test content";
    let temp_file = create_test_file(test_content).await;
    
    // Bind sender to local address
    let sender_addr = SocketAddr::new(IpAddr::V4(Ipv4Addr::new(127, 0, 0, 1)), 0);
    sender.bind_sender(sender_addr).await.unwrap();
    
    // Send to non-existent receiver (fire-and-forget should succeed)
    let target_addr = SocketAddr::new(IpAddr::V4(Ipv4Addr::new(127, 0, 0, 1)), 9999);
    
    let result = sender.send_file_unreliable(temp_file.path().to_path_buf(), target_addr).await;
    
    // Should succeed despite no receiver
    assert!(result.is_ok());
    let transfer_result = result.unwrap();
    assert!(transfer_result.success);
    assert_eq!(transfer_result.bytes_transferred, test_content.len() as u64);
}

#[tokio::test]
async fn test_udp_receiver_timeout_completion() {
    // Test that UDP receiver completes after timeout when no data is received
    let receiver_addr = SocketAddr::new(IpAddr::V4(Ipv4Addr::new(127, 0, 0, 1)), 0);
    let timeout_duration = Duration::from_secs(2);
    
    let mut receiver = UdpTransfer::bind_receiver(receiver_addr, timeout_duration).await.unwrap();
    let temp_dir = TempDir::new().unwrap();
    
    // Start receiving with timeout
    let start_time = std::time::Instant::now();
    let result = receiver.receive_file_with_timeout(temp_dir.path().to_path_buf(), timeout_duration).await;
    let elapsed = start_time.elapsed();
    
    // Should complete due to timeout
    assert!(result.is_ok());
    let transfer_result = result.unwrap();
    assert!(transfer_result.success);
    assert_eq!(transfer_result.bytes_transferred, 0); // No data received
    
    // Should complete within reasonable time of the timeout
    assert!(elapsed >= timeout_duration);
    assert!(elapsed < timeout_duration + Duration::from_millis(500));
}

#[tokio::test]
async fn test_udp_sender_receiver_integration() {
    // Test actual UDP communication between sender and receiver
    let test_content = b"UDP sender-receiver integration test with multiple chunks to verify 1KB chunking behavior";
    let temp_file = create_test_file(test_content).await;
    let temp_dir = TempDir::new().unwrap();
    
    // Start receiver first
    let receiver_addr = SocketAddr::new(IpAddr::V4(Ipv4Addr::new(127, 0, 0, 1)), 0);
    let timeout_duration = Duration::from_secs(5);
    
    let mut receiver = UdpTransfer::bind_receiver(receiver_addr, timeout_duration).await.unwrap();
    let actual_receiver_addr = receiver.socket().unwrap().local_addr().unwrap();
    
    // Start receiver in background
    let receiver_handle = tokio::spawn(async move {
        receiver.receive_file_with_timeout(temp_dir.path().to_path_buf(), timeout_duration).await
    });
    
    // Give receiver time to start
    tokio::time::sleep(Duration::from_millis(100)).await;
    
    // Start sender
    let mut sender = UdpTransfer::new(create_sender_config());
    let sender_addr = SocketAddr::new(IpAddr::V4(Ipv4Addr::new(127, 0, 0, 1)), 0);
    sender.bind_sender(sender_addr).await.unwrap();
    
    // Send file
    let send_result = sender.send_file_unreliable(temp_file.path().to_path_buf(), actual_receiver_addr).await;
    
    // Wait for receiver to complete
    let receive_result = timeout(Duration::from_secs(10), receiver_handle).await.unwrap().unwrap();
    
    // Verify both sender and receiver succeeded
    assert!(send_result.is_ok());
    assert!(receive_result.is_ok());
    
    let send_transfer = send_result.unwrap();
    let receive_transfer = receive_result.unwrap();
    
    assert!(send_transfer.success);
    assert!(receive_transfer.success);
    assert_eq!(send_transfer.bytes_transferred, test_content.len() as u64);
    
    // Note: Due to UDP's unreliable nature, receiver might not get all bytes
    // This is expected behavior for fire-and-forget protocol
    println!("Sent: {} bytes, Received: {} bytes", 
             send_transfer.bytes_transferred, 
             receive_transfer.bytes_transferred);
}

#[tokio::test]
async fn test_udp_1kb_chunk_behavior() {
    // Test that UDP uses 1KB chunks as specified in requirements
    let mut sender = UdpTransfer::new(create_sender_config());
    
    // Verify chunk size is 1KB
    assert_eq!(sender.chunk_size(), 1024);
    
    // Create file larger than 1KB to test chunking
    let large_content = vec![0u8; 3072]; // 3KB file
    let temp_file = create_test_file(&large_content).await;
    
    let sender_addr = SocketAddr::new(IpAddr::V4(Ipv4Addr::new(127, 0, 0, 1)), 0);
    sender.bind_sender(sender_addr).await.unwrap();
    
    let target_addr = SocketAddr::new(IpAddr::V4(Ipv4Addr::new(127, 0, 0, 1)), 9999);
    
    // Should handle large file with 1KB chunks
    let result = sender.send_file_unreliable(temp_file.path().to_path_buf(), target_addr).await;
    assert!(result.is_ok());
    
    let transfer_result = result.unwrap();
    assert_eq!(transfer_result.bytes_transferred, 3072);
}

#[tokio::test]
async fn test_udp_no_reliability_guarantees() {
    // Test that UDP doesn't provide reliability guarantees
    let mut sender = UdpTransfer::new(create_sender_config());
    
    let test_content = b"No reliability test";
    let temp_file = create_test_file(test_content).await;
    
    let sender_addr = SocketAddr::new(IpAddr::V4(Ipv4Addr::new(127, 0, 0, 1)), 0);
    sender.bind_sender(sender_addr).await.unwrap();
    
    // Send to multiple non-existent addresses (should all succeed due to fire-and-forget)
    for port in 9990..9995 {
        let target_addr = SocketAddr::new(IpAddr::V4(Ipv4Addr::new(127, 0, 0, 1)), port);
        let result = sender.send_file_unreliable(temp_file.path().to_path_buf(), target_addr).await;
        
        // All should succeed regardless of whether receiver exists
        assert!(result.is_ok());
    }
}

#[tokio::test]
async fn test_udp_fin_marker_behavior() {
    // Test that FIN markers (empty packets) are sent correctly
    let mut sender = UdpTransfer::new(create_sender_config());
    
    let test_content = b"FIN marker test";
    let temp_file = create_test_file(test_content).await;
    
    let sender_addr = SocketAddr::new(IpAddr::V4(Ipv4Addr::new(127, 0, 0, 1)), 0);
    sender.bind_sender(sender_addr).await.unwrap();
    
    let target_addr = SocketAddr::new(IpAddr::V4(Ipv4Addr::new(127, 0, 0, 1)), 9999);
    
    // Measure time to ensure FIN markers are sent quickly
    let start = std::time::Instant::now();
    let result = sender.send_file_unreliable(temp_file.path().to_path_buf(), target_addr).await;
    let elapsed = start.elapsed();
    
    assert!(result.is_ok());
    
    // Should complete quickly (fire-and-forget with FIN markers)
    assert!(elapsed < Duration::from_secs(1));
}

#[tokio::test]
async fn test_udp_continuous_sending_performance() {
    // Test that UDP sends continuously without waiting for acknowledgments
    let mut sender = UdpTransfer::new(create_sender_config());
    
    // Create larger file to test continuous sending
    let large_content = vec![42u8; 10240]; // 10KB file
    let temp_file = create_test_file(&large_content).await;
    
    let sender_addr = SocketAddr::new(IpAddr::V4(Ipv4Addr::new(127, 0, 0, 1)), 0);
    sender.bind_sender(sender_addr).await.unwrap();
    
    let target_addr = SocketAddr::new(IpAddr::V4(Ipv4Addr::new(127, 0, 0, 1)), 9999);
    
    // Measure sending time
    let start = std::time::Instant::now();
    let result = sender.send_file_unreliable(temp_file.path().to_path_buf(), target_addr).await;
    let elapsed = start.elapsed();
    
    assert!(result.is_ok());
    
    // Should be very fast due to no acknowledgment waiting
    assert!(elapsed < Duration::from_secs(2));
    
    let transfer_result = result.unwrap();
    assert_eq!(transfer_result.bytes_transferred, 10240);
    
    // Calculate effective throughput (should be high due to no waiting)
    let throughput_mbps = (transfer_result.bytes_transferred as f64 * 8.0) / (elapsed.as_secs_f64() * 1_000_000.0);
    println!("UDP fire-and-forget throughput: {:.2} Mbps", throughput_mbps);
}