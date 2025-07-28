// Broadcast-based event emitter for internal use
use super::{EventEmitter, TransferEvent};
use tokio::sync::broadcast;
use tracing::{debug, error};

pub struct BroadcastEventEmitter {
    sender: broadcast::Sender<TransferEvent>,
}

impl BroadcastEventEmitter {
    pub fn new(capacity: usize) -> (Self, broadcast::Receiver<TransferEvent>) {
        let (sender, receiver) = broadcast::channel(capacity);
        (Self { sender }, receiver)
    }

    pub fn subscribe(&self) -> broadcast::Receiver<TransferEvent> {
        self.sender.subscribe()
    }
}

impl EventEmitter for BroadcastEventEmitter {
    fn emit_event(&self, event: TransferEvent) {
        debug!("Emitting event: {:?}", event);
        if let Err(e) = self.sender.send(event) {
            // Only log as debug if no receivers (common case)
            // Only error if it's a different kind of error
            match e {
                broadcast::error::SendError(_) => {
                    debug!("No receivers for event (this is normal for CLI usage)");
                }
            }
        }
    }
}