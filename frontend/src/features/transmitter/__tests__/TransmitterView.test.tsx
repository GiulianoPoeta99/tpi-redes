import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import TransmitterView from '../TransmitterView';

window.api = {
  ...window.api,
  sendFiles: vi.fn().mockResolvedValue(true),
  getInterfaces: vi.fn().mockResolvedValue(['eth0']),
  onLog: vi.fn(),
  onStatsUpdate: vi.fn(),
  scanNetwork: vi.fn().mockResolvedValue([]),
};

vi.mock('../../shared/components/InterfaceSelector', () => ({
  default: () => <div data-testid="interface-selector">MockInterfaceSelector</div>,
}));

describe('TransmitterView', () => {
  const setBusy = vi.fn();
  const addToast = vi.fn();
  const setHeaderContent = vi.fn();

  it('renders form elements correctly', async () => {
    render(
      <TransmitterView setBusy={setBusy} addToast={addToast} setHeaderContent={setHeaderContent} />,
    );

    expect(await screen.findByText('Destination IP')).toBeInTheDocument();
  });

  it('validates input before sending', async () => {
    render(
      <TransmitterView setBusy={setBusy} addToast={addToast} setHeaderContent={setHeaderContent} />,
    );

    const sendBtn = screen.getByRole('button', { name: /Send/i });
    expect(sendBtn).toBeDisabled();
  });
});
