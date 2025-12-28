import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ReceiverView from '../ReceiverView';

window.api = {
  ...window.api,
  startServer: vi.fn().mockResolvedValue(true),
  stopProcess: vi.fn().mockResolvedValue(true),
  getInterfaces: vi.fn().mockResolvedValue(['eth0']),
  onLog: vi.fn(),
  onWindowUpdate: vi.fn(),
  getLocalIp: vi.fn().mockResolvedValue('127.0.0.1'),
  getDownloadsDir: vi.fn().mockResolvedValue('/tmp'),
};

vi.mock('../../shared/components/InterfaceSelector', () => ({
  default: () => <div data-testid="interface-selector">MockInterfaceSelector</div>,
}));

vi.mock('../../shared/components/IpDisplay', () => ({
  default: () => <div data-testid="ip-display">MockIpDisplay</div>,
}));

describe('ReceiverView', () => {
  const setBusy = vi.fn();
  const setHeaderContent = vi.fn();

  it('renders receiver configuration', async () => {
    render(<ReceiverView setBusy={setBusy} setHeaderContent={setHeaderContent} />);

    expect(await screen.findByText('Listener Config')).toBeInTheDocument();

    expect(screen.getByRole('button', { name: /START/i })).toBeInTheDocument();
  });
});
