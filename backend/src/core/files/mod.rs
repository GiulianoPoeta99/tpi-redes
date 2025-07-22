// Files module for file-related operations
pub mod file_chunker;
pub mod file_integrity_verifier;
pub mod file_metadata;
pub mod file_validator;

// Re-export main types
pub use file_chunker::FileChunker;
pub use file_integrity_verifier::FileIntegrityVerifier;
pub use file_metadata::FileMetadata;
pub use file_validator::FileValidator;