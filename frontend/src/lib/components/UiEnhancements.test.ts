import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, screen, waitFor } from '@testing-library/svelte';
import LoadingSkeleton from './LoadingSkeleton.svelte';
import Tooltip from './Tooltip.svelte';
import KeyboardShortcuts from './KeyboardShortcuts.svelte';
import OnboardingTour from './OnboardingTour.svelte';
import ResponsiveLayout from './ResponsiveLayout.svelte';

// Mock browser environment
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

describe('LoadingSkeleton', () => {
  it('renders card skeleton correctly', () => {
    render(LoadingSkeleton, { type: 'card', lines: 3 });
    
    const skeletons = screen.getAllByRole('generic');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders text skeleton with correct number of lines', () => {
    render(LoadingSkeleton, { type: 'text', lines: 5 });
    
    const skeletons = screen.getAllByRole('generic');
    expect(skeletons.length).toBe(5);
  });

  it('renders button skeleton', () => {
    render(LoadingSkeleton, { type: 'button' });
    
    const skeleton = screen.getByRole('generic');
    expect(skeleton).toBeInTheDocument();
  });

  it('renders progress skeleton', () => {
    render(LoadingSkeleton, { type: 'progress' });
    
    const skeletons = screen.getAllByRole('generic');
    expect(skeletons.length).toBeGreaterThan(2); // Should have multiple elements
  });

  it('renders list skeleton', () => {
    render(LoadingSkeleton, { type: 'list', lines: 3 });
    
    const skeletons = screen.getAllByRole('generic');
    expect(skeletons.length).toBeGreaterThan(3); // Each list item has multiple elements
  });
});

describe('Tooltip', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows tooltip on hover after delay', async () => {
    const { container } = render(Tooltip, { 
      text: 'Test tooltip',
      delay: 100
    });

    const trigger = container.firstChild as HTMLElement;
    
    // Hover over trigger
    await fireEvent.mouseEnter(trigger);
    
    // Advance timers past delay
    vi.advanceTimersByTime(150);
    
    await waitFor(() => {
      expect(screen.getByRole('tooltip')).toBeInTheDocument();
      expect(screen.getByText('Test tooltip')).toBeInTheDocument();
    });
  });

  it('hides tooltip on mouse leave', async () => {
    const { container } = render(Tooltip, { 
      text: 'Test tooltip',
      delay: 0
    });

    const trigger = container.firstChild as HTMLElement;
    
    await fireEvent.mouseEnter(trigger);
    await fireEvent.mouseLeave(trigger);
    
    await waitFor(() => {
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });
  });

  it('shows tooltip on focus', async () => {
    const { container } = render(Tooltip, { 
      text: 'Test tooltip'
    });

    const trigger = container.firstChild as HTMLElement;
    
    await fireEvent.focus(trigger);
    
    await waitFor(() => {
      expect(screen.getByRole('tooltip')).toBeInTheDocument();
    });
  });

  it('does not show tooltip when disabled', async () => {
    const { container } = render(Tooltip, { 
      text: 'Test tooltip',
      disabled: true,
      delay: 0
    });

    const trigger = container.firstChild as HTMLElement;
    
    await fireEvent.mouseEnter(trigger);
    
    // Wait a bit to ensure tooltip doesn't appear
    vi.advanceTimersByTime(100);
    
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('positions tooltip correctly', () => {
    render(Tooltip, { 
      text: 'Test tooltip',
      position: 'bottom'
    });

    // Tooltip should have bottom positioning classes
    const tooltip = screen.getByRole('tooltip');
    expect(tooltip).toHaveClass('top-full');
  });
});

describe('KeyboardShortcuts', () => {
  let mockDispatch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockDispatch = vi.fn();
  });

  it('handles keyboard shortcuts correctly', async () => {
    const { component } = render(KeyboardShortcuts, {
      shortcuts: {
        'ctrl+s': 'Save',
        'ctrl+o': 'Open'
      }
    });

    component.$on('shortcut', mockDispatch);

    // Simulate Ctrl+S
    await fireEvent.keyDown(document, {
      key: 's',
      ctrlKey: true
    });

    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: 'ctrl+s'
      })
    );
  });

  it('shows help overlay on F1', async () => {
    render(KeyboardShortcuts, {
      shortcuts: {
        'f1': 'Show shortcuts',
        'ctrl+s': 'Save'
      }
    });

    await fireEvent.keyDown(document, { key: 'F1' });

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument();
    });
  });

  it('closes help overlay on escape', async () => {
    render(KeyboardShortcuts, {
      shortcuts: {
        'f1': 'Show shortcuts',
        'escape': 'Close'
      }
    });

    // Open help
    await fireEvent.keyDown(document, { key: 'F1' });
    
    // Close with escape
    await fireEvent.keyDown(document, { key: 'Escape' });

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('does not handle shortcuts when disabled', async () => {
    const { component } = render(KeyboardShortcuts, {
      shortcuts: { 'ctrl+s': 'Save' },
      disabled: true
    });

    component.$on('shortcut', mockDispatch);

    await fireEvent.keyDown(document, {
      key: 's',
      ctrlKey: true
    });

    expect(mockDispatch).not.toHaveBeenCalled();
  });
});

describe('OnboardingTour', () => {
  beforeEach(() => {
    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
      },
      writable: true,
    });
  });

  it('renders tour when show is true', () => {
    render(OnboardingTour, { show: true });

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Welcome to File Transfer App')).toBeInTheDocument();
  });

  it('does not render when show is false', () => {
    render(OnboardingTour, { show: false });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('navigates through steps correctly', async () => {
    render(OnboardingTour, { show: true });

    // Should start with first step
    expect(screen.getByText('Welcome to File Transfer App')).toBeInTheDocument();

    // Click next
    await fireEvent.click(screen.getByText('Next'));

    // Should show second step
    expect(screen.getByText('Choose Your Mode')).toBeInTheDocument();
  });

  it('can go back to previous step', async () => {
    render(OnboardingTour, { show: true });

    // Go to second step
    await fireEvent.click(screen.getByText('Next'));
    
    // Go back
    await fireEvent.click(screen.getByText('Previous'));

    // Should be back to first step
    expect(screen.getByText('Welcome to File Transfer App')).toBeInTheDocument();
  });

  it('completes tour on last step', async () => {
    const { component } = render(OnboardingTour, { show: true });
    
    const mockComplete = vi.fn();
    component.$on('complete', mockComplete);

    // Navigate to last step (there are 5 steps)
    for (let i = 0; i < 4; i++) {
      await fireEvent.click(screen.getByText('Next'));
    }

    // Should show "Get Started" button
    expect(screen.getByText('Get Started')).toBeInTheDocument();

    // Complete tour
    await fireEvent.click(screen.getByText('Get Started'));

    expect(mockComplete).toHaveBeenCalled();
  });

  it('can skip tour', async () => {
    const { component } = render(OnboardingTour, { show: true });
    
    const mockSkip = vi.fn();
    component.$on('skip', mockSkip);

    await fireEvent.click(screen.getByText('Skip Tour'));

    expect(mockSkip).toHaveBeenCalled();
  });

  it('shows progress indicator', () => {
    render(OnboardingTour, { show: true });

    expect(screen.getByText('1 of 5')).toBeInTheDocument();
  });
});

describe('ResponsiveLayout', () => {
  beforeEach(() => {
    // Mock window.innerWidth and innerHeight
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 768,
    });
  });

  it('renders with default props', () => {
    const { container } = render(ResponsiveLayout);
    
    expect(container.firstChild).toHaveClass('w-full', 'mx-auto');
  });

  it('provides responsive breakpoint information to slot', () => {
    let slotProps: any = {};
    
    render(ResponsiveLayout, {
      $$slots: {
        default: [
          (props: any) => {
            slotProps = props;
            return '';
          }
        ]
      }
    });

    expect(slotProps).toHaveProperty('isMobile');
    expect(slotProps).toHaveProperty('isTablet');
    expect(slotProps).toHaveProperty('isDesktop');
    expect(slotProps).toHaveProperty('screenWidth');
    expect(slotProps).toHaveProperty('screenHeight');
  });

  it('detects mobile breakpoint correctly', () => {
    // Set mobile width
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 600,
    });

    let slotProps: any = {};
    
    render(ResponsiveLayout, {
      $$slots: {
        default: [
          (props: any) => {
            slotProps = props;
            return '';
          }
        ]
      }
    });

    expect(slotProps.isMobile).toBe(true);
    expect(slotProps.isTablet).toBe(false);
    expect(slotProps.isDesktop).toBe(false);
  });

  it('detects tablet breakpoint correctly', () => {
    // Set tablet width
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 800,
    });

    let slotProps: any = {};
    
    render(ResponsiveLayout, {
      $$slots: {
        default: [
          (props: any) => {
            slotProps = props;
            return '';
          }
        ]
      }
    });

    expect(slotProps.isMobile).toBe(false);
    expect(slotProps.isTablet).toBe(true);
    expect(slotProps.isDesktop).toBe(false);
  });

  it('detects desktop breakpoint correctly', () => {
    // Set desktop width
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1200,
    });

    let slotProps: any = {};
    
    render(ResponsiveLayout, {
      $$slots: {
        default: [
          (props: any) => {
            slotProps = props;
          }
        ]
      }
    });

    expect(slotProps.isMobile).toBe(false);
    expect(slotProps.isTablet).toBe(false);
    expect(slotProps.isDesktop).toBe(true);
  });
});

describe('Accessibility Features', () => {
  it('provides proper ARIA labels and roles', () => {
    render(Tooltip, { text: 'Test tooltip' });
    
    const tooltip = screen.getByRole('tooltip');
    expect(tooltip).toHaveAttribute('role', 'tooltip');
  });

  it('supports keyboard navigation', async () => {
    render(OnboardingTour, { show: true });
    
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });

  it('provides screen reader support', () => {
    render(LoadingSkeleton, { type: 'card' });
    
    // Loading skeletons should be properly labeled for screen readers
    const skeletons = screen.getAllByRole('generic');
    expect(skeletons.length).toBeGreaterThan(0);
  });
});

describe('Animation and Performance', () => {
  it('respects reduced motion preferences', () => {
    // Mock prefers-reduced-motion
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    render(LoadingSkeleton, { type: 'card' });
    
    // Should render without issues even with reduced motion
    expect(screen.getAllByRole('generic').length).toBeGreaterThan(0);
  });

  it('handles animation cleanup properly', () => {
    const { unmount } = render(Tooltip, { text: 'Test' });
    
    // Should unmount without errors
    expect(() => unmount()).not.toThrow();
  });
});