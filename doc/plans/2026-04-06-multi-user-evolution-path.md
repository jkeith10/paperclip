# Multi-user Evolution Path (Post-V1)

Date: 2026-04-06  
Status: Draft implementation plan  
Owner: Core product/engineering

## Why now

V1 is intentionally optimized for a single board operator per deployment. That constraint kept product and auth surfaces tractable during the first implementation cycle, but it will become a scaling bottleneck for real teams. This plan defines a staged path that preserves V1 control-plane simplicity while unlocking practical multi-user collaboration.

## Current constraints (V1 baseline)

- Single human board operator per deployment.
- Coarse board access model with full-control posture in local-trusted mode.
- Company-scoped entities and APIs are already first-order and enforce tenancy boundaries.

## Design principles for rollout

1. **Company-scoped before global-scoped**: permissions and memberships should remain attached to company context first.
2. **Operator safety over convenience**: approval, budget, and pause/terminate controls remain protected actions.
3. **Progressive adoption**: additive role levels first; avoid large auth rewrites.
4. **Audit-first**: every role-sensitive mutation must remain attributable in activity logs.

## Milestone 1 — Read-only observers

### Goal

Allow collaborators to monitor company state without mutating it.

### Capabilities

- View dashboard, issues, projects, goals, agents, and costs.
- Cannot mutate company configuration, issue state, or approvals.

### Backend changes

- Add observer membership role to company membership model.
- Add read-only authorization guard branch in route middleware.
- Enforce mutation route denies (`403`) for observer role.

### UI changes

- Read-only role badge in company switcher and page headers.
- Disable/hide mutating controls (create/edit/delete, approval decisions).
- Explain disabled state to reduce confusion.

## Milestone 2 — Approvals-only operators

### Goal

Delegate governance bottlenecks while preserving scope control.

### Capabilities

- Everything from observer.
- Can review/approve/reject approval requests.
- Cannot alter agent configuration, budgets, or company settings.

### Backend changes

- Introduce `approve_governed_actions` permission bit.
- Gate approval decision endpoints on explicit permission.

### UI changes

- Approval inbox emphasis for this role.
- Non-approval mutations remain disabled.

## Milestone 3 — Per-company administrators

### Goal

Support delegated company operations without deployment-wide superuser access.

### Capabilities

- Full company-level operations for assigned company.
- No cross-company access unless explicitly granted.

### Backend changes

- Expand membership/permission grants for company-admin scope.
- Ensure all service-level lookups continue to enforce company boundary checks.

### UI changes

- Membership management surface under company settings.
- Clear cross-company context indicators.

## Milestone 4 — Deployment owner + advanced grants

### Goal

Introduce deployment-level lifecycle controls while keeping company-level operations bounded.

### Capabilities

- Manage instance-level settings and company creation/archival.
- Delegate company roles to other users.
- Optional advanced grants for specialized operations.

## Required safeguards for every milestone

- Add negative auth tests for every newly gated route.
- Add activity log assertions for all role-sensitive mutations.
- Preserve consistent HTTP semantics (`401`, `403`, `404`) for denied access paths.
- Ensure agent API keys remain company-bounded and unaffected by human role expansion.

## Delivery sequencing recommendation

1. Milestone 1 + 2 in one release train (fastest reduction in board bottlenecks).
2. Milestone 3 after production feedback on membership UX.
3. Milestone 4 only after explicit demand for deployment-level delegation.

## Open questions

- Should observer users see sensitive cost-provider/model detail by default?
- Should approvals-only operators leave a distinct actor type in activity UI?
- Should invite links be company-scoped one-time tokens or managed centrally?
