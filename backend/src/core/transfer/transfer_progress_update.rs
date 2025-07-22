// Internal transfer progress update structure
#[derive(Debug, Clone)]
pub struct TransferProgressUpdate {
    pub transfer_id: String,
    pub bytes_transferred: u64,
    pub total_bytes: u64,
    pub speed: f64,
    pub eta: u64,
}

impl TransferProgressUpdate {
    pub fn new(
        transfer_id: String,
        bytes_transferred: u64,
        total_bytes: u64,
        speed: f64,
        eta: u64,
    ) -> Self {
        Self {
            transfer_id,
            bytes_transferred,
            total_bytes,
            speed,
            eta,
        }
    }

    pub fn progress_percentage(&self) -> f64 {
        if self.total_bytes == 0 {
            0.0
        } else {
            (self.bytes_transferred as f64 / self.total_bytes as f64) * 100.0
        }
    }

    pub fn is_complete(&self) -> bool {
        self.bytes_transferred >= self.total_bytes && self.total_bytes > 0
    }
}