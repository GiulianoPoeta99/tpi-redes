import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import Dashboard from '../Dashboard';

// Mock window.api
window.api = {
  startServer: vi.fn(),
  sendFiles: vi.fn(),
  onLog: vi.fn(),
  onWindowUpdate: vi.fn(),
  onStatsUpdate: vi.fn(),
  startProxy: vi.fn(),
  scanNetwork: vi.fn(),
  onPacketCapture: vi.fn(),
  stopProcess: vi.fn().mockResolvedValue(true),
  getLocalIp: vi.fn().mockResolvedValue('127.0.0.1'),
  getFilePath: vi.fn(),
  getDownloadsDir: vi.fn().mockResolvedValue('/tmp/downloads'),
  listFiles: vi.fn().mockResolvedValue([]),
  openPath: vi.fn(),
  openFolder: vi.fn(),
  verifyFile: vi.fn().mockResolvedValue({ valid: true }),
  getInterfaces: vi.fn().mockResolvedValue([{ name: 'eth0', ip: '192.168.1.5' }]),
  onSnifferError: vi.fn(),
};

describe('Dashboard', () => {
  it('renders the sidebar with navigation items', () => {
    render(<Dashboard />);
    expect(screen.getByText('TPI Redes')).toBeInTheDocument();
    expect(screen.getByText('Receiver')).toBeInTheDocument();
    expect(screen.getByText('Transmitter')).toBeInTheDocument();
    expect(screen.getByText('Mitm')).toBeInTheDocument();
  });

  it('switches to Transmitter mode when button is clicked', async () => {
    render(<Dashboard />);
    const transmitterBtn = screen.getByText('Transmitter');
    fireEvent.click(transmitterBtn);

    expect(await screen.findByText('Destination IP')).toBeInTheDocument();
  });

  it('switches to Mitm mode when button is clicked', async () => {
    render(<Dashboard />);
    const mitmBtn = screen.getByText('Mitm');
    fireEvent.click(mitmBtn);

    // Wait for text specific to MitmView
    expect(await screen.findByText('Proxy Listener')).toBeInTheDocument();
  });
});
