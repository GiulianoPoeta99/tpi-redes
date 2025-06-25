// Cryptography and checksum module
use crate::utils::errors::TransferError;
use sha2::{Digest, Sha256};
use std::io::Read;
use std::path::Path;

pub struct ChecksumCalculator;

impl ChecksumCalculator {
    pub fn calculate_file_sha256(path: &Path) -> Result<String, TransferError> {
        // Implementation will be added in task 4
        todo!("Implementation in task 4")
    }
    
    pub fn calculate_stream_sha256(mut reader: impl Read) -> Result<String, TransferError> {
        // Implementation will be added in task 4
        todo!("Implementation in task 4")
    }
    
    pub fn verify_integrity(expected: &str, actual: &str) -> bool {
        expected == actual
    }
    
    pub fn calculate_data_sha256(data: &[u8]) -> String {
        let mut hasher = Sha256::new();
        hasher.update(data);
        format!("{:x}", hasher.finalize())
    }
}