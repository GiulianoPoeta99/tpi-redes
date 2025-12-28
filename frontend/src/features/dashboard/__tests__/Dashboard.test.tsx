import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import Dashboard from '../Dashboard';

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
  getInterfaces: vi.fn().mockResolvedValue(['eth0']),
  onSnifferError: vi.fn(),
};

vi.mock('../../shared/components/InterfaceSelector', () => ({
  default: () => <div data-testid="interface-selector">MockInterfaceSelector</div>,
}));

vi.mock('../../shared/components/IpDisplay', () => ({
  default: () => <div data-testid="ip-display">MockIpDisplay</div>,
}));

// Mock consumer views to isolate Dashboard testing and avoid child side-effects
vi.mock('../../receiver/ReceiverView', () => ({
  default: () => <div data-testid="receiver-view">Receiver View</div>,
}));

vi.mock('../../transmitter/TransmitterView', () => ({
  default: () => <div data-testid="transmitter-view">Transmitter View</div>,
}));

vi.mock('../../mitm/MitmView', () => ({
  default: () => <div data-testid="mitm-view">Mitm View</div>,
}));

describe('Dashboard', () => {
  it('renders the sidebar with navigation items', () => {
    render(<Dashboard />);
    expect(screen.getByText('TPI Redes')).toBeInTheDocument();
    expect(screen.getByText('Receiver')).toBeInTheDocument();
    expect(screen.getByText('Transmitter')).toBeInTheDocument();
    expect(screen.getByText('Mitm')).toBeInTheDocument();
    
    // Default view
    expect(screen.getByTestId('receiver-view')).toBeInTheDocument();
  });

  it('switches to Transmitter mode when button is clicked', async () => {
    render(<Dashboard />);
    const transmitterBtn = screen.getByText('Transmitter');
    fireEvent.click(transmitterBtn);

    expect(await screen.findByTestId('transmitter-view')).toBeInTheDocument();
  });

  it('switches to Mitm mode when button is clicked', async () => {
    render(<Dashboard />);
    const mitmBtn = screen.getByText('Mitm');
    fireEvent.click(mitmBtn);

    expect(await screen.findByTestId('mitm-view')).toBeInTheDocument();
  });
});
