use crate::config::{Protocol, TransferConfig, TransferMode};
use crate::sockets::udp::UdpTransfer;
// Note: ReliabilityLayer, SequenceTracker, SlidingWindow not implemented in current UDP version
use crate::transfer::ack_status::AckStatus;
use std::io::Write;
use std::net::SocketAddr;
use std::path::PathBuf;
use std::time::Duration;
use tempfile::NamedTempFile;

#[tokio::test]
async fn test_udp_transfer_creation() {
    let config = TransferConfig {
        mode: TransferMode::Transmitter,
        protocol: Protocol::Udp,
        target_ip: Some("127.0.0.1".to_string()),
        port: 8080,
        filename: Some("test.txt".to_string()),
        chunk_size: 1024,
        timeout: Duration::from_secs(30),
    };
    
    let transfer = UdpTransfer::new(config);
    assert!(transfer.socket.is_none());
}

#[tokio::test]
async fn test_udp_socket_binding() {
    let config = TransferConfig {
        mode: TransferMode::Receiver,
        protocol: Protocol::Udp,
        target_ip: None,
        port: 0, // Let OS choose port
        filename: None,
        chunk_size: 1024,
        timeout: Duration::from_secs(30),
    };
    
    let mut transfer = UdpTransfer::new(config);
    let addr: SocketAddr = "127.0.0.1:0".parse().unwrap();
    
    let result = transfer.bind(addr).await;
    assert!(result.is_ok());
    assert!(transfer.socket.is_some());
}

#[test]
fn test_sequence_tracker_initialization() {
    let tracker = SequenceTracker::new();
    assert_eq!(tracker.next_sequence, 0);
    assert_eq!(tracker.expected_sequence, 0);
    assert!(tracker.received_sequences.is_empty());
    assert!(tracker.out_of_order_buffer.is_empty());
}

#[test]
fn test_sequence_tracker_next_sequence() {
    let mut tracker = SequenceTracker::new();
    
    assert_eq!(tracker.get_next_sequence(), 0);
    assert_eq!(tracker.get_next_sequence(), 1);
    assert_eq!(tracker.get_next_sequence(), 2);
}

#[test]
fn test_sequence_tracker_mark_received_in_order() {
    let mut tracker = SequenceTracker::new();
    
    tracker.mark_received(0);
    assert!(tracker.received_sequences.contains(&0));
    assert_eq!(tracker.expected_sequence, 1);
    
    tracker.mark_received(1);
    assert!(tracker.received_sequences.contains(&1));
    assert_eq!(tracker.expected_sequence, 2);
}

#[test]
fn test_sequence_tracker_out_of_order_handling() {
    let mut tracker = SequenceTracker::new();
    
    // Receive packet 2 before 0 and 1
    tracker.buffer_out_of_order(2, vec![1, 2, 3]);
    assert!(tracker.out_of_order_buffer.contains_key(&2));
    assert_eq!(tracker.expected_sequence, 0);
    
    // Receive packet 0
    tracker.mark_received(0);
    assert_eq!(tracker.expected_sequence, 1);
    
    // Receive packet 1 - should process buffered packet 2
    tracker.mark_received(1);
    assert_eq!(tracker.expected_sequence, 3);
    assert!(!tracker.out_of_order_buffer.contains_key(&2));
    assert!(tracker.received_sequences.contains(&2));
}

#[test]
fn test_sequence_tracker_duplicate_detection() {
    let mut tracker = SequenceTracker::new();
    
    tracker.mark_received(0);
    assert!(tracker.is_duplicate(0));
    assert!(!tracker.is_duplicate(1));
}

#[test]
fn test_sequence_tracker_expected_or_buffered() {
    let mut tracker = SequenceTracker::new();
    
    // Initially expecting sequence 0
    assert!(tracker.is_expected_or_buffered(0));
    assert!(tracker.is_expected_or_buffered(1));
    assert!(tracker.is_expected_or_buffered(10));
    
    // After receiving 0, expecting 1
    tracker.mark_received(0);
    assert!(!tracker.is_expected_or_buffered(0)); // This would be a duplicate
    assert!(tracker.is_expected_or_buffered(1));
    assert!(tracker.is_expected_or_buffered(5));
}

#[test]
fn test_sliding_window_initialization() {
    let window = SlidingWindow::new(10);
    assert_eq!(window.window_start, 0);
    assert_eq!(window.window_size, 10);
    assert!(window.in_flight.is_empty());
}

#[test]
fn test_sliding_window_add_in_flight() {
    let mut window = SlidingWindow::new(10);
    
    window.add_in_flight(0, vec![1, 2, 3]);
    assert!(window.in_flight.contains_key(&0));
    assert_eq!(window.in_flight[&0].data, vec![1, 2, 3]);
    assert_eq!(window.in_flight[&0].retry_count, 0);
}

#[test]
fn test_sliding_window_acknowledge_packet() {
    let mut window = SlidingWindow::new(10);
    
    window.add_in_flight(0, vec![1, 2, 3]);
    window.add_in_flight(1, vec![4, 5, 6]);
    
    // Acknowledge packet 0
    assert!(window.acknowledge_packet(0));
    assert!(!window.in_flight.contains_key(&0));
    assert_eq!(window.window_start, 1);
    
    // Acknowledge non-existent packet
    assert!(!window.acknowledge_packet(10));
}

#[test]
fn test_sliding_window_get_next_chunk() {
    let mut window = SlidingWindow::new(3);
    
    // Initially should return 0
    assert_eq!(window.get_next_chunk_to_send(), 0);
    
    // Add packet 0 in flight
    window.add_in_flight(0, vec![1, 2, 3]);
    assert_eq!(window.get_next_chunk_to_send(), 1);
    
    // Add packets 1 and 2
    window.add_in_flight(1, vec![4, 5, 6]);
    window.add_in_flight(2, vec![7, 8, 9]);
    
    // Window is full, should return next after window
    assert_eq!(window.get_next_chunk_to_send(), 3);
    
    // Acknowledge packet 0, window should advance
    window.acknowledge_packet(0);
    assert_eq!(window.get_next_chunk_to_send(), 3);
}

#[test]
fn test_sliding_window_timeout_detection() {
    let mut window = SlidingWindow::new(10);
    let timeout = Duration::from_millis(100);
    
    window.add_in_flight(0, vec![1, 2, 3]);
    
    // Immediately check - should not be timed out
    let timed_out = window.get_timed_out_packets(timeout);
    assert!(timed_out.is_empty());
    
    // Manually set sent time to past
    if let Some(packet) = window.in_flight.get_mut(&0) {
        packet.sent_time = std::time::Instant::now() - Duration::from_millis(200);
    }
    
    // Now should be timed out
    let timed_out = window.get_timed_out_packets(timeout);
    assert_eq!(timed_out, vec![0]);
}

#[test]
fn test_sliding_window_retransmission() {
    let mut window = SlidingWindow::new(10);
    
    window.add_in_flight(0, vec![1, 2, 3]);
    
    // Get packet for retransmission
    let packet = window.get_packet_for_retransmission(0);
    assert!(packet.is_some());
    
    let packet = packet.unwrap();
    assert_eq!(packet.retry_count, 1);
    assert_eq!(packet.data, vec![1, 2, 3]);
    
    // Try again
    let packet = window.get_packet_for_retransmission(0);
    assert!(packet.is_some());
    assert_eq!(packet.unwrap().retry_count, 2);
    
    // Non-existent packet
    let packet = window.get_packet_for_retransmission(10);
    assert!(packet.is_none());
}

#[test]
fn test_reliability_layer_initialization() {
    let reliability = ReliabilityLayer::new();
    assert_eq!(reliability.window_size, 64);
    assert_eq!(reliability.timeout, Duration::from_millis(1000));
    assert_eq!(reliability.max_retries, 3);
}

#[test]
fn test_reliability_layer_reset() {
    let mut reliability = ReliabilityLayer::new();
    
    // Add some state
    reliability.sequence_tracker.get_next_sequence();
    reliability.sliding_window.add_in_flight(0, vec![1, 2, 3]);
    
    // Reset
    reliability.reset();
    
    // Verify reset state
    assert_eq!(reliability.sequence_tracker.next_sequence, 0);
    assert_eq!(reliability.sequence_tracker.expected_sequence, 0);
    assert!(reliability.sequence_tracker.received_sequences.is_empty());
    assert!(reliability.sliding_window.in_flight.is_empty());
    assert_eq!(reliability.sliding_window.window_start, 0);
}

#[tokio::test]
async fn test_udp_transfer_integration_small_file() {
    // Create a small test file
    let mut temp_file = NamedTempFile::new().unwrap();
    let test_data = b"Hello, UDP World! This is a test file for UDP transfer.";
    temp_file.write_all(test_data).unwrap();
    temp_file.flush().unwrap();
    
    let config = TransferConfig {
        mode: TransferMode::Transmitter,
        protocol: Protocol::Udp,
        target_ip: Some("127.0.0.1".to_string()),
        port: 8081,
        filename: Some("test.txt".to_string()),
        chunk_size: 16, // Small chunks to test multiple packets
        timeout: Duration::from_secs(5),
    };
    
    let mut sender = UdpTransfer::new(config.clone());
    
    // Test that we can create the transfer without errors
    let sender_addr: SocketAddr = "127.0.0.1:0".parse().unwrap();
    let result = sender.bind(sender_addr).await;
    assert!(result.is_ok());
}

#[tokio::test]
async fn test_udp_message_serialization() {
    use crate::transfer::protocol_messages::ProtocolMessage;
    
    let config = TransferConfig {
        mode: TransferMode::Transmitter,
        protocol: Protocol::Udp,
        target_ip: Some("127.0.0.1".to_string()),
        port: 8082,
        filename: Some("test.txt".to_string()),
        chunk_size: 1024,
        timeout: Duration::from_secs(30),
    };
    
    let _transfer = UdpTransfer::new(config);
    
    // Test message serialization
    let handshake = ProtocolMessage::Handshake {
        filename: "test.txt".to_string(),
        size: 1024,
        checksum: "abc123".to_string(),
    };
    
    let serialized = bincode::serialize(&handshake);
    assert!(serialized.is_ok());
    
    let deserialized: Result<ProtocolMessage, _> = bincode::deserialize(&serialized.unwrap());
    assert!(deserialized.is_ok());
    
    match deserialized.unwrap() {
        ProtocolMessage::Handshake { filename, size, checksum } => {
            assert_eq!(filename, "test.txt");
            assert_eq!(size, 1024);
            assert_eq!(checksum, "abc123");
        }
        _ => panic!("Wrong message type"),
    }
}

#[test]
fn test_ack_status_functionality() {
    assert!(AckStatus::Ok.is_success());
    assert!(!AckStatus::Ok.needs_retry());
    assert!(!AckStatus::Ok.is_error());
    
    assert!(!AckStatus::Retry.is_success());
    assert!(AckStatus::Retry.needs_retry());
    assert!(!AckStatus::Retry.is_error());
    
    assert!(!AckStatus::Error.is_success());
    assert!(!AckStatus::Error.needs_retry());
    assert!(AckStatus::Error.is_error());
}

#[tokio::test]
async fn test_udp_transfer_error_handling() {
    let config = TransferConfig {
        mode: TransferMode::Transmitter,
        protocol: Protocol::Udp,
        target_ip: Some("127.0.0.1".to_string()),
        port: 8083,
        filename: Some("nonexistent.txt".to_string()),
        chunk_size: 1024,
        timeout: Duration::from_secs(30),
    };
    
    let mut transfer = UdpTransfer::new(config);
    
    // Try to send a non-existent file
    let result = transfer.send_file(
        PathBuf::from("nonexistent.txt"),
        "127.0.0.1:8083".parse().unwrap()
    ).await;
    
    assert!(result.is_err());
    
    // The error should be a file error
    match result.unwrap_err() {
        crate::utils::TransferError::FileError { .. } => {
            // Expected error type
        }
        _ => panic!("Expected FileError"),
    }
}

#[test]
fn test_sliding_window_edge_cases() {
    let mut window = SlidingWindow::new(1); // Very small window
    
    // Add one packet
    window.add_in_flight(0, vec![1, 2, 3]);
    
    // Window should be full
    assert_eq!(window.get_next_chunk_to_send(), 1);
    
    // Acknowledge the packet
    assert!(window.acknowledge_packet(0));
    
    // Now we should be able to send the next packet
    assert_eq!(window.get_next_chunk_to_send(), 1);
}

#[test]
fn test_sequence_tracker_large_gaps() {
    let mut tracker = SequenceTracker::new();
    
    // Receive a packet far in the future
    tracker.buffer_out_of_order(100, vec![1, 2, 3]);
    assert!(tracker.out_of_order_buffer.contains_key(&100));
    
    // Should still expect sequence 0
    assert_eq!(tracker.expected_sequence, 0);
    
    // Receive sequence 0
    tracker.mark_received(0);
    assert_eq!(tracker.expected_sequence, 1);
    
    // The far future packet should still be buffered
    assert!(tracker.out_of_order_buffer.contains_key(&100));
}

#[test]
fn test_retransmission_queue() {
    // use crate::sockets::udp::RetransmissionQueue; // Not implemented in current UDP version
    
    let mut queue = RetransmissionQueue::new();
    
    // Add packets for retransmission
    queue.add_for_retransmission(0, Duration::from_millis(100));
    queue.add_for_retransmission(1, Duration::from_millis(200));
    
    // Initially, nothing should be ready
    let ready = queue.get_ready_for_retransmission();
    assert!(ready.is_empty());
    
    // Simulate time passing
    std::thread::sleep(Duration::from_millis(150));
    
    // Now packet 0 should be ready, but not packet 1
    let ready = queue.get_ready_for_retransmission();
    assert_eq!(ready.len(), 1);
    assert_eq!(ready[0], 0);
    
    // Remove packet 1
    queue.remove(1);
    
    // Wait for packet 1's timeout
    std::thread::sleep(Duration::from_millis(100));
    
    // Should be empty since packet 1 was removed
    let ready = queue.get_ready_for_retransmission();
    assert!(ready.is_empty());
}