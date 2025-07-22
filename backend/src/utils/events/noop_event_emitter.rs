// No-op implementation for testing or when events are not needed
use super::{EventEmitter, TransferEvent};

pub struct NoOpEventEmitter;

impl EventEmitter for NoOpEventEmitter {
    fn emit_event(&self, _event: TransferEvent) {
        // No-op
    }
}