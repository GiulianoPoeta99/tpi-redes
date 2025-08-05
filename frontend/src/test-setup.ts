import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock SvelteKit environment
vi.mock('$app/environment', () => ({
  browser: false,
  dev: true,
  building: false,
  version: '1.0.0'
}));

// Mock SvelteKit stores
vi.mock('$app/stores', () => ({
  page: {
    subscribe: vi.fn()
  },
  navigating: {
    subscribe: vi.fn()
  },
  updated: {
    subscribe: vi.fn()
  }
}));