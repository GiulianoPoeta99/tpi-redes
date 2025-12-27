import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ReceiverView from '../ReceiverView';

// Mock window.api
window.api = {
  ...window.api,
  startServer: vi.fn().mockResolvedValue(true),
  stopProcess: vi.fn().mockResolvedValue(true),
  getInterfaces: vi.fn().mockResolvedValue([{ name: 'eth0', ip: '127.0.0.1' }]),
  onLog: vi.fn(),
  onWindowUpdate: vi.fn(),
  getLocalIp: vi.fn().mockResolvedValue('127.0.0.1'),
  getDownloadsDir: vi.fn().mockResolvedValue('/tmp'),
};

describe('ReceiverView', () => {
  const setBusy = vi.fn();
  const setHeaderContent = vi.fn();

  it('renders receiver configuration', async () => {
    render(
      <ReceiverView 
        setBusy={setBusy} 
        setHeaderContent={setHeaderContent} 
      />
    );

    // Check for Listener Config section
    expect(await screen.findByText('Listener Config')).toBeInTheDocument();
    
    // Check for Start/Stop button
    expect(screen.getByRole('button', { name: /START/i })).toBeInTheDocument();
  });
});
