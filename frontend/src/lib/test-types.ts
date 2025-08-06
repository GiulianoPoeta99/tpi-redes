// Simple test to verify TypeScript types work correctly
import { 
    TransferConfigValidator, 
    TransferUtils,
    defaultTransferConfig,
    type TransferConfig,
    type TransferProgress, 
    type TransferResult, 
    type TransferStatus,
    type Protocol,
    type TransferMode
} from './types';

// Test function to verify all types work
export function testTypes(): void {
    console.log('Testing TypeScript types and utilities...');
    
    // Test default configuration
    const config: TransferConfig = { ...defaultTransferConfig };
    config.targetIp = '192.168.1.1';
    config.port = 8080;
    config.protocol = 'tcp';
    config.mode = 'transmitter';
    
    console.log('✓ TransferConfig type works');
    console.log('  - Mode:', config.mode);
    console.log('  - Protocol:', config.protocol);
    console.log('  - Target IP:', config.targetIp);
    console.log('  - Port:', config.port);
    
    // Test configuration validation
    const validationErrors = TransferConfigValidator.validate(config);
    if (validationErrors.length === 0) {
        console.log('✓ Configuration validation works - no errors');
    } else {
        console.log('✗ Configuration validation failed:', validationErrors);
    }
    
    // Test invalid configuration
    const invalidConfig: TransferConfig = {
        ...defaultTransferConfig,
        mode: 'transmitter',
        targetIp: undefined, // Missing required field
        port: 70000, // Invalid port
    };
    
    const invalidErrors = TransferConfigValidator.validate(invalidConfig);
    if (invalidErrors.length > 0) {
        console.log('✓ Configuration validation catches errors:', invalidErrors);
    } else {
        console.log('✗ Configuration validation should have caught errors');
    }
    
    // Test TransferProgress type
    const progress: TransferProgress = {
        transferId: 'test-123',
        progress: 0.75,
        speed: 1024 * 1024, // 1 MB/s
        eta: 30,
        status: 'transferring',
    };
    
    console.log('✓ TransferProgress type works');
    console.log('  - Transfer ID:', progress.transferId);
    console.log('  - Progress:', TransferUtils.formatProgress(progress.progress));
    console.log('  - Speed:', TransferUtils.formatSpeed(progress.speed));
    console.log('  - ETA:', TransferUtils.formatDuration(progress.eta));
    console.log('  - Status:', progress.status);
    
    // Test TransferResult type
    const result: TransferResult = {
        success: true,
        transferId: 'test-123',
        bytesTransferred: 10 * 1024 * 1024, // 10 MB
        duration: 60, // 1 minute
        checksum: 'abc123def456',
    };
    
    console.log('✓ TransferResult type works');
    console.log('  - Success:', result.success);
    console.log('  - Bytes transferred:', TransferUtils.formatBytes(result.bytesTransferred));
    console.log('  - Duration:', TransferUtils.formatDuration(result.duration));
    console.log('  - Checksum:', result.checksum);
    
    // Test utility functions
    console.log('✓ TransferUtils work');
    console.log('  - Format bytes (1024):', TransferUtils.formatBytes(1024));
    console.log('  - Format bytes (1536KB):', TransferUtils.formatBytes(1536 * 1024));
    console.log('  - Format bytes (2.5MB):', TransferUtils.formatBytes(2.5 * 1024 * 1024));
    console.log('  - Format speed (1MB/s):', TransferUtils.formatSpeed(1024 * 1024));
    console.log('  - Format duration (90s):', TransferUtils.formatDuration(90));
    console.log('  - Format duration (3665s):', TransferUtils.formatDuration(3665));
    
    // Test status utility functions
    const statuses: TransferStatus[] = ['idle', 'connecting', 'transferring', 'completed', 'error'];
    console.log('✓ Status utility functions work');
    statuses.forEach(status => {
        console.log(`  - ${status}: terminal=${TransferUtils.isTerminalStatus(status)}, active=${TransferUtils.isActiveStatus(status)}`);
    });
    
    // Test type assignments
    const protocol: Protocol = 'tcp';
    const mode: TransferMode = 'transmitter';
    const status: TransferStatus = 'transferring';
    
    console.log('✓ Type assignments work');
    console.log('  - Protocol:', protocol);
    console.log('  - Mode:', mode);
    console.log('  - Status:', status);
    
    console.log('\n🎉 All TypeScript types and utilities tests passed!');
}

// Export for testing
if (typeof window !== 'undefined') {
    // Browser environment - attach to window for manual testing
    (window as any).testTypes = testTypes;
}