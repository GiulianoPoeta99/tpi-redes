# Requirements Document

## Introduction

This document outlines the requirements for a socket-based file transfer application that enables secure and reliable file transfers between two network nodes. The application will feature a Rust CLI backend for core transfer functionality and a modern desktop frontend built with SvelteKit and Tauri. The system must support both TCP and UDP protocols with integrity verification and provide an intuitive user interface for configuration and monitoring.

## Requirements

### Requirement 1

**User Story:** As a user, I want to select between transmitter and receiver modes, so that I can either send files to another machine or receive files from another machine.

#### Acceptance Criteria

1. WHEN the application starts THEN the system SHALL display a mode selection interface with transmitter and receiver options
2. WHEN I select transmitter mode THEN the system SHALL enable file selection and target configuration options
3. WHEN I select receiver mode THEN the system SHALL enable port configuration and listening options
4. IF I switch between modes THEN the system SHALL clear previous configurations and reset the interface state

### Requirement 2

**User Story:** As a user, I want to configure network connection parameters (IP address, port, protocol), so that I can establish communication with the target machine.

#### Acceptance Criteria

1. WHEN in transmitter mode THEN the system SHALL provide input fields for target IP address and port number
2. WHEN in receiver mode THEN the system SHALL provide input fields for listening port number
3. WHEN configuring connection THEN the system SHALL allow selection between TCP and UDP protocols
4. IF invalid IP address is entered THEN the system SHALL display validation error and prevent connection
5. IF invalid port number is entered THEN the system SHALL display validation error and prevent connection
6. WHEN valid configuration is provided THEN the system SHALL enable the transfer initiation controls

### Requirement 3

**User Story:** As a user, I want to select files for transfer using drag-and-drop or file browser, so that I can easily choose which files to send.

#### Acceptance Criteria

1. WHEN in transmitter mode THEN the system SHALL display a file selection area with drag-and-drop functionality
2. WHEN I drag files over the selection area THEN the system SHALL provide visual feedback indicating drop readiness
3. WHEN I drop files on the selection area THEN the system SHALL add the files to the transfer queue
4. WHEN I click the file selection area THEN the system SHALL open a native file browser dialog
5. WHEN files are selected THEN the system SHALL display file information including name, size, and type
6. IF selected file exceeds size limits THEN the system SHALL display a warning message

### Requirement 4

**User Story:** As a user, I want to monitor transfer progress in real-time, so that I can track the status and performance of file transfers.

#### Acceptance Criteria

1. WHEN a transfer is initiated THEN the system SHALL display a progress bar showing completion percentage
2. WHEN transfer is active THEN the system SHALL display current transfer speed in MB/s
3. WHEN transfer is active THEN the system SHALL display estimated time remaining (ETA)
4. WHEN transfer is active THEN the system SHALL display bytes transferred and total file size
5. WHEN transfer completes successfully THEN the system SHALL display success notification with transfer summary
6. IF transfer fails THEN the system SHALL display error message with failure reason

### Requirement 5

**User Story:** As a user, I want file integrity verification using checksums, so that I can ensure transferred files are not corrupted.

#### Acceptance Criteria

1. WHEN a file transfer begins THEN the system SHALL calculate SHA-256 checksum of the source file
2. WHEN file transfer completes THEN the system SHALL calculate SHA-256 checksum of the received file
3. WHEN both checksums are available THEN the system SHALL compare them for integrity verification
4. IF checksums match THEN the system SHALL mark the transfer as successful
5. IF checksums do not match THEN the system SHALL mark the transfer as failed and display corruption error
6. WHEN transfer completes THEN the system SHALL display the calculated checksum in the transfer summary

### Requirement 6

**User Story:** As a user, I want to use both TCP and UDP protocols for file transfer, so that I can choose the appropriate protocol based on network conditions and requirements.

#### Acceptance Criteria

1. WHEN selecting TCP protocol THEN the system SHALL establish connection using TCP handshake (SYN, SYN-ACK, ACK) before data transfer
2. WHEN using TCP THEN the system SHALL send file metadata and wait for acknowledgment before sending data chunks
3. WHEN using TCP THEN the system SHALL send data chunks sequentially and wait for acknowledgment of each chunk
4. WHEN using TCP THEN the system SHALL send final checksum and wait for acknowledgment before closing connection
5. WHEN using TCP THEN the system SHALL properly close connection using TCP FIN handshake
6. WHEN selecting UDP protocol THEN the system SHALL send data chunks directly without connection establishment
7. WHEN using UDP THEN the system SHALL NOT implement acknowledgments or reliability mechanisms
8. WHEN using UDP THEN the system SHALL send chunks continuously without waiting for confirmations
9. WHEN using UDP THEN the system SHALL send multiple FIN markers (empty packets) to signal transfer completion
10. WHEN using UDP THEN the receiver SHALL use timeout mechanism to detect transfer completion
11. WHEN transfer completes THEN the system SHALL report protocol-specific statistics (connection time for TCP, packets sent for UDP)

### Requirement 7

**User Story:** As a user, I want to view transfer history and logs, so that I can track past transfers and troubleshoot issues.

#### Acceptance Criteria

1. WHEN transfers complete THEN the system SHALL save transfer records to persistent history
2. WHEN I access transfer history THEN the system SHALL display list of past transfers with timestamps, file names, and status
3. WHEN viewing transfer history THEN the system SHALL show transfer details including protocol used, target address, and duration
4. WHEN developer mode is enabled THEN the system SHALL display detailed logs with network-level information
5. IF transfer fails THEN the system SHALL log detailed error information for troubleshooting
6. WHEN I clear history THEN the system SHALL remove all transfer records after user confirmation

### Requirement 8

**User Story:** As a user, I want the application to work as both a standalone CLI tool and a desktop GUI application, so that I can use it in different environments and automation scenarios.

#### Acceptance Criteria

1. WHEN running the backend as CLI THEN the system SHALL accept command-line arguments for all transfer parameters
2. WHEN using CLI mode THEN the system SHALL provide text-based progress updates and status information
3. WHEN running the desktop application THEN the system SHALL provide full GUI functionality through Tauri integration
4. WHEN using desktop mode THEN the system SHALL communicate with the Rust backend through Tauri commands
5. IF CLI transfer fails THEN the system SHALL exit with appropriate error code and message
6. WHEN desktop application starts THEN the system SHALL initialize the backend library and establish IPC communication

### Requirement 9

**User Story:** As a user, I want persistent configuration settings, so that I don't have to reconfigure the application every time I use it.

#### Acceptance Criteria

1. WHEN I configure network settings THEN the system SHALL save the configuration to persistent storage
2. WHEN the application starts THEN the system SHALL load and apply previously saved configuration
3. WHEN I change application preferences THEN the system SHALL save the changes automatically
4. WHEN I reset configuration THEN the system SHALL restore default settings after user confirmation
5. IF configuration file is corrupted THEN the system SHALL use default settings and notify the user
6. WHEN exporting configuration THEN the system SHALL create a portable configuration file

### Requirement 10

**User Story:** As a user, I want a clear communication flow between sender and receiver, so that transfers can be initiated properly and failures are handled correctly.

#### Acceptance Criteria

1. WHEN starting receiver mode THEN the system SHALL bind to the specified port and listen for incoming connections
2. WHEN receiver fails to bind to port THEN the system SHALL display error message and prevent transfer initiation
3. WHEN starting sender mode THEN the system SHALL attempt to connect to the specified receiver address and port
4. WHEN sender cannot connect to receiver THEN the system SHALL display connection error and stop transfer attempt
5. WHEN using TCP THEN the sender SHALL wait for receiver to be listening before attempting connection
6. WHEN using UDP THEN the sender SHALL send packets regardless of receiver status (fire-and-forget behavior)
7. IF receiver is not listening during UDP transfer THEN the packets SHALL be lost without notification to sender
8. WHEN receiver stops listening during transfer THEN TCP SHALL detect disconnection and report error
9. WHEN receiver stops listening during UDP transfer THEN sender SHALL complete normally without knowing receiver status

### Requirement 11

**User Story:** As a user, I want system notifications for transfer completion, so that I can be alerted when transfers finish while working on other tasks.

#### Acceptance Criteria

1. WHEN a transfer completes successfully THEN the system SHALL display a system notification with success message
2. WHEN a transfer fails THEN the system SHALL display a system notification with error summary
3. WHEN notifications are disabled in settings THEN the system SHALL not display system notifications
4. WHEN transfer completes THEN the system SHALL play notification sound if enabled in settings
5. IF system notifications are not supported THEN the system SHALL display in-app notifications instead
6. WHEN clicking notification THEN the system SHALL bring the application to foreground and show transfer details

### Requirement 12

**User Story:** As a developer, I want the TCP and UDP implementations to follow theoretical protocol behaviors, so that the system demonstrates proper understanding of network protocols.

#### Acceptance Criteria

1. WHEN implementing TCP THEN the system SHALL follow the exact flow: SYN → SYN-ACK → ACK → metadata → metadata-ACK → chunk → chunk-ACK (repeat) → checksum → checksum-ACK → FIN → FIN-ACK
2. WHEN implementing UDP THEN the system SHALL follow the exact flow: chunk → chunk → chunk (continuous) → FIN-marker → FIN-marker → FIN-marker → timeout
3. WHEN using TCP THEN each data chunk SHALL be 8KB in size and require acknowledgment before sending next chunk
4. WHEN using UDP THEN each data chunk SHALL be 1KB in size and be sent without waiting for acknowledgment
5. WHEN using UDP THEN the receiver SHALL use a 30-second timeout to detect transfer completion after receiving FIN markers
6. WHEN TCP connection is established THEN the system SHALL exchange file metadata (name, size, checksum) before data transfer
7. WHEN using UDP THEN the system SHALL NOT exchange metadata or perform handshakes
8. WHEN TCP transfer completes THEN the system SHALL verify checksum and send final acknowledgment
9. WHEN UDP transfer completes THEN the system SHALL NOT perform checksum verification or acknowledgments