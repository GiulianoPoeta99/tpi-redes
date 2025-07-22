// Console event emitter for CLI usage
use super::{EventEmitter, TransferEvent};

pub struct ConsoleEventEmitter {
    verbose: bool,
}

impl ConsoleEventEmitter {
    pub fn new(verbose: bool) -> Self {
        Self { verbose }
    }
}

impl EventEmitter for ConsoleEventEmitter {
    fn emit_event(&self, event: TransferEvent) {
        match event {
            TransferEvent::Started(e) => {
                println!("🚀 Starting transfer: {} -> {}", e.filename, e.target);
            }
            TransferEvent::Progress(e) => {
                if self.verbose || e.progress % 0.1 < 0.01 { // Show every 10% or if verbose
                    println!(
                        "📊 Progress: {:.1}% ({:.2} MB/s, ETA: {}s)",
                        e.progress * 100.0,
                        e.speed / 1_000_000.0,
                        e.eta
                    );
                }
            }
            TransferEvent::Completed(e) => {
                println!(
                    "✅ Transfer completed: {} bytes in {:.2}s ({:.2} MB/s)",
                    e.bytes_transferred,
                    e.duration as f64 / 1000.0,
                    e.throughput_mbps
                );
            }
            TransferEvent::Error(e) => {
                eprintln!("❌ Transfer failed: {}", e.error);
                if let Some(suggestion) = e.recovery_suggestion {
                    eprintln!("💡 Suggestion: {}", suggestion);
                }
            }
            TransferEvent::Cancelled(e) => {
                println!("⏹️  Transfer cancelled: {}", e.reason);
            }
            TransferEvent::Connection(e) => {
                if self.verbose {
                    if e.success {
                        println!("🔗 Connection {}: {}", e.event_type, e.address);
                    } else {
                        eprintln!("🔌 Connection failed: {} to {}", e.event_type, e.address);
                    }
                }
            }
        }
    }
}