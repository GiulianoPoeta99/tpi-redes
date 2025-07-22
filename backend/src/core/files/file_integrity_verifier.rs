use crate::crypto::ChecksumCalculator;
use crate::errors::TransferError;
use std::path::Path;

/// File integrity verification utilities
pub struct FileIntegrityVerifier;

impl FileIntegrityVerifier {
    /// Verify file integrity by comparing source and destination checksums
    pub async fn verify_transfer_integrity(
        source_path: &Path,
        destination_path: &Path,
    ) -> Result<bool, TransferError> {
        let source_checksum = ChecksumCalculator::calculate_file_sha256_async(source_path).await?;
        let dest_checksum = ChecksumCalculator::calculate_file_sha256_async(destination_path).await?;
        
        Ok(ChecksumCalculator::verify_integrity(&source_checksum, &dest_checksum))
    }
    
    /// Verify file integrity against a known checksum
    pub async fn verify_against_checksum(
        file_path: &Path,
        expected_checksum: &str,
    ) -> Result<bool, TransferError> {
        let actual_checksum = ChecksumCalculator::calculate_file_sha256_async(file_path).await?;
        Ok(ChecksumCalculator::verify_integrity(expected_checksum, &actual_checksum))
    }
    
    /// Calculate and compare checksums for multiple chunks
    pub async fn verify_chunked_integrity(
        chunks: &[(u32, Vec<u8>)],
        expected_checksums: &[(u32, String)],
    ) -> Result<bool, TransferError> {
        if chunks.len() != expected_checksums.len() {
            return Ok(false);
        }
        
        for ((chunk_id, data), (expected_id, expected_checksum)) in chunks.iter().zip(expected_checksums.iter()) {
            if chunk_id != expected_id {
                return Ok(false);
            }
            
            let actual_checksum = ChecksumCalculator::calculate_data_sha256(data);
            if !ChecksumCalculator::verify_integrity(expected_checksum, &actual_checksum) {
                return Ok(false);
            }
        }
        
        Ok(true)
    }
}