# Microsoft reconstruction guide

This is proposed rebuild guidance, not a tenant export or a verified deployment recipe. Platform setup, licensing and connector permissions must be checked in the destination tenant.

1. **Intake:** Microsoft Forms or Power Apps collects project details, dates, requirements, scope, quantity/effort, total amount/currency, milestone dates, acceptance criteria, vendor/customer focal points and email addresses, dependency flags and descriptions.
2. **Register:** SharePoint SOW list stores ID, revision, immutable document reference, PM, value, currency, flags, route, current step, attempt, status and timestamps. Separate decision and notification logs preserve history. Store generated documents in a document library.
3. **Number:** Use a durable unique list ID or serialized counter with uniqueness enforced. Never implement production numbering as a read-then-increment operation without concurrency control.
4. **Document:** Populate approved Word template content controls from validated inputs. Use reviewed legal clauses. Bind the PM review to the exact immutable document revision or hash. Changes invalidate PM review and any approvals.
5. **Review:** PM verifies the generated document and explicitly submits the current revision. Route is computed from frozen, validated data. External dependencies override financial thresholds.
6. **Approvals:** Resolve roles to authenticated tenant users. Request each approval in sequence; store result, identity, revision, comments and time before advancing. Validate the decision still corresponds to the active attempt and step. Notify PM after each decision; notify next approver only after successful advancement.
7. **Rejection:** Stop the attempt, notify PM with comments, create a revised draft, require PM review, and restart from Contract Manager. Preserve all previous decisions as history; they do not authorize the revision.
8. **Delivery and recovery:** Use a transactional notification outbox or equivalent durable queue, retry policies and idempotency keys (SOW ID + revision + attempt + step + notification type). Monitor failures, timeouts and stalled approvals. Production deployment needs permission-scoped records and document access, retention, concurrency checks, role delegation and escalation rules.

The portable demo supplies tested business rules, a genuine Word document writer and observable event payloads. Connecting it to Microsoft requires tenant-specific work. AI is not required for routing or template population; any future AI drafting stage should be clearly labeled and PM/legal-reviewed.
