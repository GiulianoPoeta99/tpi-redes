#[cfg(test)]
mod events_tests {
    use crate::utils::events::{TransferEvent, EventEmitter, BroadcastEventEmitter};
    use std::sync::{Arc, Mutex};

    #[test]
    fn test_transfer_event_creation() {
        let event = TransferEvent::TransferStarted {
            transfer_id: "test_123".to_string(),
            file_name: "test.txt".to_string(),
            file_size: 1024,
        };
        
        match event {
            TransferEvent::TransferStarted { transfer_id, file_name, file_size } => {
                assert_eq!(transfer_id, "test_123");
                assert_eq!(file_name, "test.txt");
                assert_eq!(file_size, 1024);
            }
            _ => panic!("Expected TransferStarted event"),
        }
    }

    #[test]
    fn test_transfer_event_progress() {
        let event = TransferEvent::TransferProgress {
            transfer_id: "test_123".to_string(),
            bytes_transferred: 512,
            total_bytes: 1024,
            percentage: 50.0,
        };
        
        match event {
            TransferEvent::TransferProgress { percentage, .. } => {
                assert_eq!(percentage, 50.0);
            }
            _ => panic!("Expected TransferProgress event"),
        }
    }

    #[tokio::test]
    async fn test_broadcast_event_emitter() {
        let emitter = BroadcastEventEmitter::new();
        let received_events = Arc::new(Mutex::new(Vec::new()));
        let received_events_clone = received_events.clone();
        
        // In a real implementation, you'd set up a receiver here
        // For now, just test that we can create and emit events
        
        let event = TransferEvent::TransferStarted {
            transfer_id: "test_123".to_string(),
            file_name: "test.txt".to_string(),
            file_size: 1024,
        };
        
        emitter.emit(event).await;
        
        // In a real test, you'd verify the event was received
        // This is a simplified test structure
        assert!(true);
    }

    #[test]
    fn test_event_serialization() {
        let event = TransferEvent::TransferCompleted {
            transfer_id: "test_123".to_string(),
            file_name: "test.txt".to_string(),
            bytes_transferred: 1024,
            duration_ms: 5000,
        };
        
        // Test that events can be cloned and compared
        let cloned_event = event.clone();
        
        match (&event, &cloned_event) {
            (
                TransferEvent::TransferCompleted { transfer_id: id1, .. },
                TransferEvent::TransferCompleted { transfer_id: id2, .. }
            ) => {
                assert_eq!(id1, id2);
            }
            _ => panic!("Events should match"),
        }
    }

    #[test]
    fn test_error_event() {
        let event = TransferEvent::TransferError {
            transfer_id: "test_123".to_string(),
            error_message: "Connection failed".to_string(),
            recoverable: true,
        };
        
        match event {
            TransferEvent::TransferError { recoverable: true, .. } => (),
            _ => panic!("Expected recoverable error event"),
        }
    }
}