import { render, screen } from '@testing-library/react';
import Dashboard from '../Dashboard';
import { describe, it, expect, vi } from 'vitest';

// Mock window.api
window.api = {
  startServer: vi.fn(),
  sendFile: vi.fn(),
  onLog: vi.fn(),
  onWindowUpdate: vi.fn(),
  onStatsUpdate: vi.fn(),
  startProxy: vi.fn(),
};

describe('Dashboard', () => {
  it('renders the sidebar with navigation items', () => {
    render(<Dashboard />);
    expect(screen.getByText('TPI Redes')).toBeInTheDocument();
    expect(screen.getByText('Transfer')).toBeInTheDocument();
    expect(screen.getByText('Packet Sniffer')).toBeInTheDocument();
    expect(screen.getByText('Statistics')).toBeInTheDocument();
  });
});
