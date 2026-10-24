/**
 * Terminal Metrics Runner for Pravaah
 * Usage: npm run metrics
 */

import { calculateAllMetrics } from '../utils/metricsCalculator';

console.log('\n============================================================');
console.log('  PRAVAAH (प्रवाह) — THREE CHALLENGE METRICS EVALUATION');
console.log('  Prototype on simulated data • IMPACTX 2026 Challenge 09');
console.log('============================================================\n');

const startTime = Date.now();
const report = calculateAllMetrics((step, total, label) => {
  console.log(`[${step}/${total}] ${label}`);
});
const duration = Date.now() - startTime;

console.log(`\nAll metrics computed in ${duration}ms.\n`);

// -----------------------------------------------------------------------------
// METRIC 1: DEPENDENCY-ORDERING CORRECTNESS
// -----------------------------------------------------------------------------
console.log('------------------------------------------------------------');
console.log('METRIC 1: DEPENDENCY-ORDERING CORRECTNESS');
console.log(`Summary: ${report.metric1.passedCount} of ${report.metric1.totalCount} scenarios match their gold plan (${report.metric1.passRate}%); ${report.metric1.orderingPassed} of ${report.metric1.orderingTotal} are ordering/finish checks`);
console.log(`Note: ${report.metric1.disclaimer}`);
console.log('------------------------------------------------------------');

console.table(
  report.metric1.scenarioResults.map((s) => ({
    ID: s.id,
    Scenario: s.name.length > 32 ? `${s.name.slice(0, 30)}…` : s.name,
    Status: s.passed ? 'PASS' : 'FAIL',
    Finish: s.finishDay > 0 ? `Day ${s.finishDay}` : '—',
    Reason: s.failureReason ? s.failureReason.slice(0, 45) : 'All DAG constraints met',
  }))
);

// -----------------------------------------------------------------------------
// METRIC 2: PLATE CAPTURE ACCURACY AFTER READ-BACK
// -----------------------------------------------------------------------------
console.log('\n------------------------------------------------------------');
console.log('METRIC 2: PLATE CAPTURE ACCURACY AFTER READ-BACK');
console.log(`Note: ${report.metric2.disclaimer}`);
console.log('------------------------------------------------------------');
console.log(`Total Typed Transcripts : ${report.metric2.totalTranscripts}`);
console.log(`(a) First-Pass Accuracy  : ${report.metric2.firstPassCorrect}/${report.metric2.totalTranscripts} (${report.metric2.firstPassAccuracy}%)`);
console.log(`(b) Right plate offered  : ${report.metric2.readBackCorrect}/${report.metric2.totalTranscripts} (${report.metric2.readBackAccuracy}%)  [assumes the user taps it; upper bound]`);
console.log(`    First reading wrong  : ${report.metric2.wrongFirstReading} (user must catch these at read-back)`);

if (report.metric2.failures.length > 0) {
  console.log(`\nFailures (${report.metric2.failures.length}):`);
  console.table(
    report.metric2.failures.map((f) => ({
      ID: f.id,
      Transcript: f.transcript.length > 25 ? `${f.transcript.slice(0, 23)}…` : f.transcript,
      Expected: f.expectedPlate ?? '(None/Invalid)',
      Produced: f.producedPlate ?? '(None)',
      Category: f.category,
    }))
  );
} else {
  console.log('Zero failures on benchmark transcript set.');
}

// -----------------------------------------------------------------------------
// METRIC 3: RENEWALS UNDER SCARCE SLOTS
// -----------------------------------------------------------------------------
console.log('\n------------------------------------------------------------');
console.log('METRIC 3: RENEWALS UNDER SCARCE SLOTS');
console.log(`Sample: ${report.metric3.sampleSize} seeded cases | Seed: ${report.metric3.seed}`);
console.log(`Ranges: Queue ${report.metric3.parameterRanges.slotQueueDays}, Expiry ${report.metric3.parameterRanges.licenceExpiryDays}`);
for (const a of report.metric3.assumptions) console.log(`Assumption: ${a}`);
console.log('------------------------------------------------------------');

console.table([
  {
    Engine: 'Pravaah (Route-aware)',
    'Completed <= LSD (%)': `${report.metric3.pravaah.completedBeforeLSDPercent}%`,
    'Renewed Before Expiry (%)': `${report.metric3.pravaah.renewedBeforeExpiryPercent}%`,
    'Avg Slack (Days)': `${report.metric3.pravaah.avgSlackDays}d`,
  },
  {
    Engine: 'Naive Baseline (First RTO Slot)',
    'Completed <= LSD (%)': `${report.metric3.naiveBaseline.completedBeforeLSDPercent}%`,
    'Renewed Before Expiry (%)': `${report.metric3.naiveBaseline.renewedBeforeExpiryPercent}%`,
    'Avg Slack (Days)': `${report.metric3.naiveBaseline.avgSlackDays}d`,
  },
]);

console.log('\nWhat the gap is made of:');
console.table(
  report.metric3.additional.map((a) => ({
    Strategy: a.label,
    'Completed <= LSD (%)': `${a.completedBeforeLSDPercent}%`,
    'Renewed Before Expiry (%)': `${a.renewedBeforeExpiryPercent}%`,
    'Avg Slack (Days)': `${a.avgSlackDays}d`,
  }))
);

console.log('\nLicence Slack Distribution:');
console.table(
  report.metric3.histogram.map((h) => ({
    Category: h.label,
    Range: h.range,
    'Pravaah Cases': `${h.pravaahCount} (${h.pravaahPercent}%)`,
    'Naive Cases': `${h.naiveCount} (${h.naivePercent}%)`,
  }))
);

console.log('\n============================================================');
console.log('  EVALUATION COMPLETE • simulated data, results as measured above');
console.log('============================================================\n');
