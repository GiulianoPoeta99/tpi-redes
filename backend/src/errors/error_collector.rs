// Error aggregation for collecting multiple validation errors
use crate::errors::TransferError;

pub struct ErrorCollector {
    errors: Vec<TransferError>,
}

impl ErrorCollector {
    pub fn new() -> Self {
        Self {
            errors: Vec::new(),
        }
    }

    pub fn add_error(&mut self, error: TransferError) {
        self.errors.push(error);
    }

    pub fn add_result<T>(&mut self, result: Result<T, TransferError>) -> Option<T> {
        match result {
            Ok(value) => Some(value),
            Err(error) => {
                self.add_error(error);
                None
            }
        }
    }

    pub fn has_errors(&self) -> bool {
        !self.errors.is_empty()
    }

    pub fn into_result<T>(self, success_value: T) -> Result<T, TransferError> {
        if self.errors.is_empty() {
            Ok(success_value)
        } else if self.errors.len() == 1 {
            Err(self.errors.into_iter().next().unwrap())
        } else {
            // Combine multiple errors into a single error
            let messages: Vec<String> = self.errors.iter().map(|e| e.to_string()).collect();
            Err(TransferError::ConfigError {
                message: format!("Multiple validation errors: {}", messages.join("; ")),
                field: None,
            })
        }
    }

    pub fn errors(&self) -> &[TransferError] {
        &self.errors
    }

    pub fn clear(&mut self) {
        self.errors.clear();
    }

    pub fn len(&self) -> usize {
        self.errors.len()
    }

    pub fn is_empty(&self) -> bool {
        self.errors.is_empty()
    }
}

impl Default for ErrorCollector {
    fn default() -> Self {
        Self::new()
    }
}

impl From<Vec<TransferError>> for ErrorCollector {
    fn from(errors: Vec<TransferError>) -> Self {
        Self { errors }
    }
}

impl IntoIterator for ErrorCollector {
    type Item = TransferError;
    type IntoIter = std::vec::IntoIter<TransferError>;

    fn into_iter(self) -> Self::IntoIter {
        self.errors.into_iter()
    }
}