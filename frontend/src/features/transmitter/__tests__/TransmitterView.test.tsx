import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import TransmitterView from '../TransmitterView';

// Mock window.api
window.api = {
  ...window.api,
  sendFiles: vi.fn().mockResolvedValue(true),
  getInterfaces: vi.fn().mockResolvedValue([{ name: 'eth0', ip: '127.0.0.1' }]),
  onLog: vi.fn(),
  onStatsUpdate: vi.fn(),
  scanNetwork: vi.fn().mockResolvedValue([]),
};

describe('TransmitterView', () => {
  const setBusy = vi.fn();
  const addToast = vi.fn();
  const setHeaderContent = vi.fn();

  it('renders form elements correctly', () => {
    render(
      <TransmitterView setBusy={setBusy} addToast={addToast} setHeaderContent={setHeaderContent} />
    );

    expect(screen.getByText('Destination IP')).toBeInTheDocument();
  });

  it('validates input before sending', async () => {
    render(
      <TransmitterView setBusy={setBusy} addToast={addToast} setHeaderContent={setHeaderContent} />
    );

    const sendBtn = screen.getByRole('button', { name: /Send/i });
    expect(sendBtn).toBeDisabled();
  });
});
