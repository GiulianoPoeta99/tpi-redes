# Implementation Plan

- [x] 1. Set up simplified core transfer modules
  - Create `backend/src/core/simple_tcp_transfer.rs` with native TcpStream/TcpListener implementation
  - Create `backend/src/core/simple_udp_transfer.rs` with fire-and-forget UDP implementation
  - Create `backend/src/core/progress_tracker.rs` with real-time progress callbacks
  - Create `backend/src/core/checksum_validator.rs` with SHA-256 validation
  - _Requirements: 9.1, 9.2, 9.3, 9.5, 9.6_

- [x] 2. Implement TCP transfer functionality
  - [x] 2.1 Create TCP sender implementation using native TcpStream
    - Write `tcp_send_file()` function that connects, sends metadata JSON, transfers file with progress tracking
    - Use `TcpStream::write_all()` and `read_exact()` directly without protocol wrappers
    - Implement progress callbacks during file transfer
    - _Requirements: 9.1, 9.5, 6.1, 6.2, 6.3_
  
  - [x] 2.2 Create TCP receiver implementation using native TcpListener
    - Write `tcp_receive_file()` function that listens, accepts connections, receives metadata and file
    - Implement automatic checksum calculation and validation
    - Show connection establishment status as per requirement
    - _Requirements: 9.1, 5.4, 5.5, 5.6, 15.1_
  
  - [x] 2.3 Write unit tests for TCP transfer functionality
    - Test successful TCP file transfer scenarios
    - Test TCP connection failure handling
    - Test checksum validation in TCP transfers
    - _Requirements: 9.1, 15.3_

- [x] 3. Implement UDP fire-and-forget functionality
  - [x] 3.1 Create UDP sender with true fire-and-forget behavior
    - Write `udp_send_file()` function using native UdpSocket without acknowledgments
    - Send metadata packet, file chunks (1KB), and EOF marker
    - No waiting for confirmations - true fire-and-forget as per consigna
    - _Requirements: 9.3, 9.6, 4.5, 15.2_
  
  - [x] 3.2 Create UDP receiver with timeout handling
    - Write `udp_receive_file()` function that reconstructs file from received packets
    - Implement timeout mechanism for packet reception
    - Handle incomplete file reception gracefully (show what was received)
    - _Requirements: 9.3, 4.5, 5.8, 15.4_
  
  - [x] 3.3 Write unit tests for UDP fire-and-forget behavior
    - Test UDP packet sending without acknowledgments
    - Test UDP receiver timeout behavior
    - Test incomplete file reconstruction
    - _Requirements: 9.3, 15.4_

- [x] 4. Implement progress tracking and checksum validation
  - [x] 4.1 Create progress tracking system with real-time callbacks
    - Implement `TransferProgress` struct with bytes, speed, ETA, percentage
    - Create progress calculation logic with moving averages
    - Integrate progress callbacks into TCP and UDP transfers
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_
  
  - [x] 4.2 Implement automatic checksum calculation and validation
    - Create SHA-256 checksum calculation for files
    - Implement automatic checksum comparison in receivers
    - Display checksum validation results as per consigna requirements
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_
  
  - [x] 4.3 Write unit tests for progress tracking and checksum validation
    - Test progress calculation accuracy
    - Test SHA-256 checksum calculation
    - Test checksum validation logic
    - _Requirements: 5.1, 6.1_

- [x] 5. Remove complex protocol modules as per consigna requirements
  - [x] 5.1 Remove custom protocol implementation modules
    - Delete `backend/src/network/protocol_messages.rs`
    - Delete `backend/src/network/ack_status.rs` 
    - Delete handshake-related modules
    - Remove sequence number management modules
    - _Requirements: 10.1, 10.2, 10.3, 10.4_
  
  - [x] 5.2 Simplify existing network modules to use native sockets
    - Refactor `backend/src/network/tcp.rs` to use native TcpStream directly
    - Refactor `backend/src/network/udp.rs` to use native UdpSocket directly
    - Remove custom error detection and retransmission logic
    - _Requirements: 10.5, 10.6, 10.7, 10.8_
  
  - [x] 5.3 Update module imports and dependencies
    - Update `main.rs` and `lib.rs` to use simplified modules
    - Remove dependencies on deleted protocol modules
    - Update Cargo.toml if needed for removed dependencies
    - _Requirements: 10.1, 11.1_

- [x] 6. Enhance frontend interface to match consigna requirements
  - [x] 6.1 Create complete main interface with all required controls
    - Implement mode selector (Tx/Rx) with proper state management
    - Add protocol selector (TCP/UDP) with clear labeling
    - Create IP address and port input fields with validation
    - Add file selector that opens native OS dialog
    - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 3.1, 3.2, 4.1_
  
  - [x] 6.2 Implement mode-specific UI behavior as per consigna
    - Disable IP and file selection when in Receiver (Rx) mode
    - Enable all controls when in Transmitter (Tx) mode
    - Clear previous configurations when switching modes
    - Show appropriate labels and instructions for each mode
    - _Requirements: 1.2, 1.3, 1.4, 8.3, 8.4_
  
  - [x] 6.3 Add real-time progress tracking display
    - Create progress bar component with percentage, speed, ETA
    - Implement bytes transferred vs total display
    - Add transfer logs area for activity messages
    - Show protocol-specific status messages (connecting vs sending packets)
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 15.1, 15.2_
  
  - [x] 6.4 Implement input validation and error handling
    - Validate IP addresses in real-time
    - Validate port ranges (1024-65535)
    - Show clear error messages for invalid inputs
    - Prevent transfer start with invalid configuration
    - _Requirements: 2.4, 2.5, 3.4, 8.5, 8.6_

- [x] 7. Integrate simplified backend with enhanced frontend
  - [x] 7.1 Connect frontend controls to simplified transfer functions
    - Wire TCP/UDP selection to appropriate transfer modules
    - Connect file selection to transfer initiation
    - Integrate progress callbacks with UI progress display
    - Connect mode switching to backend configuration
    - _Requirements: 4.2, 4.3, 4.4, 8.1, 8.2_
  
  - [x] 7.2 Implement transfer result display as per consigna
    - Show "Transferencia exitosa" with checksum verification for successful transfers
    - Show "Error de integridad" with both checksums for failed validation
    - Display protocol-specific completion messages
    - Show transfer statistics (time, speed, bytes)
    - _Requirements: 5.6, 5.7, 6.5, 15.5, 15.6_
  
  - [x] 7.3 Add activity logging and user feedback
    - Implement logs display showing transfer events
    - Add protocol-specific status messages during transfer
    - Show clear error messages for network failures
    - Display warnings for UDP packet loss possibilities
    - _Requirements: 13.2, 13.4, 13.6, 15.3, 15.4_

- [x] 8. Test cross-machine functionality and protocol differences
  - [x] 8.1 Validate TCP transfers between different machines
    - Test TCP connection establishment across network
    - Verify reliable file transfer with checksum validation
    - Test TCP error handling when receiver is unavailable
    - Confirm TCP shows connection status messages
    - _Requirements: 7.1, 7.2, 7.3, 15.1, 15.3_
  
  - [x] 8.2 Validate UDP fire-and-forget behavior across network
    - Test UDP packet sending without connection establishment
    - Verify fire-and-forget behavior when receiver is unavailable
    - Test UDP timeout handling and incomplete file reconstruction
    - Confirm UDP shows appropriate status messages
    - _Requirements: 7.4, 7.5, 15.2, 15.4_
  
  - [x] 8.3 Write integration tests for cross-machine scenarios
    - Create tests that simulate network conditions
    - Test both protocols under various network scenarios
    - Validate protocol difference demonstrations
    - _Requirements: 7.6, 15.7_

- [x] 9. Update configuration and maintain existing functionality
  - [x] 9.1 Adapt configuration system for simplified implementation
    - Update configuration structures to support simplified protocols
    - Maintain existing validation and configuration management
    - Ensure CLI interface works with simplified backend
    - _Requirements: 11.2, 11.3, 11.6_
  
  - [x] 9.2 Update and adapt existing tests to new implementation
    - Modify existing unit tests to work with simplified modules
    - Update test scenarios to reflect native socket usage
    - Maintain Docker lab functionality for cross-machine testing
    - _Requirements: 11.4, 11.5_
  
  - [x] 9.3 Update documentation and code comments
    - Add clear code documentation explaining design decisions
    - Document differences between TCP and UDP implementations
    - Update README with simplified architecture explanation
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_

- [x] 10. Implement optional enhancements from consigna
  - [x] 10.1 Add support for multiple file transfers
    - Extend file selector to support multiple file selection
    - Implement sequential transfer of multiple files
    - Calculate individual checksums for each file
    - Show progress for multi-file transfers
    - _Requirements: 13.3, 13.8_
  
  - [x] 10.2 Enhance activity logging system
    - Create comprehensive activity logs visible to user
    - Log all transfer events, errors, and status changes
    - Implement log filtering and display options
    - Show timestamps and detailed event information
    - _Requirements: 13.1, 13.2, 13.4, 13.7_
  
  - [x] 10.3 Add advanced progress tracking features
    - Implement detailed transfer statistics
    - Add transfer history tracking
    - Create performance metrics display
    - _Requirements: 13.1, 13.5_