// Session management for transfer orchestrator
use crate::core::transfer::{TransferSession, TransferProgress};
use crate::errors::TransferError;
use crate::config::TransferConfig;
use std::collections::HashMap;
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::sync::RwLock;
use tracing::debug;
use uuid::Uuid;

/// Manages transfer sessions lifecycle
pub struct SessionManager {
    sessions: Arc<RwLock<HashMap<String, TransferSession>>>,
}

impl SessionManager {
    pub fn new() -> Self {
        Self {
            sessions: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    /// Create a new transfer session
    pub async fn create_session(&self, config: TransferConfig) -> Result<String, TransferError> {
        let transfer_id = Uuid::new_v4().to_string();
        let session = TransferSession::new(transfer_id.clone(), config);

        let mut sessions = self.sessions.write().await;
        sessions.insert(transfer_id.clone(), session);

        debug!("Created transfer session: {}", transfer_id);
        Ok(transfer_id)
    }

    /// Get a session by ID
    pub async fn get_session(&self, transfer_id: &str) -> Result<TransferSession, TransferError> {
        let sessions = self.sessions.read().await;
        sessions.get(transfer_id)
            .cloned()
            .ok_or_else(|| TransferError::Unknown {
                message: format!("Transfer session not found: {}", transfer_id),
                context: Some(transfer_id.to_string()),
            })
    }

    /// Update session to started state
    pub async fn start_session(
        &self,
        transfer_id: &str,
        file_path: Option<std::path::PathBuf>,
        target_address: Option<String>,
        file_size: u64,
    ) -> Result<(TransferConfig, Arc<std::sync::atomic::AtomicBool>), TransferError> {
        let mut sessions = self.sessions.write().await;
        let session = sessions.get_mut(transfer_id)
            .ok_or_else(|| TransferError::Unknown {
                message: format!("Transfer session not found: {}", transfer_id),
                context: Some(transfer_id.to_string()),
            })?;

        if session.is_active() {
            return Err(TransferError::Unknown {
                message: "Transfer already active".to_string(),
                context: Some(transfer_id.to_string()),
            });
        }

        session.start(file_path, target_address, file_size);
        Ok((session.config.clone(), Arc::clone(&session.cancellation_flag)))
    }

    /// Cancel a transfer session
    pub async fn cancel_session(&self, transfer_id: &str) -> Result<u64, TransferError> {
        let mut sessions = self.sessions.write().await;
        let session = sessions.get_mut(transfer_id)
            .ok_or_else(|| TransferError::Unknown {
                message: format!("Transfer session not found: {}", transfer_id),
                context: Some(transfer_id.to_string()),
            })?;

        if !session.is_active() {
            return Err(TransferError::Unknown {
                message: "Transfer not active".to_string(),
                context: Some(transfer_id.to_string()),
            });
        }

        let bytes_transferred = session.bytes_transferred;
        session.cancel();
        Ok(bytes_transferred)
    }

    /// Update session progress
    pub async fn update_progress(
        &self,
        transfer_id: &str,
        bytes_transferred: u64,
        speed: f64,
        eta: Option<Duration>,
    ) {
        let mut sessions = self.sessions.write().await;
        if let Some(session) = sessions.get_mut(transfer_id) {
            let eta_secs = eta.map(|d| d.as_secs()).unwrap_or(0);
            session.update_progress(bytes_transferred, speed, eta_secs);
        }
    }

    /// Complete a session successfully
    pub async fn complete_session(&self, transfer_id: &str, checksum: Option<String>) {
        let mut sessions = self.sessions.write().await;
        if let Some(session) = sessions.get_mut(transfer_id) {
            session.complete(checksum.unwrap_or_default());
        }
    }

    /// Fail a session
    pub async fn fail_session(&self, transfer_id: &str, error_message: String) {
        let mut sessions = self.sessions.write().await;
        if let Some(session) = sessions.get_mut(transfer_id) {
            session.fail(error_message);
        }
    }

    /// Get transfer progress
    pub async fn get_progress(&self, transfer_id: &str) -> Result<TransferProgress, TransferError> {
        let sessions = self.sessions.read().await;
        let session = sessions.get(transfer_id)
            .ok_or_else(|| TransferError::Unknown {
                message: format!("Transfer session not found: {}", transfer_id),
                context: Some(transfer_id.to_string()),
            })?;

        Ok(session.progress.clone())
    }

    /// Get all active transfers
    pub async fn get_active_transfers(&self) -> Vec<TransferSession> {
        let sessions = self.sessions.read().await;
        sessions.values()
            .filter(|session| session.is_active())
            .cloned()
            .collect()
    }

    /// Get transfer history
    pub async fn get_transfer_history(&self) -> Vec<TransferSession> {
        let sessions = self.sessions.read().await;
        sessions.values()
            .filter(|session| session.is_terminal())
            .cloned()
            .collect()
    }

    /// Remove completed transfers from memory
    pub async fn cleanup_completed_transfers(&self) -> usize {
        let mut sessions = self.sessions.write().await;
        let initial_count = sessions.len();
        
        // Keep only active transfers and recent completed ones (last 100)
        let mut completed: Vec<_> = sessions.values()
            .filter(|s| s.is_terminal())
            .cloned()
            .collect();
        
        completed.sort_by(|a, b| {
            b.end_time.unwrap_or(Instant::now())
                .cmp(&a.end_time.unwrap_or(Instant::now()))
        });

        // Keep only the 100 most recent completed transfers
        let to_remove: Vec<String> = completed.iter()
            .skip(100)
            .map(|s| s.id.clone())
            .collect();

        for id in &to_remove {
            sessions.remove(id);
        }

        initial_count - sessions.len()
    }

    /// Clean up old sessions (for background task)
    pub async fn cleanup_old_sessions(&self) -> usize {
        let mut sessions = self.sessions.write().await;
        let initial_count = sessions.len();
        
        // Remove sessions that have been completed for more than 1 hour
        let cutoff_time = Instant::now() - Duration::from_secs(3600);
        sessions.retain(|_, session| {
            if let Some(end_time) = session.end_time {
                end_time > cutoff_time || session.is_active()
            } else {
                true // Keep active or never-started sessions
            }
        });
        
        initial_count - sessions.len()
    }

    /// Load persisted sessions
    pub async fn load_sessions(&self, persisted_sessions: HashMap<String, TransferSession>) {
        let mut sessions = self.sessions.write().await;
        for (session_id, session) in persisted_sessions {
            // Only restore completed sessions for history
            if session.is_terminal() {
                sessions.insert(session_id, session);
            }
        }
    }

    /// Get sessions reference for internal use
    pub fn get_sessions_ref(&self) -> Arc<RwLock<HashMap<String, TransferSession>>> {
        Arc::clone(&self.sessions)
    }
}