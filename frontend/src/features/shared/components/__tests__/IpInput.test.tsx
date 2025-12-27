import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import IpInput from '../IpInput';

describe('IpInput', () => {
  it('renders correctly with initial value', () => {
    render(<IpInput value="192.168.1.1" onChange={vi.fn()} />);
    
    const inputs = screen.getAllByRole('textbox');
    expect(inputs).toHaveLength(4);
    expect(inputs[0]).toHaveValue('192');
    expect(inputs[1]).toHaveValue('168');
    expect(inputs[2]).toHaveValue('1');
    expect(inputs[3]).toHaveValue('1');
  });

  it('calls onChange when octet is modified', () => {
    const handleChange = vi.fn();
    render(<IpInput value="0.0.0.0" onChange={handleChange} />);
    
    const inputs = screen.getAllByRole('textbox');
    fireEvent.change(inputs[0], { target: { value: '10' } });

    expect(handleChange).toHaveBeenCalledWith('10.0.0.0');
  });

  it('prevents non-numeric input', () => {
    const handleChange = vi.fn();
    render(<IpInput value="0.0.0.0" onChange={handleChange} />);
    
    const inputs = screen.getAllByRole('textbox');
    fireEvent.change(inputs[0], { target: { value: 'a' } });

    expect(handleChange).not.toHaveBeenCalled();
    expect(inputs[0]).toHaveValue('0');
  });

  it('caps values > 255 to 255', () => {
    const handleChange = vi.fn();
    render(<IpInput value="0.0.0.0" onChange={handleChange} />);
    
    const inputs = screen.getAllByRole('textbox');
    fireEvent.change(inputs[0], { target: { value: '300' } });

    expect(handleChange).toHaveBeenCalledWith('255.0.0.0');
  });

  it('handles paste of full IP address', () => {
    const handleChange = vi.fn();
    render(<IpInput value="0.0.0.0" onChange={handleChange} />);
    
    const inputs = screen.getAllByRole('textbox');
    
    const pasteEvent = {
        clipboardData: {
            getData: () => '192.168.100.50'
        },
        preventDefault: vi.fn()
    } as unknown as ClipboardEvent;

    fireEvent.paste(inputs[0], pasteEvent);

    expect(handleChange).toHaveBeenCalledWith('192.168.100.50');
  });
});
