# DOMROV security audit 04 · XSS and insecure deserialization

**Reviewed 27 November 2026** · Git HEAD `54547c26` · Read-only source and configuration review

Reviewed the React frontends, NestJS request handlers, Go JSON decoders, RabbitMQ producers and consumers, checked-in message schemas, and file-serving paths. A **confirmed finding** has direct source evidence of a missing or ineffective control. Its impact can still depend on access to a service or broker. A **potential risk** requires an additional condition that the source review could not verify. The review did not exercise live services, browsers, or deployed broker and storage policies.

**Results** · 7 confirmed object-validation or data-binding findings and 3 potential browser-content risks. No executable XSS path or native object-deserialization gadget was confirmed in the reviewed code.

## Cross-site scripting

### XSS-01 · Low · Potential risk · Resource links lack a common client-side URL policy

- **File and lines** — `apps/react-client/src/pages/assignments/StudentAssignmentDetailPage.tsx:292`, `apps/react-client/src/pages/assignments/components/ResourceViewer.tsx:79–87`, `apps/react-client/src/pages/assignments/components/SubmissionResources.tsx:75–86`, `apps/backend/academic/src/academic.service.ts:252–259`.
- **Code evidence** — Resource URL values flow directly into JSX `href` attributes. The reviewed external-resource creation branch recognizes an HTTP(S) prefix and the anchors use `rel="noopener noreferrer"`. Some consumers render a generic resource URL field without distinguishing an external link from a storage key.
- **Potential impact** — A malformed, legacy, or incorrectly mapped resource value can cause unintended navigation. Script execution would require a navigation path or deployment that accepts an executable URL. The reviewed React path does not establish that condition.
- **Recommended fix** — Parse and canonicalize external URLs at the API boundary, accept only explicit HTTP(S) destinations, and apply the same policy before rendering links from saved records. Build download URLs separately from resource IDs.

### XSS-02 · Medium · Potential risk · Uploaded active content could be served inline outside the download controller

- **File and lines** — `apps/backend/academic/src/academic.service.ts:240–259,300–304,307–312`, `apps/backend/academic/src/storage.ts:119–124,150–152,160–163`, `apps/backend/academic/src/controllers.ts:112–127`.
- **Code evidence** — Multipart MIME metadata and the content type supplied to the presigned upload can become the stored content type. The optional R2 adapter accepts that value. Both reviewed application download routes set `Content-Disposition: attachment` and use authenticated access.
- **Potential impact** — A deployment that serves these objects inline on an authenticated application origin could turn uploaded active content into stored XSS. A public or custom storage origin and its headers were outside the source review.
- **Recommended fix** — Keep untrusted uploads private and serve them through an authenticated attachment response with `X-Content-Type-Options: nosniff`. Use an isolated, cookieless origin for inline previews and allow only the file types the preview actually supports.

### XSS-03 · Low · Potential risk · AI Markdown can load remote content

- **File and lines** — `apps/react-client/src/pages/assignments/StudentAssignmentDetailPage.tsx:373`, `apps/react-client/src/pages/assignments/components/StudentEvaluationFeedback.tsx:35–44`, `apps/react-client/package-lock.json:6737–6740`.
- **Code evidence** — Approved evaluation content can reach `<ReactMarkdown>{evaluation.aiOutput}</ReactMarkdown>` when the field is present. The component uses the library's default HTML and URL handling. It does not restrict image elements or their destinations.
- **Potential impact** — Displaying feedback that contains a remote image can cause a browser request to an external host. Links can also lead users away from DOMROV. The reviewed Markdown configuration does not establish script execution.
- **Recommended fix** — If AI feedback only needs formatted text, disable images and restrict links to the expected URL schemes or destinations. Preserve the renderer's default handling of raw HTML and review any future plugins before enabling them.

**Output encoding checked.** Rubric definitions and resource titles use ordinary JSX text interpolation in `apps/react-client/src/pages/assignments/StudentAssignmentDetailPage.tsx:288–292`. Manual grading feedback uses interpolation in `apps/react-client/src/pages/assignments/components/GradingSection.tsx:110`. The code-execution terminal constructs text from stdout and stderr in `apps/react-client/src/pages/assignments/components/ExecutionTerminal.tsx:16–21`. Repository searches found no application uses of `dangerouslySetInnerHTML`, direct `innerHTML` assignment, or `rehypeRaw` in the reviewed frontends.

## Insecure deserialization and runtime object validation

### DES-01 · High · Confirmed · AI credential updates bind untrusted JSON directly to a persistence entity

- **File and lines** — `apps/backend/evaluation/src/user-ai.controller.ts:19–22,32–48,58–64`, `apps/backend/evaluation/src/user-ai.entity.ts:3–18`, `apps/backend/evaluation/src/main.ts:61–63`.
- **Code evidence** — The authenticated PATCH handler loads an owned entity and calls `Object.assign(key, input)` before saving it. The inline `Partial<{…}>` type provides no decorated runtime DTO for Nest's whitelist. The entity includes identity, ownership, and verification fields outside the intended patch fields. The create handler also spreads the request into a new entity, although it explicitly sets ownership and initial state.
- **Potential impact** — Caller-supplied properties can mutate protected entity fields after the ownership check. This can affect credential ownership, verification state, and record integrity. The exact persistence effect depends on the field and database constraints.
- **Recommended fix** — Use decorated create and update DTO classes, reject extra keys, and assign only validated editable fields. Keep identifiers, ownership, timestamps, and verification state service-managed.

### DES-02 · High · Confirmed · Evaluation result messages can change grades without binding the result to the expected job

- **File and lines** — `apps/backend/academic/src/messaging/rabbitmq.ts:130–137,147–163,168–194`, `apps/backend/academic/src/academic.service.ts:343–353`.
- **Code evidence** — The consumer normalizes an envelope or raw result using TypeScript casts. It finds a submission by the supplied ID and writes the supplied evaluation ID, status, score, and feedback. It checks existing terminal states, but does not compare the message's evaluation ID to the submission's recorded job, enforce the score range, or bind the status to the routing key.
- **Potential impact** — A malformed message from a legitimate publisher or a message from an unauthorized publisher with broker access can corrupt a pending submission's grade, feedback, or state. Broker publish access in the deployed environment was unverified.
- **Recommended fix** — Validate the envelope and event-specific payload at receipt. Bind the result to the expected evaluation and submission, enforce the allowed state transition and score range, and atomically apply only the matching pending result. Restrict publish permissions for result routes to the evaluation service.

### DES-03 · High · Confirmed · Credit commands reach wallet arithmetic without a runtime numeric contract

- **File and lines** — `apps/backend/payment/src/messaging/rabbitmq.ts:18–41,60–82`, `apps/backend/payment/src/payment.service.ts:300–312,320–329`, `apps/backend/payment/src/controllers.ts:31`, `contracts/rabbitmq/credit-command.schema.json:5–14`.
- **Code evidence** — The consumer uses a cast and non-null assertions before passing message fields to the service. The reservation amount is checked only with `input.amount <= 0`. Subsequent subtraction and addition use the raw input and can apply different JavaScript coercion rules. Commit and release accept a reservation ID and idempotency key without operation-specific payload validation. The checked-in schema expects an operation, evaluation ID, and amount even though the transition consumer reads a reservation ID.
- **Potential impact** — Malformed inputs reaching the reservation service can produce incorrect credit arithmetic or database errors. Unauthorized wallet changes require access to the protected command boundary. Deployed broker and service permissions were outside the verification scope.
- **Recommended fix** — Use separate strict schemas for reserve, commit, and release. In the service, enforce a finite, positive amount with the supported scale before arithmetic. Validate IDs and idempotency keys and scope broker write permissions to the calling services.

### DES-04 · Medium · Confirmed · Evaluation requests and worker jobs use unchecked message shapes and a broad retry rule

- **File and lines** — `apps/backend/evaluation/src/contracts.ts:13–28,40–43`, `apps/backend/evaluation/src/rabbit.controller.ts:15–22,32–60`, `apps/backend/evaluation/src/evaluation.service.ts:38–49,53–60,94–102`, `contracts/rabbitmq/evaluation-requested.schema.json:5–16`.
- **Code evidence** — `unwrap()` returns the payload or raw message via a cast. The controller forwards it to the service, which spreads the request into a record and republishes it. The worker consumes fields including files, rubric, and score limit. The schema in the repository does not describe several of these fields. The request consumer requeues failures without distinguishing permanent validation failures from transient errors.
- **Potential impact** — A producer bug or malformed delivery can produce invalid jobs, block progress through repeated retries, or cause unexpected processing costs. The actual retry behavior also depends on broker policy.
- **Recommended fix** — Align schemas with deployed producers and distinguish request and worker job contracts. Validate identifiers, billing references, nested arrays, string limits, and score bounds before persistence or state changes. Reject invalid deliveries without requeue and cap transient retries.

### DES-05 · Medium · Confirmed · Execution requests are persisted before full validation

- **File and lines** — `apps/backend/code-execution-go/cmd/server/main.go:157–188`, `apps/backend/code-execution-go/internal/messaging/rabbitmq.go:132–162,224–280`, `apps/backend/code-execution-go/internal/execution/sandbox.go:39–106`.
- **Code evidence** — HTTP decodes one JSON value under a 7 MiB cap and checks the authenticated owner, then persists and publishes the request. The worker accepts several envelope forms, decodes into a typed struct, and checks its execution ID before persistence. Language, command, project files, and several limits are handled later by the sandbox. Neither path rejects unknown JSON fields.
- **Potential impact** — Invalid jobs can be stored and queued before being rejected by the runner. Permissive envelope handling can also conceal producer-contract drift. The typed decoder and sandbox checks limit the conclusion to input validation and job integrity.
- **Recommended fix** — Share request validation between HTTP ingress and the consumer. Apply body-size and shape limits before persistence, verify the accepted envelope version, and reject trailing JSON and unsupported fields where the versioned contract permits it.

### DES-06 · Medium · Confirmed · Admin credit package patch bypasses its decorated DTO

- **File and lines** — `apps/backend/payment/src/admin-wallet.controller.ts:6–15,24–31`, `apps/backend/payment/src/main.ts:40–42`, `apps/backend/payment/src/payment.service.ts:88–96,168–172`, `apps/backend/payment/src/entities.ts:13–25`.
- **Code evidence** — The create endpoint accepts a decorated DTO. The admin update endpoint uses `Partial<CreditPackageDto>` as a compile-time type. The service checks selected business fields, then assigns the entire request to the stored entity with `Object.assign(pkg, input, …)`.
- **Potential impact** — An authenticated administrator or compromised admin session can submit properties or types beyond the intended patch contract. Which changes persist depends on field mappings and database constraints.
- **Recommended fix** — Use a runtime patch DTO with inherited decorators, reject unknown keys, and construct an explicit update from validated editable fields. Keep package identity and audit timestamps outside the request contract.

### DES-07 · Low · Confirmed · LLM response validation coerces scores and leaves metadata unchecked

- **File and lines** — `apps/backend/evaluation/src/ollama-evaluation.service.ts:61–74,80–103`, `apps/backend/evaluation/src/evaluation.service.ts:103–111`.
- **Code evidence** — The service parses the provider response and its embedded JSON, then evaluates `Number(parsed.score)` before the finite and range checks. Feedback must be a non-empty string. The outer response's model and token counters are cast to TypeScript types and then persisted without equivalent runtime checks.
- **Potential impact** — A malformed provider response can yield a misleading grade through coercion or cause evaluation persistence errors through invalid metadata. The code supplies a provider timeout and requests bounded generation.
- **Recommended fix** — Require a JSON object with a finite numeric score before checking the range. Bound feedback length and validate optional model and token fields. Cap the response bytes read and map invalid responses to a stable provider error code.

**Serialization scope.** Plain JSON parsing and typed Go decoding are present. The reviewed application paths revealed no native loaders that instantiate attacker-selected classes. Checked-in RabbitMQ schemas document message intent, and the findings above identify consumers where the runtime checks are absent or incomplete. No payloads were sent to a running environment.

## References

- [OWASP Cross Site Scripting Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [OWASP Deserialization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Deserialization_Cheat_Sheet.html)
- [React Markdown security documentation](https://github.com/remarkjs/react-markdown#security)
