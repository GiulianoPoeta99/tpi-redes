import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import StatsModal from '../StatsModal';

vi.mock('../StatsAnalyticChart', () => ({
  default: () => <div data-testid="mock-chart">Mock Chart</div>,
}));

describe('StatsModal', () => {
  const mockOnClose = vi.fn();
  const mockStats = {
    filename: 'test.file',
    totalBytes: 5000,
    timeTaken: 10,
    throughput: 500,
    protocol: 'TCP',
  };

  it('renders correctly', () => {
    render(
      <StatsModal
        isOpen={true}
        onClose={mockOnClose}
        stats={mockStats}
        history={[]}
      />,
    );

    expect(screen.getByText('Transfer Analytics')).toBeInTheDocument();
    expect(screen.getByTestId('mock-chart')).toBeInTheDocument();
    expect(screen.getByText('test.file')).toBeInTheDocument();
  });
});
