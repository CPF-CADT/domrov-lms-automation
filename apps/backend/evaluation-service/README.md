# Evaluation Service

NestJS-only evaluation orchestration and local runner. REST is exposed for clients; internal requests and results use RabbitMQ topic events. The service owns `evaluation_db` and is intentionally independent from the Auth, Academic, and Payment databases.

The included runner supports JavaScript/TypeScript as a deterministic local smoke-test runner. It does not execute arbitrary untrusted code. A production sandbox can later consume `evaluation.job` without changing the public contract.
