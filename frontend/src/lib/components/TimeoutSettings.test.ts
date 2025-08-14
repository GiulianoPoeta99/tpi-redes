import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/svelte';
import TimeoutSettings from './TimeoutSettings.svelte';

describe('TimeoutSettings', () => {
  const defaultProps = {
    connectionTimeout: 10,
    readTimeout: 30,
    writeTimeout: 30,
    retryAttempts: 3,
    retryDelay: 1,
    autoRetryEnabled: true,
  };

  it('should render all timeout settings', () => {
    render(TimeoutSettings, { props: defaultProps });

    expect(screen.getByText('Timeout & Retry Settings')).toBeInTheDocument();
    expect(screen.getByText('Connection Timeout')).toBeInTheDocument();
    expect(screen.getByText('Read Timeout')).toBeInTheDocument();
    expect(screen.getByText('Write Timeout')).toBeInTheDocument();
    expect(screen.getByText('Retry Attempts')).toBeInTheDocument();
    expect(screen.getByText('Initial Retry Delay')).toBeInTheDocument();
    expect(screen.getByText('Enable Automatic Retries')).toBeInTheDocument();
  });

  it('should display current values', () => {
    render(TimeoutSettings, { props: defaultProps });

    expect(screen.getByText('10s')).toBeInTheDocument(); // Connection timeout
    expect(screen.getByText('30s')).toBeInTheDocument(); // Read/Write timeout
    expect(screen.getByText('3')).toBeInTheDocument(); // Retry attempts
    expect(screen.getByText('1s')).toBeInTheDocument(); // Retry delay
  });

  it('should show setting descriptions', () => {
    render(TimeoutSettings, { props: defaultProps });

    expect(screen.getByText(/Time to wait for initial connection/)).toBeInTheDocument();
    expect(screen.getByText(/Time to wait for data reception/)).toBeInTheDocument();
    expect(screen.getByText(/Time to wait for data transmission/)).toBeInTheDocument();
    expect(screen.getByText(/Number of automatic retry attempts/)).toBeInTheDocument();
    expect(screen.getByText(/Initial delay between retry attempts/)).toBeInTheDocument();
  });

  it('should update values when sliders are moved', async () => {
    render(TimeoutSettings, { props: defaultProps });

    const connectionSlider = screen.getByLabelText(/Connection Timeout/);
    await fireEvent.input(connectionSlider, { target: { value: '20' } });

    expect(screen.getByText('20s')).toBeInTheDocument();
  });

  it('should detect changes and enable save button', async () => {
    render(TimeoutSettings, { props: defaultProps });

    const saveButton = screen.getByText('Save Changes');
    expect(saveButton).toBeDisabled();

    const connectionSlider = screen.getByLabelText(/Connection Timeout/);
    await fireEvent.input(connectionSlider, { target: { value: '20' } });

    expect(saveButton).not.toBeDisabled();
  });

  it('should emit save event with updated values', async () => {
    const { component } = render(TimeoutSettings, { props: defaultProps });

    const saveHandler = vi.fn();
    component.$on('save', saveHandler);

    const connectionSlider = screen.getByLabelText(/Connection Timeout/);
    await fireEvent.input(connectionSlider, { target: { value: '20' } });

    const saveButton = screen.getByText('Save Changes');
    await fireEvent.click(saveButton);

    expect(saveHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: expect.objectContaining({
          connectionTimeout: 20,
          readTimeout: 30,
          writeTimeout: 30,
          retryAttempts: 3,
          retryDelay: 1,
          autoRetryEnabled: true,
        }),
      })
    );
  });

  it('should emit reset event when reset button clicked', async () => {
    const { component } = render(TimeoutSettings, { props: defaultProps });

    const resetHandler = vi.fn();
    component.$on('reset', resetHandler);

    const resetButton = screen.getByText('Reset to Defaults');
    await fireEvent.click(resetButton);

    expect(resetHandler).toHaveBeenCalled();
  });

  it('should emit cancel event when cancel button clicked', async () => {
    const { component } = render(TimeoutSettings, { props: defaultProps });

    const cancelHandler = vi.fn();
    component.$on('cancel', cancelHandler);

    const cancelButton = screen.getByText('Cancel');
    await fireEvent.click(cancelButton);

    expect(cancelHandler).toHaveBeenCalled();
  });

  it('should reset values to defaults when reset button clicked', async () => {
    render(TimeoutSettings, { props: { ...defaultProps, connectionTimeout: 60 } });

    // Verify initial non-default value
    expect(screen.getByText('60s')).toBeInTheDocument();

    const resetButton = screen.getByText('Reset to Defaults');
    await fireEvent.click(resetButton);

    // Should reset to default value
    expect(screen.getByText('10s')).toBeInTheDocument();
  });

  it('should revert changes when cancel button clicked', async () => {
    render(TimeoutSettings, { props: defaultProps });

    // Make a change
    const connectionSlider = screen.getByLabelText(/Connection Timeout/);
    await fireEvent.input(connectionSlider, { target: { value: '20' } });
    expect(screen.getByText('20s')).toBeInTheDocument();

    // Cancel changes
    const cancelButton = screen.getByText('Cancel');
    await fireEvent.click(cancelButton);

    // Should revert to original value
    expect(screen.getByText('10s')).toBeInTheDocument();
  });

  it('should apply fast network preset', async () => {
    render(TimeoutSettings, { props: defaultProps });

    const fastNetworkButton = screen.getByText('Fast Network');
    await fireEvent.click(fastNetworkButton);

    expect(screen.getByText('5s')).toBeInTheDocument(); // Connection timeout
    expect(screen.getByText('15s')).toBeInTheDocument(); // Read/Write timeout
    expect(screen.getByText('5')).toBeInTheDocument(); // Retry attempts
    expect(screen.getByText('0.5s')).toBeInTheDocument(); // Retry delay
  });

  it('should apply default preset', async () => {
    render(TimeoutSettings, { props: { ...defaultProps, connectionTimeout: 60 } });

    const defaultButton = screen.getByText('Default');
    await fireEvent.click(defaultButton);

    expect(screen.getByText('10s')).toBeInTheDocument(); // Connection timeout
    expect(screen.getByText('30s')).toBeInTheDocument(); // Read/Write timeout
    expect(screen.getByText('3')).toBeInTheDocument(); // Retry attempts
    expect(screen.getByText('1s')).toBeInTheDocument(); // Retry delay
  });

  it('should apply slow network preset', async () => {
    render(TimeoutSettings, { props: defaultProps });

    const slowNetworkButton = screen.getByText('Slow Network');
    await fireEvent.click(slowNetworkButton);

    expect(screen.getByText('30s')).toBeInTheDocument(); // Connection timeout
    expect(screen.getByText('120s')).toBeInTheDocument(); // Read/Write timeout
    expect(screen.getByText('2')).toBeInTheDocument(); // Retry attempts
    expect(screen.getByText('3s')).toBeInTheDocument(); // Retry delay
  });

  it('should handle checkbox changes', async () => {
    render(TimeoutSettings, { props: defaultProps });

    const checkbox = screen.getByLabelText('Enable Automatic Retries');
    expect(checkbox).toBeChecked();

    await fireEvent.click(checkbox);
    expect(checkbox).not.toBeChecked();

    const saveButton = screen.getByText('Save Changes');
    expect(saveButton).not.toBeDisabled();
  });

  it('should respect slider min/max values', async () => {
    render(TimeoutSettings, { props: defaultProps });

    const connectionSlider = screen.getByLabelText(/Connection Timeout/) as HTMLInputElement;
    expect(connectionSlider.min).toBe('5');
    expect(connectionSlider.max).toBe('60');

    const readSlider = screen.getByLabelText(/Read Timeout/) as HTMLInputElement;
    expect(readSlider.min).toBe('10');
    expect(readSlider.max).toBe('300');

    const retrySlider = screen.getByLabelText(/Retry Attempts/) as HTMLInputElement;
    expect(retrySlider.min).toBe('0');
    expect(retrySlider.max).toBe('10');
  });

  it('should show appropriate step values for sliders', async () => {
    render(TimeoutSettings, { props: defaultProps });

    const connectionSlider = screen.getByLabelText(/Connection Timeout/) as HTMLInputElement;
    expect(connectionSlider.step).toBe('1');

    const readSlider = screen.getByLabelText(/Read Timeout/) as HTMLInputElement;
    expect(readSlider.step).toBe('5');

    const retryDelaySlider = screen.getByLabelText(/Initial Retry Delay/) as HTMLInputElement;
    expect(retryDelaySlider.step).toBe('0.5');
  });

  it('should handle all timeout configurations', async () => {
    const { component } = render(TimeoutSettings, { props: defaultProps });

    const saveHandler = vi.fn();
    component.$on('save', saveHandler);

    // Update all values
    const connectionSlider = screen.getByLabelText(/Connection Timeout/);
    await fireEvent.input(connectionSlider, { target: { value: '15' } });

    const readSlider = screen.getByLabelText(/Read Timeout/);
    await fireEvent.input(readSlider, { target: { value: '60' } });

    const writeSlider = screen.getByLabelText(/Write Timeout/);
    await fireEvent.input(writeSlider, { target: { value: '45' } });

    const retrySlider = screen.getByLabelText(/Retry Attempts/);
    await fireEvent.input(retrySlider, { target: { value: '5' } });

    const delaySlider = screen.getByLabelText(/Initial Retry Delay/);
    await fireEvent.input(delaySlider, { target: { value: '2' } });

    const checkbox = screen.getByLabelText('Enable Automatic Retries');
    await fireEvent.click(checkbox);

    const saveButton = screen.getByText('Save Changes');
    await fireEvent.click(saveButton);

    expect(saveHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: {
          connectionTimeout: 15,
          readTimeout: 60,
          writeTimeout: 45,
          retryAttempts: 5,
          retryDelay: 2,
          autoRetryEnabled: false,
        },
      })
    );
  });

  it('should disable save button when no changes', () => {
    render(TimeoutSettings, { props: defaultProps });

    const saveButton = screen.getByText('Save Changes');
    expect(saveButton).toBeDisabled();
  });

  it('should show configuration sections', () => {
    render(TimeoutSettings, { props: defaultProps });

    expect(screen.getByText('Timeout Configuration')).toBeInTheDocument();
    expect(screen.getByText('Retry Configuration')).toBeInTheDocument();
    expect(screen.getByText('Quick Presets')).toBeInTheDocument();
  });
});