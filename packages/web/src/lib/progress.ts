import { REPORT_STEPS, type ReportProgress, type ReportStep } from '@ocis-dashboard/core';

const STEP_LABELS: Record<ReportStep, string> = {
  tickets: 'Loading tickets from Jira',
  links: 'Reading the Jira links of each ticket',
  pulls: 'Searching GitHub for pull requests',
  backports: 'Looking for backports',
};

/** Rough share of the total time each step takes. */
const STEP_WEIGHTS: Record<ReportStep, number> = {
  tickets: 0.1,
  links: 0.3,
  pulls: 0.4,
  backports: 0.2,
};

export interface ProgressView {
  label: string;
  /** e.g. "12 of 42", when the step's size is known. */
  count?: string;
  /** 0…1 across all steps. */
  fraction: number;
}

export function describeProgress(progress: ReportProgress | undefined): ProgressView {
  if (!progress) return { label: 'Connecting to the server', fraction: 0.02 };
  const { step, done, total } = progress;
  const before = REPORT_STEPS.slice(0, REPORT_STEPS.indexOf(step)).reduce(
    (sum, s) => sum + STEP_WEIGHTS[s],
    0,
  );
  const within = total > 0 ? Math.min(done / total, 1) : 0;
  return {
    label: STEP_LABELS[step],
    count: total > 0 ? `${done} of ${total}` : undefined,
    fraction: Math.max(0.02, before + STEP_WEIGHTS[step] * within),
  };
}
