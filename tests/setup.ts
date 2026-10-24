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

// jsdom's AbortSignal is rejected by Node's Request, which react-router builds on every navigation
if (typeof window !== 'undefined') {
  const NodeRequest = globalThis.Request;
  globalThis.Request = class extends NodeRequest {
    constructor(input: RequestInfo | URL, init?: RequestInit) {
      const rest = { ...init };
      delete rest.signal;
      super(input, rest);
    }
  } as typeof Request;
}
