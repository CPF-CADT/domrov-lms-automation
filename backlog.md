# DOMROV Deferred MVP Backlog PRD

## Purpose

This document records functionality intentionally excluded from the first MVP. These features must either be implemented in a later phase or hidden from the UI until their backend contracts are available.

## Product rule

The frontend must not display an action that calls an unsupported endpoint. Until a backlog item is implemented and tested, its button, menu item, or workflow must be hidden or clearly marked as unavailable.

## Backlog priorities

| ID | Feature | Priority | MVP decision |
|---|---|---:|---|
| BL-001 | Class invitations | High | Implement in the next academic phase or hide invite controls. |
| BL-002 | Class ownership transfer | Medium | Implement with owner authorization or hide the action. |
| BL-003 | Class leaderboard | Medium | Implement after grading data is stable or hide leaderboard pages. |
| BL-004 | Team invitations | High | Implement notification/invitation workflow or hide invite controls. |
| BL-005 | User search | High | Implement authorized search or hide user-search-dependent workflows. |
| BL-006 | Submission approval | High | Implement explicit approval state transitions or hide approval controls. |
| BL-007 | Payment hash-based polling | Critical for payment production | Align Bakong transaction-hash verification with the payment API before enabling production payment confirmation. |

---

## BL-001 — Class invitations

### Goal

Allow an instructor to invite a user to a class and allow the recipient to accept or reject the invitation.

### Proposed API

```text
POST /class/:classId/invite
GET  /notifications
POST /notifications/:id/accept
POST /notifications/:id/reject
```

### Rules

- Only the class owner or authorized instructor can send invitations.
- A user cannot be invited twice while an invitation is pending.
- A user cannot be invited to a class where they are already enrolled.
- Accepting an invitation creates an active student enrollment.
- Invitations must expire.

### Acceptance criteria

- Instructor sends an invitation to a valid user.
- Recipient sees the invitation.
- Recipient accepts and appears in the class roster.
- Duplicate and unauthorized invitations are rejected.
- Expired invitations cannot be accepted.

## BL-002 — Class ownership transfer

### Goal

Allow the current class owner to transfer ownership to another active class member.

### Proposed API

```text
POST /class/:classId/transfer-ownership
```

### Rules

- Only the current owner can transfer ownership.
- The target user must be an active class member.
- The operation must update owner and instructor roles atomically.
- The previous owner must remain a member unless explicitly removed.

### Acceptance criteria

- Owner can transfer ownership to an eligible member.
- Non-owners receive `403`.
- Non-members cannot become owners.
- Repeating the same transfer is idempotent or returns a clear conflict.

## BL-003 — Class leaderboard

### Goal

Display ranked student results for a class using published assignment grades.

### Proposed API

```text
GET /class/:classId/leaderboard
```

### Rules

- Only active class members can view the leaderboard.
- Only published and graded submissions contribute to scores.
- Unsubmitted work must not be treated as a zero unless the product explicitly defines that rule.
- Ties must use a deterministic order.
- Student privacy must be preserved according to the product policy.

### Acceptance criteria

- Scores are calculated from the defined grading rule.
- Results are ordered deterministically.
- Unauthorized users cannot access the leaderboard.
- Updating a grade updates the leaderboard.

## BL-004 — Team invitations

### Goal

Allow a team leader or instructor to invite a class member to join a team.

### Proposed API

```text
POST /team/:teamId/invite
POST /team/join/token
```

### Rules

- Only the team leader or authorized instructor can invite users.
- The invited user must belong to the same class.
- Team capacity must be enforced during acceptance, not only during invitation.
- A user cannot belong to conflicting teams when the assignment rules prohibit it.

### Acceptance criteria

- Valid invitation reaches the recipient.
- Acceptance adds the user once.
- Full teams reject new members.
- Cross-class invitations are rejected.
- Unauthorized invitations return `403`.

## BL-005 — User search

### Goal

Provide a safe, authorized way to find users for class and team workflows.

### Proposed API

```text
GET /users/search?q=<query>&limit=<limit>
```

### Rules

- Search requires authentication.
- Search must require a minimum query length.
- Results must be paginated and rate-limited.
- Passwords, tokens, private profile fields, and sensitive data must never be returned.
- The endpoint must not expose arbitrary user enumeration beyond the approved product scope.

### Acceptance criteria

- Authorized users can search by approved fields.
- Empty or short queries are rejected or return no results.
- Results contain only safe public fields.
- Pagination and maximum limits are enforced.

## BL-006 — Submission approval

### Goal

Add an explicit teacher approval step after grading or automated evaluation.

### Proposed API

```text
PATCH /submissions/:submissionId/approve
```

### Proposed states

```text
SUBMITTED → GRADED → APPROVED
SUBMITTED → REJECTED
```

### Rules

- Only an authorized instructor can approve or reject a submission.
- Approval must not modify the submitted source code.
- Approval should record the reviewer and timestamp.
- Students can view the approval status but cannot change it.

### Acceptance criteria

- Authorized teacher can approve a graded submission.
- Unauthorized users receive `403`.
- Approval is persisted and visible to the student.
- Repeated approval is idempotent.
- Invalid state transitions are rejected.

## BL-007 — Payment hash-based polling

### Goal

Allow the client to poll a payment using the external Bakong transaction hash and safely credit the user wallet once.

### Current issue

The frontend sends a transaction hash to the polling method, while the backend currently treats the route parameter as the internal payment UUID. These identifiers must not be confused.

### Proposed API

```text
POST /payments/:paymentId/poll
```

```json
{
  "transactionHash": "external-transaction-hash"
}
```

Alternative endpoint:

```text
POST /payments/verify-by-hash
```

### Rules

- The internal payment ID and external transaction hash are separate fields.
- The payment must belong to the authenticated user.
- The same transaction hash cannot credit more than one payment.
- Wallet crediting must be idempotent.
- Pending, successful, failed, and expired states must be explicit.
- Provider credentials and transaction data must not be logged.

### Acceptance criteria

- A valid transaction hash verifies the correct payment.
- The wallet is credited exactly once.
- Repeating the same poll does not duplicate credit.
- A hash belonging to another payment is rejected.
- Invalid, pending, and expired payments return clear statuses.
- Provider failure does not corrupt the wallet ledger.

## Implementation sequence

1. Payment hash polling, because it affects financial correctness.
2. Class and team invitations, because they support collaboration workflows.
3. User search, required by invitation workflows.
4. Submission approval, after grading states are finalized.
5. Class ownership transfer.
6. Leaderboard, after grading and approval rules are stable.

## Definition of done

Each backlog item is complete only when:

- Backend endpoint and DTO are implemented.
- Authentication and ownership checks are tested.
- Database changes have a versioned migration.
- Frontend service uses the documented contract.
- Unsupported UI actions are removed or enabled only after implementation.
- Happy-path, negative, permission, idempotency, and state-consistency tests pass.
- Docker Compose integration verification passes.
- The UAT report records evidence and the final status.
