import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import Dashboard from '../Dashboard';

// Mock window.api
window.api = {
  startServer: vi.fn(),
  sendFile: vi.fn(),
  onLog: vi.fn(),
  onWindowUpdate: vi.fn(),
  onStatsUpdate: vi.fn(),
  startProxy: vi.fn(),
  scanNetwork: vi.fn(),
  onPacketCapture: vi.fn(),
  stopProcess: vi.fn().mockResolvedValue(true),
  getLocalIp: vi.fn().mockResolvedValue('127.0.0.1'),
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
