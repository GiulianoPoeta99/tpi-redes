import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import PortInput from '../PortInput';

describe('PortInput', () => {
  it('renders correctly with initial port', () => {
    render(<PortInput value={8080} onChange={vi.fn()} />);
    const input = screen.getByRole('spinbutton');
    expect(input).toHaveValue(8080);
  });

  it('calls onChange with valid number', () => {
    const onChange = vi.fn();
    render(<PortInput value={0} onChange={onChange} />);

    const input = screen.getByRole('spinbutton');
    fireEvent.change(input, { target: { value: '3000' } });

    expect(onChange).toHaveBeenCalledWith(3000);
  });

  it('shows system port warning for ports < 1024', () => {
    render(<PortInput value={80} onChange={vi.fn()} />);
    expect(screen.getByText('SYSTEM')).toBeInTheDocument();
  });

  it('does not show warning for safe user ports', () => {
    render(<PortInput value={8080} onChange={vi.fn()} />);
    expect(screen.queryByText('SYSTEM')).not.toBeInTheDocument();
  });
});
