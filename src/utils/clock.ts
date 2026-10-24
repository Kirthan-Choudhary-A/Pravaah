/**
 * Wall clock for the privacy layer (consent end dates, reveal expiry, audit timestamps).
 * One unit everywhere: epoch seconds. The planning engine keeps its own integer Day model.
 */
export const nowSeconds = (): number => Math.floor(Date.now() / 1000);
