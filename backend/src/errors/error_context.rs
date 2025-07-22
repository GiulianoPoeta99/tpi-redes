// Error context builder for adding contextual information to errors
use crate::errors::TransferError;
use std::path::Path;

pub struct ErrorContext {
    operation: Option<String>,
    file_path: Option<String>,
    transfer_id: Option<String>,
    address: Option<String>,
    protocol: Option<String>,
}

impl ErrorContext {
    pub fn new() -> Self {
        Self {
            operation: None,
            file_path: None,
            transfer_id: None,
            address: None,
            protocol: None,
        }
    }

    pub fn with_operation(mut self, operation: impl Into<String>) -> Self {
        self.operation = Some(operation.into());
        self
    }

    pub fn with_file_path(mut self, path: impl AsRef<Path>) -> Self {
        self.file_path = Some(path.as_ref().to_string_lossy().to_string());
        self
    }

    pub fn with_transfer_id(mut self, transfer_id: impl Into<String>) -> Self {
        self.transfer_id = Some(transfer_id.into());
        self
    }

    pub fn with_address(mut self, address: impl Into<String>) -> Self {
        self.address = Some(address.into());
        self
    }

    pub fn with_protocol(mut self, protocol: impl Into<String>) -> Self {
        self.protocol = Some(protocol.into());
        self
    }

    pub fn apply_to_error(self, mut error: TransferError) -> TransferError {
        // Add context based on error type
        match &mut error {
            TransferError::NetworkError { context, .. } => {
                if context.is_none() && self.operation.is_some() {
                    *context = self.operation;
                }
            }
            TransferError::FileError { file_path, .. } => {
                if file_path.is_none() && self.file_path.is_some() {
                    *file_path = self.file_path;
                }
            }
            TransferError::ProtocolError { protocol, .. } => {
                if protocol.is_empty() && self.protocol.is_some() {
                    *protocol = self.protocol.unwrap();
                }
            }
            TransferError::ConnectionRefused { address, .. } => {
                if address == "unknown" && self.address.is_some() {
                    *address = self.address.unwrap();
                }
            }
            TransferError::Timeout { operation, .. } => {
                if operation.is_empty() && self.operation.is_some() {
                    *operation = self.operation.unwrap();
                }
            }
            TransferError::Cancelled { transfer_id } => {
                if transfer_id.is_empty() && self.transfer_id.is_some() {
                    *transfer_id = self.transfer_id.unwrap();
                }
            }
            _ => {}
        }
        error
    }
}

impl Default for ErrorContext {
    fn default() -> Self {
        Self::new()
    }
}