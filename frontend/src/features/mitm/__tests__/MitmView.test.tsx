import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import MitmView from '../MitmView';

// Mock window.api
window.api = {
  ...window.api,
  startProxy: vi.fn(),
  stopProcess: vi.fn().mockResolvedValue(true),
  getInterfaces: vi.fn().mockResolvedValue([{ name: 'eth0', ip: '127.0.0.1' }]),
  onLog: vi.fn(),
  scanNetwork: vi.fn().mockResolvedValue([]),
};

describe('MitmView', () => {
  const setBusy = vi.fn();
  const setHeaderContent = vi.fn();

  it('renders mitm configuration', async () => {
    render(
      <MitmView 
        setBusy={setBusy} 
        setHeaderContent={setHeaderContent} 
      />
    );

    // Check for Proxy Listener config
    expect(await screen.findByText('Proxy Listener')).toBeInTheDocument();
  });
});
