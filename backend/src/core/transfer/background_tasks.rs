// Background tasks for transfer orchestrator
use crate::core::transfer::session_manager::SessionManager;
use std::sync::Arc;
use std::time::Duration;
use tokio::time::interval;
use tracing::debug;

/// Manages background tasks for the transfer orchestrator
pub struct BackgroundTasks;

impl BackgroundTasks {
    /// Start the cleanup task that removes old completed sessions
    pub fn start_cleanup_task(session_manager: Arc<SessionManager>) -> tokio::task::JoinHandle<()> {
        tokio::spawn(async move {
            Self::cleanup_task(session_manager).await;
        })
    }

    async fn cleanup_task(session_manager: Arc<SessionManager>) {
        let mut interval = interval(Duration::from_secs(300)); // Cleanup every 5 minutes
        
        loop {
            interval.tick().await;
            
            let removed_count = session_manager.cleanup_old_sessions().await;
            if removed_count > 0 {
                debug!("Cleaned up {} old transfer sessions", removed_count);
            }
        }
    }
}