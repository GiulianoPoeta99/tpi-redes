// Event emission trait for different backends (Tauri, CLI, etc.)
use super::{
    TransferEvent, TransferProgressEvent, TransferErrorEvent, TransferCompletedEvent,
    TransferStartedEvent, TransferCancelledEvent, ConnectionEvent
};

pub trait EventEmitter: Send + Sync {
    fn emit_event(&self, event: TransferEvent);
    
    fn emit_progress(&self, event: TransferProgressEvent) {
        self.emit_event(TransferEvent::Progress(event));
    }
    
    fn emit_error(&self, event: TransferErrorEvent) {
        self.emit_event(TransferEvent::Error(event));
    }
    
    fn emit_completed(&self, event: TransferCompletedEvent) {
        self.emit_event(TransferEvent::Completed(event));
    }
    
    fn emit_started(&self, event: TransferStartedEvent) {
        self.emit_event(TransferEvent::Started(event));
    }
    
    fn emit_cancelled(&self, event: TransferCancelledEvent) {
        self.emit_event(TransferEvent::Cancelled(event));
    }
    
    fn emit_connection(&self, event: ConnectionEvent) {
        self.emit_event(TransferEvent::Connection(event));
    }
}