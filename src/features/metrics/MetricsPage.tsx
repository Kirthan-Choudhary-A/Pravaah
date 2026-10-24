import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@components/ui/Button';
import {
  calculateAllMetrics,
  type AllMetricsReport,
} from '../../utils/metricsCalculator';
import styles from './MetricsPage.module.css';

export const MetricsPage: React.FC = () => {
  const [report, setReport] = useState<AllMetricsReport | null>(null);
  const [isComputing, setIsComputing] = useState<boolean>(true);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [progressLabel, setProgressLabel] = useState<string>(
    'Initializing benchmark worker...'
  );

  const runEvaluation = useCallback(() => {
    setIsComputing(true);
    setProgressPercent(10);
    setProgressLabel('Starting evaluation...');

    // Try Web Worker first
    if (typeof window !== 'undefined' && typeof Worker !== 'undefined') {
      try {
        const worker = new Worker(new URL('./metrics.worker.ts', import.meta.url), {
          type: 'module',
        });

        worker.onmessage = (e: MessageEvent) => {
          if (e.data?.type === 'progress') {
            setProgressPercent(e.data.percent);
            setProgressLabel(e.data.label);
          } else if (e.data?.type === 'done') {
            setReport(e.data.report);
            setIsComputing(false);
            worker.terminate();
          } else if (e.data?.type === 'error') {
            console.error('Worker failed, falling back to main thread:', e.data.error);
            const fallbackReport = calculateAllMetrics();
            setReport(fallbackReport);
            setIsComputing(false);
            worker.terminate();
          }
        };

        worker.onerror = () => {
          const fallbackReport = calculateAllMetrics();
          setReport(fallbackReport);
          setIsComputing(false);
          worker.terminate();
        };

        worker.postMessage({ type: 'start' });
        return;
      } catch {
        // Fall back to main thread
      }
    }

    // Direct synchronous fallback
    try {
      const fallbackReport = calculateAllMetrics((_step, _total, label) => {
        setProgressLabel(label);
      });
      setReport(fallbackReport);
    } catch (err) {
      console.error('Failed to compute metrics:', err);
    } finally {
      setIsComputing(false);
    }
  }, []);

  useEffect(() => {
    runEvaluation();
  }, [runEvaluation]);

  const handleDownloadJSON = useCallback(() => {
    if (!report) return;
    const jsonStr = JSON.stringify(report, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pravaah-challenge-metrics-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [report]);

  // SVG Bar Chart Calculations
  const chartData = useMemo(() => {
    if (!report) return [];
    return report.metric3.histogram.map((bin) => ({
      label: bin.label,
      pravaahVal: bin.pravaahPercent,
      naiveVal: bin.naivePercent,
    }));
  }, [report]);

  return (
    <div className={styles.page}>
      {/* Header and Summary Strip */}
      <section className={styles.headerStrip} aria-labelledby="metrics-heading">
        <div className={styles.titleRow}>
          <div className={styles.titleGroup}>
            <div className={styles.badgeRow}>
              <span className={styles.simulatedPill}>SIMULATED</span>
              <span className={styles.subMeta}>
                IMPACTX 2026 Challenge 09 • Engine v{report?.engineVersion ?? '0.2.0'}
              </span>
            </div>
            <h1 id="metrics-heading" className={styles.title}>
              Metrics: Challenge Benchmark Evaluation
            </h1>
            <p className={styles.subtitle}>
              Measurement of Pravaah against the three challenge brief criteria:
              dependency-ordering correctness, plate capture accuracy after read-back, and
              licence renewals under scarce slots.
            </p>
          </div>

          <div className={styles.actionRow}>
            <Button
              variant="secondary"
              onClick={runEvaluation}
              disabled={isComputing}
              aria-label="Run metrics evaluation again"
            >
              {isComputing ? 'Evaluating…' : 'Run again'}
            </Button>
            <Button
              variant="primary"
              onClick={handleDownloadJSON}
              disabled={!report || isComputing}
              aria-label="Download results as JSON"
            >
              Download results (JSON)
            </Button>
          </div>
        </div>

        {/* Live Progress Indicator */}
        {isComputing && (
          <div className={styles.progressContainer} role="status" aria-live="polite">
            <div className={styles.progressLabel}>
              {progressLabel} ({progressPercent}%)
            </div>
            <div className={styles.progressBarTrack}>
              <div
                className={styles.progressBarFill}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}
      </section>

      {report && (
        <>
          {/* ============================================================== */}
          {/* METRIC 1: DEPENDENCY-ORDERING CORRECTNESS */}
          {/* ============================================================== */}
          <section
            className={styles.metricCard}
            aria-labelledby="metric-1-title"
          >
            <div className={styles.metricHeader}>
              <div>
                <span className={styles.metricKicker}>Metric 1</span>
                <h2 id="metric-1-title" className={styles.metricTitle}>
                  {report.metric1.name}
                </h2>
                <p className={styles.metricDescription}>
                  {report.metric1.description}
                </p>
              </div>
              <div
                className={`${styles.metricSummaryBadge} ${
                  report.metric1.passedCount === report.metric1.totalCount
                    ? styles.badgeSuccess
                    : ''
                }`}
              >
                <span>
                  {report.metric1.passedCount} of {report.metric1.totalCount} scenarios match
                  their gold plan ({report.metric1.passRate}%)
                </span>
              </div>
            </div>

            <div className={styles.disclaimerBanner} role="note">
              <strong>Methodology Notice:</strong> {report.metric1.disclaimer} Ordering and finish
              checks: {report.metric1.orderingPassed} of {report.metric1.orderingTotal} pass.
            </div>

            <div className={styles.tableWrapper}>
              <table
                className={styles.dataTable}
                aria-label="Gold scenario validation results"
              >
                <thead>
                  <tr>
                    <th scope="col">Scenario ID</th>
                    <th scope="col">Specification &amp; Name</th>
                    <th scope="col">Status</th>
                    <th scope="col">Finish Day</th>
                    <th scope="col">Validation Result</th>
                  </tr>
                </thead>
                <tbody>
                  {report.metric1.scenarioResults.map((s) => (
                    <tr key={s.id}>
                      <td>
                        <strong>{s.id}</strong>
                      </td>
                      <td>
                        <strong>{s.name}</strong>
                        <div className={styles.statSub}>{s.description}</div>
                      </td>
                      <td>
                        <span
                          className={
                            s.passed ? styles.statusWordSafe : styles.statusWordMissed
                          }
                        >
                          {s.passed ? 'Safe' : 'Missed'}
                        </span>
                      </td>
                      <td>{s.finishDay > 0 ? `Day ${s.finishDay}` : '—'}</td>
                      <td>
                        {s.passed ? (
                          <span className={styles.statusWordSafe}>
                            All causal DAG dependencies met
                          </span>
                        ) : (
                          <span className={styles.statusWordMissed}>
                            {s.failureReason}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* ============================================================== */}
          {/* METRIC 2: PLATE CAPTURE ACCURACY AFTER READ-BACK */}
          {/* ============================================================== */}
          <section
            className={styles.metricCard}
            aria-labelledby="metric-2-title"
          >
            <div className={styles.metricHeader}>
              <div>
                <span className={styles.metricKicker}>Metric 2</span>
                <h2 id="metric-2-title" className={styles.metricTitle}>
                  {report.metric2.name}
                </h2>
                <p className={styles.metricDescription}>
                  {report.metric2.description}
                </p>
              </div>
            </div>

            <div className={styles.disclaimerBanner} role="note">
              <strong>Methodology Notice:</strong> {report.metric2.disclaimer}
            </div>

            <div className={styles.dualStatGrid}>
              <div className={styles.statCard}>
                <span className={styles.statValue}>
                  {report.metric2.firstPassAccuracy}%
                </span>
                <span className={styles.statLabel}>
                  (a) First-Pass Accuracy
                </span>
                <span className={styles.statSub}>
                  {report.metric2.firstPassCorrect} of{' '}
                  {report.metric2.totalTranscripts} top candidate matches
                </span>
              </div>

              <div className={styles.statCard}>
                <span className={styles.statValue}>
                  {report.metric2.readBackAccuracy}%
                </span>
                <span className={styles.statLabel}>
                  (b) Right plate offered (user taps it, upper bound)
                </span>
                <span className={styles.statSub}>
                  {report.metric2.readBackCorrect} of{' '}
                  {report.metric2.totalTranscripts} among the readings offered. First reading wrong in{' '}
                  {report.metric2.wrongFirstReading}.
                </span>
              </div>
            </div>

            {report.metric2.failures.length > 0 && (
              <details className={styles.failuresDisclosure}>
                <summary>
                  Inspect {report.metric2.failures.length} transcript failure cases
                </summary>
                <div className={styles.tableWrapper} style={{ marginTop: '0.75rem' }}>
                  <table
                    className={styles.dataTable}
                    aria-label="Plate parser transcript failures"
                  >
                    <thead>
                      <tr>
                        <th scope="col">Case</th>
                        <th scope="col">Category</th>
                        <th scope="col">Transcript Input</th>
                        <th scope="col">Expected Plate</th>
                        <th scope="col">Top Produced</th>
                        <th scope="col">Note</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.metric2.failures.map((f) => (
                        <tr key={f.id}>
                          <td>{f.id}</td>
                          <td>{f.category}</td>
                          <td>
                            <code>{f.transcript}</code>
                          </td>
                          <td>{f.expectedPlate ?? 'Invalid (Rejected)'}</td>
                          <td>
                            <code>{f.producedPlate ?? 'None'}</code>
                          </td>
                          <td>{f.note}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            )}
          </section>

          {/* ============================================================== */}
          {/* METRIC 3: RENEWALS UNDER SCARCE SLOTS */}
          {/* ============================================================== */}
          <section
            className={styles.metricCard}
            aria-labelledby="metric-3-title"
          >
            <div className={styles.metricHeader}>
              <div>
                <span className={styles.metricKicker}>Metric 3</span>
                <h2 id="metric-3-title" className={styles.metricTitle}>
                  {report.metric3.name}
                </h2>
                <p className={styles.metricDescription}>
                  {report.metric3.description} (Deterministic seed:{' '}
                  <code>{report.metric3.seed}</code>, Sample:{' '}
                  <code>{report.metric3.sampleSize}</code> cases).
                </p>
              </div>
            </div>

            <div className={styles.disclaimerBanner} role="note">
              <strong>Assumptions:</strong>
              <ul style={{ margin: 0, paddingLeft: 'var(--space-4)' }}>
                {report.metric3.assumptions.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
            </div>

            <div className={styles.comparisonGrid}>
              <div className={`${styles.comparisonCard} ${styles.cardFeatured}`}>
                <div className={styles.comparisonHeader}>
                  <h3>Pravaah (Route-Comparison)</h3>
                  <span className={styles.simulatedPill}>RECOMMENDED</span>
                </div>
                <div className={styles.comparisonMetricsList}>
                  <div className={styles.comparisonRow}>
                    <span>Completed on or before LSD:</span>
                    <strong>
                      {report.metric3.pravaah.completedBeforeLSDPercent}%
                    </strong>
                  </div>
                  <div className={styles.comparisonRow}>
                    <span>Licences renewed before expiry:</span>
                    <strong>
                      {report.metric3.pravaah.renewedBeforeExpiryPercent}%
                    </strong>
                  </div>
                  <div className={styles.comparisonRow}>
                    <span>Average licence slack days:</span>
                    <strong>+{report.metric3.pravaah.avgSlackDays} days</strong>
                  </div>
                </div>
              </div>

              <div className={styles.comparisonCard}>
                <div className={styles.comparisonHeader}>
                  <h3>Naive Baseline (First RTO Slot)</h3>
                  <span className={styles.subMeta}>NO PLANNER</span>
                </div>
                <div className={styles.comparisonMetricsList}>
                  <div className={styles.comparisonRow}>
                    <span>Completed on or before LSD:</span>
                    <strong>
                      {report.metric3.naiveBaseline.completedBeforeLSDPercent}%
                    </strong>
                  </div>
                  <div className={styles.comparisonRow}>
                    <span>Licences renewed before expiry:</span>
                    <strong>
                      {report.metric3.naiveBaseline.renewedBeforeExpiryPercent}%
                    </strong>
                  </div>
                  <div className={styles.comparisonRow}>
                    <span>Average licence slack days:</span>
                    <strong>
                      {report.metric3.naiveBaseline.avgSlackDays} days
                    </strong>
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.tableWrapper}>
              <table className={styles.dataTable} aria-label="What the gap between Pravaah and the naive baseline is made of">
                <caption style={{ textAlign: 'left', fontWeight: 700, padding: 'var(--space-2) 0' }}>
                  What the gap is made of
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Strategy</th>
                    <th scope="col">Completed on or before LSD</th>
                    <th scope="col">Renewed before expiry</th>
                    <th scope="col">Average slack</th>
                  </tr>
                </thead>
                <tbody>
                  {report.metric3.additional.map((a) => (
                    <tr key={a.label}>
                      <td>
                        {a.label}
                        <br />
                        <small>{a.note}</small>
                      </td>
                      <td>{a.completedBeforeLSDPercent}%</td>
                      <td>{a.renewedBeforeExpiryPercent}%</td>
                      <td>{a.avgSlackDays} days</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* SVG Bar Chart for Slack Distribution */}
            <div className={styles.chartContainer}>
              <h3 className={styles.chartTitle}>
                Licence Slack Distribution (% of 1,000 cases)
              </h3>
              <svg
                className={styles.chartSvg}
                viewBox="0 0 600 200"
                aria-label="Slack distribution bar chart comparing Pravaah against Naive Baseline"
                role="img"
              >
                {/* Horizontal grid lines */}
                <line
                  x1="50"
                  y1="160"
                  x2="570"
                  y2="160"
                  stroke="var(--stone)"
                  strokeWidth="1"
                />
                <line
                  x1="50"
                  y1="90"
                  x2="570"
                  y2="90"
                  stroke="var(--paper-warm)"
                  strokeWidth="1"
                  strokeDasharray="4"
                />
                <line
                  x1="50"
                  y1="20"
                  x2="570"
                  y2="20"
                  stroke="var(--paper-warm)"
                  strokeWidth="1"
                  strokeDasharray="4"
                />

                {/* Y Axis labels */}
                <text x="35" y="164" fontSize="10" fill="var(--iron)" textAnchor="end">
                  0%
                </text>
                <text x="35" y="94" fontSize="10" fill="var(--iron)" textAnchor="end">
                  50%
                </text>
                <text x="35" y="24" fontSize="10" fill="var(--iron)" textAnchor="end">
                  100%
                </text>

                {/* Bars for 4 bins */}
                {chartData.map((d, i) => {
                  const xGroup = 70 + i * 130;
                  // Max height 140px for 100%
                  const pHeight = (d.pravaahVal / 100) * 140;
                  const nHeight = (d.naiveVal / 100) * 140;

                  return (
                    <g key={d.label}>
                      {/* Pravaah bar (Sage / Charcoal) */}
                      <rect
                        x={xGroup}
                        y={160 - pHeight}
                        width="36"
                        height={pHeight}
                        fill="var(--graphite)"
                        rx="2"
                      />
                      <text
                        x={xGroup + 18}
                        y={152 - pHeight}
                        fontSize="9"
                        fill="var(--graphite)"
                        textAnchor="middle"
                        fontWeight="bold"
                      >
                        {d.pravaahVal}%
                      </text>

                      {/* Naive bar (Terracotta / Stone) */}
                      <rect
                        x={xGroup + 42}
                        y={160 - nHeight}
                        width="36"
                        height={nHeight}
                        fill="var(--stone)"
                        rx="2"
                      />
                      <text
                        x={xGroup + 60}
                        y={152 - nHeight}
                        fontSize="9"
                        fill="var(--iron)"
                        textAnchor="middle"
                      >
                        {d.naiveVal}%
                      </text>

                      {/* X Axis Label */}
                      <text
                        x={xGroup + 39}
                        y="180"
                        fontSize="10"
                        fill="var(--graphite)"
                        textAnchor="middle"
                        fontWeight="500"
                      >
                        {d.label.split(' ')[0]}
                      </text>
                      <text
                        x={xGroup + 39}
                        y="194"
                        fontSize="9"
                        fill="var(--olive)"
                        textAnchor="middle"
                      >
                        {d.label.split(' ')[1] ?? ''}
                      </text>
                    </g>
                  );
                })}
              </svg>

              <div className={styles.chartLegend}>
                <div className={styles.legendItem}>
                  <div
                    className={styles.legendSwatch}
                    style={{ backgroundColor: 'var(--graphite)' }}
                  />
                  <span>Pravaah Route-Aware Planning</span>
                </div>
                <div className={styles.legendItem}>
                  <div
                    className={styles.legendSwatch}
                    style={{ backgroundColor: 'var(--stone)' }}
                  />
                  <span>Naive Baseline (First RTO Slot)</span>
                </div>
              </div>

              {/* Accessible Table for Chart Data */}
              <div className={styles.tableWrapper}>
                <table
                  className={styles.dataTable}
                  aria-label="Licence slack distribution table"
                >
                  <thead>
                    <tr>
                      <th scope="col">Slack Range</th>
                      <th scope="col">Interpretation</th>
                      <th scope="col">Pravaah Cases</th>
                      <th scope="col">Naive Baseline Cases</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.metric3.histogram.map((bin) => (
                      <tr key={bin.label}>
                        <td>
                          <strong>{bin.range}</strong>
                        </td>
                        <td>{bin.label}</td>
                        <td>
                          <strong>{bin.pravaahPercent}%</strong> ({bin.pravaahCount}{' '}
                          cases)
                        </td>
                        <td>
                          {bin.naivePercent}% ({bin.naiveCount} cases)
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
};

export default MetricsPage;
