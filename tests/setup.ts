import '@testing-library/jest-dom';

if (typeof window !== 'undefined' && !window.ResizeObserver) {
  class MockResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  window.ResizeObserver = MockResizeObserver;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (global as any).ResizeObserver = MockResizeObserver;
}
