import type { Agent, Approval, HeartbeatRun, Issue } from "@paperclipai/shared";

export const STUCK_RUN_THRESHOLD_MINUTES = 30;
export const BUDGET_RISK_THRESHOLD_PERCENT = 80;
export const TASK_COMPLETION_WINDOW_DAYS = 30;
export const OUTCOME_WINDOW_DAYS = 7;

export function parseDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDurationFromMs(ms: number): string {
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m`;
  const hours = ms / 3_600_000;
  if (hours < 48) return `${hours.toFixed(1)}h`;
  return `${(hours / 24).toFixed(1)}d`;
}

export function countStuckRuns(runs: HeartbeatRun[], thresholdMinutes: number): number {
  const now = Date.now();
  const thresholdMs = thresholdMinutes * 60_000;
  return runs.filter((run) => {
    if (run.status !== "running") return false;
    const startedAt = parseDate(run.startedAt);
    if (!startedAt) return false;
    return now - startedAt.getTime() >= thresholdMs;
  }).length;
}

export function meanCompletionMs(issues: Issue[], windowDays = TASK_COMPLETION_WINDOW_DAYS): number | null {
  const now = Date.now();
  const windowStartMs = now - windowDays * 24 * 60 * 60 * 1000;
  const durations = issues
    .map((issue) => {
      const startedAt = parseDate(issue.startedAt);
      const completedAt = parseDate(issue.completedAt);
      if (!startedAt || !completedAt) return null;
      if (completedAt.getTime() < windowStartMs) return null;
      const duration = completedAt.getTime() - startedAt.getTime();
      return duration >= 0 ? duration : null;
    })
    .filter((value): value is number => value !== null);

  if (durations.length === 0) return null;
  const total = durations.reduce((acc, value) => acc + value, 0);
  return total / durations.length;
}

export function budgetAtRiskAgentCount(agents: Agent[], thresholdPercent: number): number {
  return agents.filter((agent) => {
    if (agent.budgetMonthlyCents <= 0) return false;
    const utilization = (agent.spentMonthlyCents / agent.budgetMonthlyCents) * 100;
    return utilization >= thresholdPercent && agent.status !== "terminated";
  }).length;
}

export function oldestApprovalAgeMs(approvals: Approval[]): number | null {
  const now = Date.now();
  const ages = approvals
    .map((approval) => parseDate(approval.createdAt))
    .filter((value): value is Date => value !== null)
    .map((createdAt) => now - createdAt.getTime())
    .filter((age) => age >= 0);

  if (ages.length === 0) return null;
  return Math.max(...ages);
}

export function getRecentlyCompletedIssues(issues: Issue[]): Issue[] {
  return [...issues]
    .filter((issue) => parseDate(issue.completedAt))
    .sort((a, b) => {
      const bTime = parseDate(b.completedAt)?.getTime() ?? 0;
      const aTime = parseDate(a.completedAt)?.getTime() ?? 0;
      return bTime - aTime;
    });
}

export function countCompletedWithinWindow(issues: Issue[], windowDays = OUTCOME_WINDOW_DAYS): number {
  const windowMs = windowDays * 24 * 60 * 60 * 1000;
  return issues.filter((issue) => {
    const completedAt = parseDate(issue.completedAt);
    if (!completedAt) return false;
    return Date.now() - completedAt.getTime() <= windowMs;
  }).length;
}
