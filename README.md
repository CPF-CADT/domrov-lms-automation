# DOMROV

---

## Table of Contents

- [Project Description](#project-description)  
- [Who Is Domrov?](#who-is-domrov)  
- [Who Is This For?](#who-is-this-for)  
- [Project Features](#project-features)  
- [Technology Stack & Infrastructure](#technology-stack--infrastructure)  
- [Implementation](#implementation)  
  - [1. System Architecture & Internal Communication](#1-system-architecture--internal-communication)  
  - [2. Asynchronous Task Queue](#2-asynchronous-task-queue)  
  - [3. Rubric-Driven LLM Evaluation](#3-rubric-driven-llm-evaluation)  
  - [4. Token Optimization Strategy](#4-token-optimization-strategy)  
  - [5. Model Benchmarking & Selection](#5-model-benchmarking--selection)  
  - [6. File Handling & Storage](#6-file-handling--storage)  
  - [7. User-Provided AI API Keys](#7-user-provided-ai-api-keys)  
  - [8. Payment Implementation](#8-payment-implementation)  
- [Security Checklist](#security-checklist-based-on-owasp-top-10)
- [Folder Structure](#folder-structure)
- [CI/CD Status](#cicd-status)
- [Additional Documentation](#additional-documentation)  
- [Contact Us](#contact-us)  
- [Terms of Use](#terms-of-use)  

---

## Project Description

DOMROV is a learning management and automated evaluation platform built for programming courses. The project tackles the challenges of manual code assessment and overloaded teacher workloads by providing a unified system where students submit programming assignments and receive automated grading with AI-generated feedback, which teachers can approve. The platform also supports assessment management, class tools, analytics, and an admin panel.

In Cambodian computer science education, instructors face time-consuming manual reviews, subjective grading, and increased workloads, especially with remote learning. No local LMS currently offers automated evaluation or AI-supported feedback tailored to programming courses. Domrov fills this gap by enabling intelligent code checking, plagiarism detection, and structured feedback.

**Key objectives:**

- Build a web-based system for managing programming assessments  
- Provide automatic code evaluation  
- Offer teacher tools for class management, task management, resources, manual grading, and analytics  
- Deliver a student dashboard for submissions, feedback, and progress tracking  
- Provide an admin panel for user tracking and system monitoring  
- Integrate AI (LLM models) for feedback generation and code evaluation  
- Create a flexible platform for educational institutions or short courses  

---

## Who Is Domrov?

Domrov is a Cambodian-led initiative focused on improving programming education through automation and intelligent feedback. Our team is passionate about building tools that help teachers and students succeed in computer science courses.

---

## Who Is This For?

DOMROV is for educators, students, and academic institutions who want to automate programming assignment grading, streamline feedback, and reduce manual workloads. If you need to process many submissions, provide detailed feedback, or improve consistency in grading, DOMROV is for you.

---

## Project Features

### Authentication & User Management

- Register using email/password or sign in with Google (OAuth)  
- Secure login, password reset, and profile management  
- Role-based access for students, teachers, and admins  

### Classes & Teams

- Teachers can create and manage classes  
- Students can join classes and form or join teams  
- Teachers can assign assistants, track participation, and display leaderboards  

### Assignments & Submissions

- Teachers can create programming assignments with flexible schedules  
- Students can submit assignments individually or as a team  
- Teachers can give direct feedback on assignments  
- AI can assist teachers in grading and providing detailed feedback  

### AI-Powered Grading & Feedback

- Assignments can be graded instantly using AI  
- Students receive detailed, structured feedback and scores  
- Teachers can review, adjust, and approve AI-generated grades  

### Wallet & Payments

- Users can buy credits to use AI features  
- Payments are made using KHQR  
- All transactions and AI usage are tracked clearly  

### Progress Tracking & Analytics

- Visual dashboards show student performance and assignment results  
- Teachers can monitor class progress and identify areas for improvement  

### Admin Panel

- Admins can manage users and monitor system activity  
- Credit packages can be managed and adjusted  
- Platform settings and integrations can be configured  

---

## Technology Stack & Infrastructure

The current backend has five independently packaged microservices. The root
`docker-compose.yml` defines their local runtime, five PostgreSQL databases,
RabbitMQ, and the Nginx API gateway.

### Frontend

- React 19, Vite, TypeScript, and Tailwind CSS in `apps/react-client/` and `apps/admin/`
- Clients access the backend through one gateway origin (`http://localhost:8088` locally)
- The existing frontend workflow builds and synchronizes static assets to AWS S3

### Backend services

| Service | Source | Runtime | Local port | Database |
| --- | --- | --- | --- | --- |
| User | `apps/backend/user/` | NestJS / Node.js | 3001 | `auth_db` |
| Academic | `apps/backend/academic/` | NestJS / Node.js | 3002 | `academic_db` |
| Payment | `apps/backend/payment/` | NestJS / Node.js | 3003 | `payment_db` |
| Evaluation | `apps/backend/evaluation/` | NestJS / Node.js | 3004 | `evaluation_db` |
| Code Execution | `apps/backend/code-execution-go/` | Go | 3005 | `execution_db` |

Services own their data and migrations. Other services use external identifiers,
REST APIs, and RabbitMQ messages instead of sharing entities or database access.
Evaluation orchestration and Go code execution are separate services; there is
no Python evaluation service in the current stack.

### Infrastructure and integrations

- `infra/gateway/` contains gateway routing, including a remaining legacy admin fallback
- `infra/rabbitmq/` contains broker definitions; `contracts/rabbitmq/` contains message schemas
- Academic uploads use the `academic_files` volume mounted at `/data/files`
- Payment has a separate local/EBS bind mount configured by `EBS_MOUNT_PATH`
- OAuth, Bakong payments, and AI provider integration remain application concerns
- `terraform/` is deprecated deployment material for the former backend; review
  [its warning](terraform/README.md) before using any infrastructure instructions

---

## Implementation

### 1. System Architecture & Internal Communication

The React applications call the Nginx gateway. It routes requests to User,
Academic, Payment, Evaluation, and Go Code Execution services. RabbitMQ carries
internal evaluation, execution, credit, and notification messages.

See [gateway compatibility](docs/gateway-compatibility.md) for routes and the
remaining unmatched `/admin/*` fallback. This cleanup preserves that fallback.

---

### 2. Asynchronous Task Queue

Academic persists submissions and publishes evaluation requests. Evaluation owns
evaluation state and result processing; Go Code Execution handles sandboxed
execution requests. RabbitMQ connects producers and consumers. Each service
persists its own records in its own PostgreSQL database.

Broker definitions and service queue configuration must be reconciled before a
new production deployment; see [platform notes](docs/platform-scaffolding.md).
The historical Redis/RQ and Python worker instructions do not describe this
runtime.

---

### 3. Rubric-Driven LLM Evaluation

- Separate syntax checking from logical assessment  
- Use structured JSON output format  
- Convert rubric items into binary checks  
- Externalize score calculation  
- Normalize final score for consistency  

---

### 4. Token Optimization Strategy

**Techniques Used:**

- Code Normalization: remove whitespace, strip comments, minify formatting  
- Project Structure Awareness: send directory tree, reduce repeated tokens  
- Pre-Evaluation Token Estimation: prevent model overflow, trigger fallback  

**Result:** 30–40% token reduction, lower cost, faster evaluation  

---

### 5. Model Benchmarking & Selection

Historical experiments compared several model providers. The current Evaluation
Service calls Ollama; `OLLAMA_BASE_URL`, `OLLAMA_MODEL`, and `OLLAMA_TIMEOUT_MS`
configure it in the root Compose file. Model availability is an external runtime
dependency.

---

### 6. File Handling & Storage

Academic owns authenticated resource uploads and submission files under
`/data/files` in its `academic_files` volume. Go Code Execution uses a separate
temporary workspace configured by `CODE_EXECUTION_WORKSPACE_DIR` and
`WORKSPACE_ROOT`. Payment retains its configured local/EBS mount.

The earlier shared backend/Python storage design is retained only as a
[deprecated historical note](docs/local-ebs-storage.md); its migration commands
must not be used for the current services.

---

### 7. User-Provided AI API Keys

- Teachers can upload OpenAI, Gemini, OpenRouter, Ollama keys  
- Supports custom cURL requests for unsupported providers  

---

### 8. Payment Implementation

#### Overview

- KHQR payments via Bakong  
- Backend polls for payment status asynchronously  
- WebSocket pushes status updates to frontend  

![Payment Flow](https://res.cloudinary.com/dgnugtetz/image/upload/v1772225500/77ac8d57-e500-4de1-b502-8a7eb0bbfe0a.png)

---

## Security Checklist (Based on OWASP Top 10)

- [x] Broken Access Control  
- [x] Cryptographic Failures  
- [x] Injection  
- [x] Insecure Design  
- [x] Security Misconfiguration  
- [x] Vulnerable and Outdated Components  
- [x] Identification and Authentication Failures  
- [x] Software and Data Integrity Failures  
- [x] Security Logging and Monitoring Failures  
- [x] Server-Side Request Forgery (SSRF)  

---

## Folder Structure

```text
domrov-lms-automation/
├── apps/
│   ├── backend/
│   │   ├── user/                  # Identity and user management (NestJS)
│   │   ├── academic/              # Classes, submissions, resources (NestJS)
│   │   ├── payment/               # Wallet, credits, payments (NestJS)
│   │   ├── evaluation/            # Evaluation orchestration (NestJS)
│   │   └── code-execution-go/     # Sandboxed code execution (Go)
│   ├── react-client/              # Main React/Vite frontend
│   └── admin/                     # Admin React/Vite frontend
├── contracts/                     # HTTP and RabbitMQ contracts
├── infra/                         # Gateway and RabbitMQ configuration
├── docker-compose.yml             # Local five-service stack
├── .github/workflows/             # Active validation, image builds, frontend deploy
├── docs/                          # Platform notes and historical migration material
├── terraform/                     # Deprecated infrastructure and deployment scripts
└── uat/                           # Historical test reports and scenarios
```

See [folder.md](folder.md) for the workflow inventory.

## CI/CD status

- `ci-cd-pipeline.yml` retains S3 deployment for both frontends. Pushes to `main`
  deploy only changed frontend directories. Manual runs on `main` deploy both;
  runs selected from another branch or tag skip all jobs.
- `user.yml`, `academic-service.yml`, and `payment-service.yml` retain their
  existing service validation and Docker builds.
- `microservice-images.yml` validates and builds any of the five services;
  publishing is optional and images use the Git SHA. This workflow does not deploy.
- `summary.yml` summarizes opened issues with GitHub Models.
- The monolithic backend deployment, Python evaluator CI, and StarCoder review
  workflow have been retired.

A new CI/CD pipeline and K3s deployment are future work. Current workflow checks
and known dependencies are recorded in [the cleanup report](docs/ci-cleanup.md).

---

## Additional Documentation

- [Project Website](https://domrov.app)
- [Admin Panel](https://admin.domrov.app)  
- [Open API Documentation](https://api.domrov.app/api-docs)  

---

## Contact Us

- Email: cpf.cadt@gmail.com  

---

## Terms of Use

---

## Microservice ownership and operational goals

User owns identity and authentication; Academic owns classes, assignments,
resources, and submissions; Payment owns wallets, credits, and payments;
Evaluation owns AI evaluation state and feedback; Go Code Execution owns
sandboxed execution runs. Each service uses its corresponding database listed
above. REST serves client requests; RabbitMQ connects asynchronous work.

Production rollout still requires verified service contracts, idempotent payment
operations, health checks, retries, independent image delivery, and integration
checks for login, submission, evaluation, execution, and payment. These are
acceptance goals, not a claim that a production deployment is complete.

[TASK.md](TASK.md) and [the original boundary map](docs/microservices-boundary-map.md)
are deprecated migration plans retained for historical context. Use the current
source tree, root Compose file, service READMEs, and contracts when planning the
next block. No new pipeline or K3s manifests are introduced by this cleanup.

This project is open source.
