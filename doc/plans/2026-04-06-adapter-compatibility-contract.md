# Adapter Compatibility Contract (V1.1 Proposal)

Date: 2026-04-06  
Status: Draft implementation plan  
Owner: Adapter platform

## Objective

Reduce adapter behavior variance by introducing a shared compatibility contract, executable test harness, and certification checklist for adapters shipped in-repo or by external contributors.

## Why

Paperclip’s core value depends on reliable orchestration across heterogeneous agent runtimes. Adapter-specific edge cases (timeouts, cancellation semantics, inconsistent usage/cost reporting) degrade scheduler reliability, budget controls, and operator trust.

## Contract surface

Each adapter must document and satisfy the following baseline guarantees:

1. **Invocation lifecycle**
   - Deterministic start behavior.
   - Stable run IDs/log references when available.
   - Explicit terminal state mapping (`succeeded`, `failed`, `cancelled`, `timed_out`).

2. **Cancellation**
   - Supports stop requests and reports cancellation outcome clearly.
   - Idempotent cancellation behavior for repeated stop calls.

3. **Timeout semantics**
   - Enforces configured runtime limits or reports inability to enforce.
   - Emits actionable error metadata on timeout.

4. **Usage and cost reporting**
   - Reports token/cost usage with provider/model attribution when available.
   - Never emits negative usage/cost values.

5. **Session continuity (if stateful)**
   - Documents how session IDs are persisted and resumed.
   - Handles missing or stale session state safely.

6. **Environment diagnostics**
   - Exposes clear pass/warn/fail diagnostics for local prerequisites.
   - Includes targeted remediation hints for common setup failures.

## Certification checklist

An adapter is “Paperclip Compatible” when all are true:

- Contract assertions pass in CI compatibility tests.
- Environment diagnostics return actionable hints for missing dependencies.
- Cancellation + timeout tests pass on supported host platform(s).
- Usage/cost payload validation passes against shared schema validators.
- Error messages include adapter-specific failure codes where possible.
- Adapter docs include “known limitations” and required runtime dependencies.

## Test harness proposal

Add a shared adapter compatibility suite with a reusable fixture runner:

- **Location**: `server/src/__tests__/adapter-compatibility/`
- **Core fixtures**:
  - happy-path run
  - forced timeout
  - repeated cancel request
  - malformed/missing credentials
  - usage/cost payload validation
- **Expected output**:
  - machine-readable JSON summary
  - markdown report artifact suitable for PR comments

## CI policy

1. Built-in adapters: compatibility suite required on every PR touching adapter code.
2. External adapters (plugin ecosystem): optional self-serve test command with published badge/report format.
3. Merge gate: failing contract assertions block merge unless explicitly waived by maintainers.

## Rollout plan

1. Land contract docs + schema assertions.
2. Implement harness for one adapter (`codex_local`) as reference.
3. Port remaining built-in adapters incrementally.
4. Publish contributor-facing “adapter certification” guide.

## Non-goals

- Enforcing identical feature parity across all adapters.
- Mandating session support for runtimes that are intentionally stateless.
- Blocking community experimentation before compatibility badge support exists.
