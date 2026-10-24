/**
 * Web Worker for Metrics Computation
 * Keeps UI thread 100% responsive while simulating 1,000 cases.
 */

import { calculateAllMetrics, type AllMetricsReport } from '../../utils/metricsCalculator';

self.onmessage = (e: MessageEvent) => {
  if (e.data?.type === 'start') {
    try {
      const report: AllMetricsReport = calculateAllMetrics((step, total, label) => {
        self.postMessage({
          type: 'progress',
          step,
          total,
          percent: Math.round((step / total) * 100),
          label,
        });
      });

      self.postMessage({
        type: 'done',
        report,
      });
    } catch (err: unknown) {
      self.postMessage({
        type: 'error',
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
};
