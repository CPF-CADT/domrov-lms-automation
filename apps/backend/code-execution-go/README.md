# Go Code Execution Service

Runs teacher-requested commands against an immutable student project snapshot inside a temporary Docker sandbox.

The service accepts `POST /executions` requests, consumes `code.execution.requested` RabbitMQ events, and exposes results through `GET /executions/:executionId`. The command runs with `/workspace` as its working directory. The original submission is never mounted or modified.

This service requires access to Docker only for the execution worker. It applies no-network, non-root-compatible container restrictions, CPU/memory/process limits, timeouts, and output limits. For production K3s, run workers on a dedicated node or replace Docker CLI execution with isolated Kubernetes Jobs.
