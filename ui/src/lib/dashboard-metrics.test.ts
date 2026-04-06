import { describe, expect, it, vi } from "vitest";
import type { Agent, Approval, HeartbeatRun, Issue } from "@paperclipai/shared";
import {
  budgetAtRiskAgentCount,
  countCompletedWithinWindow,
  countStuckRuns,
  formatDurationFromMs,
  getRecentlyCompletedIssues,
  meanCompletionMs,
  oldestApprovalAgeMs,
  parseDate,
} from "./dashboard-metrics";

function buildIssue(overrides: Partial<Issue> = {}): Issue {
  const now = new Date("2026-04-06T12:00:00.000Z");
  return {
    id: "issue-1",
    companyId: "company-1",
    projectId: null,
    projectWorkspaceId: null,
    goalId: null,
    parentId: null,
    title: "Issue",
    description: null,
    status: "todo",
    priority: "medium",
    assigneeAgentId: null,
    assigneeUserId: null,
    checkoutRunId: null,
    executionRunId: null,
    executionAgentNameKey: null,
    executionLockedAt: null,
    createdByAgentId: null,
    createdByUserId: null,
    issueNumber: 1,
    identifier: "PAP-1",
    requestDepth: 0,
    billingCode: null,
    assigneeAdapterOverrides: null,
    executionWorkspaceId: null,
    executionWorkspacePreference: null,
    executionWorkspaceSettings: null,
    startedAt: null,
    completedAt: null,
    cancelledAt: null,
    hiddenAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function buildRun(overrides: Partial<HeartbeatRun> = {}): HeartbeatRun {
  const now = new Date("2026-04-06T12:00:00.000Z");
  return {
    id: "run-1",
    companyId: "company-1",
    agentId: "agent-1",
    invocationSource: "on_demand",
    triggerDetail: null,
    status: "running",
    startedAt: now,
    finishedAt: null,
    error: null,
    wakeupRequestId: null,
    exitCode: null,
    signal: null,
    usageJson: null,
    resultJson: null,
    sessionIdBefore: null,
    sessionIdAfter: null,
    logStore: null,
    logRef: null,
    logBytes: null,
    logSha256: null,
    logCompressed: false,
    stdoutExcerpt: null,
    stderrExcerpt: null,
    errorCode: null,
    externalRunId: null,
    processPid: null,
    processStartedAt: null,
    retryOfRunId: null,
    processLossRetryCount: 0,
    contextSnapshot: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function buildAgent(overrides: Partial<Agent> = {}): Agent {
  const now = new Date("2026-04-06T12:00:00.000Z");
  return {
    id: "agent-1",
    companyId: "company-1",
    name: "Agent",
    urlKey: "agent",
    role: "general",
    title: null,
    icon: null,
    status: "active",
    reportsTo: null,
    capabilities: null,
    adapterType: "process",
    adapterConfig: {},
    runtimeConfig: {},
    budgetMonthlyCents: 1000,
    spentMonthlyCents: 0,
    pauseReason: null,
    pausedAt: null,
    permissions: { canCreateAgents: true },
    lastHeartbeatAt: null,
    metadata: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function buildApproval(overrides: Partial<Approval> = {}): Approval {
  const now = new Date("2026-04-06T12:00:00.000Z");
  return {
    id: "approval-1",
    companyId: "company-1",
    type: "hire_agent",
    requestedByAgentId: null,
    requestedByUserId: "user-1",
    status: "pending",
    payload: {},
    decisionNote: null,
    decidedByUserId: null,
    decidedAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe("dashboard metrics", () => {
  it("parses date-like values and rejects invalid dates", () => {
    expect(parseDate("2026-04-06T12:00:00.000Z")?.toISOString()).toBe("2026-04-06T12:00:00.000Z");
    expect(parseDate("not-a-date")).toBeNull();
  });

  it("formats durations for seconds/minutes/hours/days", () => {
    expect(formatDurationFromMs(22_000)).toBe("22s");
    expect(formatDurationFromMs(4 * 60_000)).toBe("4m");
    expect(formatDurationFromMs(3.5 * 3_600_000)).toBe("3.5h");
    expect(formatDurationFromMs(3 * 24 * 3_600_000)).toBe("3.0d");
  });

  it("counts stuck runs by status and elapsed time threshold", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-06T12:00:00.000Z"));

    const runs = [
      buildRun({ id: "run-stuck", status: "running", startedAt: new Date("2026-04-06T10:00:00.000Z") }),
      buildRun({ id: "run-fresh", status: "running", startedAt: new Date("2026-04-06T11:45:00.000Z") }),
      buildRun({ id: "run-done", status: "succeeded", startedAt: new Date("2026-04-06T08:00:00.000Z") }),
    ];

    expect(countStuckRuns(runs, 30)).toBe(1);
    vi.useRealTimers();
  });

  it("computes mean completion duration within window", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-06T12:00:00.000Z"));

    const issues = [
      buildIssue({
        startedAt: new Date("2026-04-06T10:00:00.000Z"),
        completedAt: new Date("2026-04-06T11:00:00.000Z"),
      }),
      buildIssue({
        id: "issue-2",
        startedAt: new Date("2026-04-06T08:00:00.000Z"),
        completedAt: new Date("2026-04-06T10:00:00.000Z"),
      }),
      buildIssue({
        id: "issue-old",
        startedAt: new Date("2026-01-01T10:00:00.000Z"),
        completedAt: new Date("2026-01-01T11:00:00.000Z"),
      }),
    ];

    expect(meanCompletionMs(issues, 30)).toBe(5_400_000);
    vi.useRealTimers();
  });

  it("counts budget-at-risk agents using utilization threshold", () => {
    const agents = [
      buildAgent({ spentMonthlyCents: 850, budgetMonthlyCents: 1_000 }),
      buildAgent({ id: "agent-2", spentMonthlyCents: 300, budgetMonthlyCents: 1_000 }),
      buildAgent({ id: "agent-3", spentMonthlyCents: 2_000, budgetMonthlyCents: 0 }),
      buildAgent({ id: "agent-4", spentMonthlyCents: 1_000, budgetMonthlyCents: 1_000, status: "terminated" }),
    ];

    expect(budgetAtRiskAgentCount(agents, 80)).toBe(1);
  });

  it("returns oldest pending approval age in ms", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-06T12:00:00.000Z"));
    const approvals = [
      buildApproval({ createdAt: new Date("2026-04-06T11:30:00.000Z") }),
      buildApproval({ id: "approval-2", createdAt: new Date("2026-04-06T09:00:00.000Z") }),
    ];
    expect(oldestApprovalAgeMs(approvals)).toBe(10_800_000);
    vi.useRealTimers();
  });

  it("sorts and counts completed issues by recency window", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-06T12:00:00.000Z"));

    const issues = [
      buildIssue({ id: "i1", completedAt: new Date("2026-04-01T12:00:00.000Z") }),
      buildIssue({ id: "i2", completedAt: new Date("2026-04-05T12:00:00.000Z") }),
      buildIssue({ id: "i3", completedAt: new Date("2026-03-01T12:00:00.000Z") }),
      buildIssue({ id: "i4", completedAt: null }),
    ];

    const sorted = getRecentlyCompletedIssues(issues);
    expect(sorted.map((issue) => issue.id)).toEqual(["i2", "i1", "i3"]);
    expect(countCompletedWithinWindow(sorted, 7)).toBe(2);
    vi.useRealTimers();
  });
});
