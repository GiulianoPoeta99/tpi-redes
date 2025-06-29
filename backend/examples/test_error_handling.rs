// Example to test error handling and logging infrastructure
use file_transfer_backend::utils::{
    errors::{TransferError, RetryHandler, RetryConfig},
    logging::{init_simple_logging, TransferLogger},
    events::{EventBuilder, ConsoleEventEmitter, EventEmitter},
    error_utils::{FileErrorHelper, ConfigValidator, ErrorCollector},
};
use std::path::Path;
use std::time::Duration;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Initialize logging
    init_simple_logging(true);
    
    println!("🧪 Testing Error Handling and Logging Infrastructure\n");
    
    // Test 1: Error creation and serialization
    println!("1. Testing error creation and context:");
    let error = TransferError::FileNotFound {
        path: "/non/existent/file.txt".to_string(),
    };
    println!("   Error: {}", error);
    println!("   Code: {}", error.error_code());
    println!("   Recoverable: {}", error.is_recoverable());
    println!("   Context: {:?}", error.get_context());
    
    // Test 2: Configuration validation
    println!("\n2. Testing configuration validation:");
    let mut collector = ErrorCollector::new();
    collector.add_result(ConfigValidator::validate_port(0));
    collector.add_result(ConfigValidator::validate_ip_address("invalid-ip"));
    collector.add_result(ConfigValidator::validate_chunk_size(0));
    
    if collector.has_errors() {
        println!("   Validation errors found:");
        for error in collector.errors() {
            println!("   - {}", error);
        }
    }
    
    // Test 3: File validation
    println!("\n3. Testing file validation:");
    match FileErrorHelper::validate_file_access(Path::new("/etc/passwd"), "read").await {
        Ok(_) => println!("   ✅ File validation passed"),
        Err(e) => println!("   ❌ File validation failed: {}", e),
    }
    
    // Test 4: Retry mechanism
    println!("\n4. Testing retry mechanism:");
    let retry_config = RetryConfig::new(3)
        .with_delays(Duration::from_millis(100), Duration::from_secs(2));
    let retry_handler = RetryHandler::new(retry_config);
    
    use std::sync::Arc;
    use std::sync::atomic::{AtomicU32, Ordering};
    let attempt_count = Arc::new(AtomicU32::new(0));
    let attempt_count_clone = attempt_count.clone();
    
    let result = retry_handler.retry_with_backoff(move || {
        let count = attempt_count_clone.fetch_add(1, Ordering::SeqCst) + 1;
        async move {
            if count < 3 {
                Err(TransferError::NetworkError {
                    message: format!("Simulated failure #{}", count),
                    context: Some("test".to_string()),
                    recoverable: true,
                })
            } else {
                Ok("Success after retries!")
            }
        }
    }).await;
    
    match result {
        Ok(msg) => println!("   ✅ Retry succeeded: {}", msg),
        Err(e) => println!("   ❌ Retry failed: {}", e),
    }
    
    // Test 5: Event system
    println!("\n5. Testing event system:");
    let emitter = ConsoleEventEmitter::new(true);
    
    let started_event = EventBuilder::started_event(
        "test-123".to_string(),
        "test.txt".to_string(),
        1024,
        "127.0.0.1:8080".to_string(),
        "tcp".to_string(),
        "transmitter".to_string(),
    );
    emitter.emit_started(started_event);
    
    let progress_event = EventBuilder::progress_event(
        "test-123".to_string(),
        0.5,
        1_000_000.0,
        30,
        512,
        1024,
    );
    emitter.emit_progress(progress_event);
    
    let error_event = EventBuilder::error_event(
        "test-123".to_string(),
        &TransferError::NetworkError {
            message: "Connection lost".to_string(),
            context: Some("127.0.0.1:8080".to_string()),
            recoverable: true,
        }
    );
    emitter.emit_error(error_event);
    
    // Test 6: Structured logging
    println!("\n6. Testing structured logging:");
    TransferLogger::log_transfer_start("test-456", "large-file.bin", "192.168.1.100:9090", "udp", "transmitter");
    TransferLogger::log_transfer_progress("test-456", 0.75, 5_000_000.0, 768, 1024, 15);
    TransferLogger::log_transfer_complete("test-456", 1024, 2000, "abc123def", "udp");
    
    println!("\n✅ All tests completed successfully!");
    Ok(())
}