import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import StatsModal from '../StatsModal'; // Default import

// Mock Recharts-heavy components
vi.mock('../StatsAnalyticChart', () => ({
    default: () => <div data-testid="mock-chart">Mock Chart</div>
}));

describe('StatsModal', () => {
    const mockOnClose = vi.fn();
    const mockStats = {
        filename: 'test.file',
        totalBytes: 5000,
        timeTaken: 10,
        throughput: 500,
        protocol: 'TCP'
    };

    it('renders correctly', () => {
        render(
            <StatsModal
                isOpen={true}
                onClose={mockOnClose}
                stats={mockStats}
                history={[]}
            />
        );

        // Check title
        expect(screen.getByText('Transfer Analytics')).toBeInTheDocument();
        // Check Chart
        expect(screen.getByTestId('mock-chart')).toBeInTheDocument();
        // Check Filename (Latest Transfer)
        expect(screen.getByText('test.file')).toBeInTheDocument();
    });
});
