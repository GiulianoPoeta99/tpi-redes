// Transfer event enumeration
use serde::{Deserialize, Serialize};

use super::{
    TransferProgressEvent, TransferErrorEvent, TransferCompletedEvent,
    TransferStartedEvent, TransferCancelledEvent, ConnectionEvent
};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum TransferEvent {
    Started(TransferStartedEvent),
    Progress(TransferProgressEvent),
    Error(TransferErrorEvent),
    Completed(TransferCompletedEvent),
    Cancelled(TransferCancelledEvent),
    Connection(ConnectionEvent),
}

impl TransferEvent {
    pub fn transfer_id(&self) -> Option<&str> {
        match self {
            TransferEvent::Started(e) => Some(&e.transfer_id),
            TransferEvent::Progress(e) => Some(&e.transfer_id),
            TransferEvent::Error(e) => Some(&e.transfer_id),
            TransferEvent::Completed(e) => Some(&e.transfer_id),
            TransferEvent::Cancelled(e) => Some(&e.transfer_id),
            TransferEvent::Connection(e) => e.transfer_id.as_deref(),
        }
    }

    pub fn timestamp(&self) -> u64 {
        match self {
            TransferEvent::Started(e) => e.timestamp,
            TransferEvent::Progress(e) => e.timestamp,
            TransferEvent::Error(e) => e.timestamp,
            TransferEvent::Completed(e) => e.timestamp,
            TransferEvent::Cancelled(e) => e.timestamp,
            TransferEvent::Connection(e) => e.timestamp,
        }
    }
}