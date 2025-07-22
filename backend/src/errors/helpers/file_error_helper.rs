// File operation error helpers
use crate::errors::TransferError;
use std::path::Path;
use tokio::fs;
use tracing::{warn, debug};

pub struct FileErrorHelper;

impl FileErrorHelper {
    /// Check if a file exists and is accessible
    pub async fn validate_file_access(path: &Path, operation: &str) -> Result<(), TransferError> {
        if !path.exists() {
            return Err(TransferError::FileNotFound {
                path: path.to_string_lossy().to_string(),
            });
        }

        // Check if we can read the file metadata
        match fs::metadata(path).await {
            Ok(metadata) => {
                if !metadata.is_file() {
                    return Err(TransferError::FileError {
                        message: format!("Path is not a file: {}", path.display()),
                        file_path: Some(path.to_string_lossy().to_string()),
                        recoverable: false,
                    });
                }
                
                // Check file permissions based on operation
                if operation == "read" && metadata.permissions().readonly() {
                    // On Unix systems, readonly doesn't mean we can't read
                    #[cfg(unix)]
                    {
                        use std::os::unix::fs::PermissionsExt;
                        let mode = metadata.permissions().mode();
                        if mode & 0o400 == 0 {
                            return Err(TransferError::PermissionDenied {
                                operation: operation.to_string(),
                                path: Some(path.to_string_lossy().to_string()),
                            });
                        }
                    }
                }
                
                Ok(())
            }
            Err(e) => {
                warn!("Failed to get file metadata for {}: {}", path.display(), e);
                Err(TransferError::FileError {
                    message: format!("Cannot access file metadata: {}", e),
                    file_path: Some(path.to_string_lossy().to_string()),
                    recoverable: false,
                })
            }
        }
    }

    /// Check available disk space
    pub async fn check_disk_space(path: &Path, required_bytes: u64) -> Result<(), TransferError> {
        // Try to get available space (this is platform-specific)
        match Self::get_available_space(path).await {
            Ok(available) => {
                if available < required_bytes {
                    Err(TransferError::InsufficientSpace {
                        needed: required_bytes,
                        available,
                        path: path.to_string_lossy().to_string(),
                    })
                } else {
                    Ok(())
                }
            }
            Err(e) => {
                debug!("Could not check disk space: {}", e);
                // Don't fail the operation if we can't check disk space
                Ok(())
            }
        }
    }

    /// Get available disk space (platform-specific implementation)
    async fn get_available_space(path: &Path) -> Result<u64, std::io::Error> {
        // This is a simplified implementation
        // In a real application, you'd use platform-specific APIs
        
        #[cfg(unix)]
        {
            use std::ffi::CString;
            use std::mem;
            use std::os::raw::{c_char, c_int};
            
            #[repr(C)]
            struct Statvfs {
                f_bsize: u64,
                f_frsize: u64,
                f_blocks: u64,
                f_bfree: u64,
                f_bavail: u64,
                f_files: u64,
                f_ffree: u64,
                f_favail: u64,
                f_fsid: u64,
                f_flag: u64,
                f_namemax: u64,
            }
            
            extern "C" {
                fn statvfs(path: *const c_char, buf: *mut Statvfs) -> c_int;
            }
            
            let path_cstr = CString::new(path.to_string_lossy().as_bytes())?;
            let mut stat: Statvfs = unsafe { mem::zeroed() };
            
            let result = unsafe { statvfs(path_cstr.as_ptr(), &mut stat) };
            
            if result == 0 {
                Ok(stat.f_bavail * stat.f_frsize)
            } else {
                Err(std::io::Error::last_os_error())
            }
        }
        
        #[cfg(windows)]
        {
            use std::ffi::OsStr;
            use std::os::windows::ffi::OsStrExt;
            use std::ptr;
            
            extern "system" {
                fn GetDiskFreeSpaceExW(
                    lpDirectoryName: *const u16,
                    lpFreeBytesAvailableToCaller: *mut u64,
                    lpTotalNumberOfBytes: *mut u64,
                    lpTotalNumberOfFreeBytes: *mut u64,
                ) -> i32;
            }
            
            let path_wide: Vec<u16> = OsStr::new(&path.to_string_lossy())
                .encode_wide()
                .chain(std::iter::once(0))
                .collect();
            
            let mut free_bytes = 0u64;
            let result = unsafe {
                GetDiskFreeSpaceExW(
                    path_wide.as_ptr(),
                    &mut free_bytes,
                    ptr::null_mut(),
                    ptr::null_mut(),
                )
            };
            
            if result != 0 {
                Ok(free_bytes)
            } else {
                Err(std::io::Error::last_os_error())
            }
        }
        
        #[cfg(not(any(unix, windows)))]
        {
            // Fallback for other platforms
            Err(std::io::Error::new(
                std::io::ErrorKind::Unsupported,
                "Disk space checking not supported on this platform",
            ))
        }
    }

    /// Create a file error with context
    pub fn create_file_error(
        message: impl Into<String>,
        path: Option<&Path>,
        recoverable: bool,
    ) -> TransferError {
        TransferError::FileError {
            message: message.into(),
            file_path: path.map(|p| p.to_string_lossy().to_string()),
            recoverable,
        }
    }

    /// Create a permission denied error
    pub fn create_permission_error(
        operation: impl Into<String>,
        path: Option<&Path>,
    ) -> TransferError {
        TransferError::PermissionDenied {
            operation: operation.into(),
            path: path.map(|p| p.to_string_lossy().to_string()),
        }
    }
}