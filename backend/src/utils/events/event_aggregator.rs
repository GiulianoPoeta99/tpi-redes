// Event aggregator for collecting and processing events
use super::TransferEvent;
use std::sync::Arc;

pub struct EventAggregator {
    events: Arc<tokio::sync::Mutex<Vec<TransferEvent>>>,
    max_events: usize,
}

impl EventAggregator {
    pub fn new(max_events: usize) -> Self {
        Self {
            events: Arc::new(tokio::sync::Mutex::new(Vec::new())),
            max_events,
        }
    }

    pub async fn add_event(&self, event: TransferEvent) {
        let mut events = self.events.lock().await;
        events.push(event);
        
        // Keep only the most recent events
        if events.len() > self.max_events {
            let excess = events.len() - self.max_events;
            events.drain(0..excess);
        }
    }

    pub async fn get_events(&self) -> Vec<TransferEvent> {
        self.events.lock().await.clone()
    }

    pub async fn get_events_for_transfer(&self, transfer_id: &str) -> Vec<TransferEvent> {
        self.events
            .lock()
            .await
            .iter()
            .filter(|event| event.transfer_id() == Some(transfer_id))
            .cloned()
            .collect()
    }

    pub async fn clear_events(&self) {
        self.events.lock().await.clear();
    }
}