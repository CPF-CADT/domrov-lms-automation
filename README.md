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
- [Security Checklist](#security-checklist)  
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

DOMROV uses a modern, distributed cloud architecture to deliver scalable, secure, and efficient learning management and automated evaluation.

![Cloud Infrastructure](https://res.cloudinary.com/dgnugtetz/image/upload/v1772222281/API_Gateway_2_ndiw1r.png)

### Frontend

- Next.js (React) for the main client interface  
- Nginx as a reverse proxy and API gateway  
- AWS CloudFront and Route53 for global content delivery and DNS  

### Backend Services

- Node.js (NestJS) for the API Gateway and business logic  
- Python (FastAPI/Flask) for orchestration and AI task management  
- Amazon EC2 for scalable compute resources  
- Secure gRPC protocol for backend-to-backend communication  

### Task Processing & Automation

- Redis Cloud for distributed task queue management  
- RQ (Redis Queue) Workers for asynchronous job processing  

### Data Storage

- PostgreSQL (Neon) for relational data storage  
- Cloudflare R2 for file and submission storage  
- Cloudinary for image hosting  

### AI & Evaluation

- Integration with LLM providers (OpenAI, Gemini, OpenRouter, Ollama, and custom)  

### Third-Party Integrations

- OAuth for authentication (Google, etc.)  
- Bakong for payment  

---

## Implementation

### 1. System Architecture & Internal Communication

#### gRPC-Based Distributed Architecture

The system follows a distributed architecture composed of:

- NestJS Backend – Handles business logic, APIs, authentication, and database operations  
- Python Evaluation Service – Runs a gRPC server and manages multiple worker processes  
- Redis Queue (RQ) – Handles asynchronous job scheduling  
- LLM Provider – Performs rubric-based evaluation  
- Database – Stores submissions, scores, and feedback  

#### Why gRPC Instead of REST (Internal Communication)

- Single entry point for all evaluation requests  
- Binary Protobuf messages (smaller and faster than JSON)  
- Strong schema enforcement to prevent contract mismatch  
- Built-in streaming support  
- Better concurrency handling for high-throughput evaluation  

---

### 2. Asynchronous Task Queue

- Redis Queue (RQ) for asynchronous job handling  
- Multiple Python workers for parallel evaluation  

**Workflow:**

![AI Evaluation](https://res.cloudinary.com/dgnugtetz/image/upload/v1772225042/mermaid-diagram-2026-02-28-034330_yq6xlr.png)

1. NestJS triggers evaluation via gRPC  
2. Python service enqueues the job into Redis  
3. Worker consumes the job asynchronously:  
   - Fetches submission files  
   - Estimates token size  
   - Sends request to LLM  
   - Normalizes output  
4. Result is sent back to NestJS via gRPC  
5. NestJS stores the final score and feedback in the database  

**Reliability Features:**

- Retry logic for transient failures  
- Token-limit detection before LLM call  
- Idempotent job handling  
- Failure classification (quota vs token overflow)  

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

- Tested GPT-family, Gemini, Qwen Coder, Grok  
- Grok selected for lower randomness, stable scoring, strong logical evaluation  

---

### 6. File Handling & Storage

- Cloudflare R2 for secure uploads/downloads  
- No direct backend streaming  
- Reduced server load  
- Secure access control  

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
- Redis controls single active payment session per user (3-minute TTL)  

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

```
domrov-lms-automation/
├── apps/                          # All application services
│   ├── backend_nest/              # Core Backend API (NestJS)
│   ├── react-client/              # Core UI (React)
│   ├── admin/                     # Admin Dashboard (React)
│   ├── code_eval/                 # Code Evaluation Engine (Python)
│   └── shared/                    # Shared Code & APIs
├── infrastructure/                # AWS Cloud Setup (Terraform)
├── .github/                       # CI/CD & Automation

```

---

## What Each Folder Does

### **`apps/backend_nest/`** - Backend REST API Server 
**Purpose:** Core backend serving all business logic and data  
**Tech:** NestJS, TypeScript, TypeORM, PostgreSQL, Redis  

**Modules:**
| Module | Purpose |
|--------|---------|
| `auth/` | User login, registration, JWT tokens |
| `user/` | User profiles, profile pictures, roles |
| `class/` | Class creation, student enrollment, invitations |
| `assessment/` | Assignment creation, deadlines, rubrics |
| `evaluation/` | Code evaluation workflows, AI grading |
| `submission/` | Student code submissions, versioning |
| `tasks/` | Background job scheduling (Bull MQ) |
| `wallet/` | Credits, payments, Stripe integration |
| `admin/` | User management, analytics, monitoring |
| `file/` | File uploads to S3, Cloudinary, R2 |

**External Connections:** PostgreSQL DB, Redis cache, Python eval service (gRPC), OpenAI API, AWS S3

---

### **`apps/admin/`** - Admin Dashboard 
**Purpose:** System administration and monitoring  
**Tech:** React 19, Vite, Tailwind CSS  

**Admin Features:**
- User management (create, update, delete)
- System analytics and usage metrics
- Credit package management
- Platform configuration
- Performance monitoring
- Security & access control

---

### **`apps/code_eval/`** - AI Code Evaluation Engine 
**Purpose:** Automated code execution, evaluation, and intelligent feedback generation  
**Tech:** Python, gRPC, OpenAI API, Google GenAI, Redis Queue  

**Components:**
| Component | Purpose |
|-----------|---------|
| `ai/` | LLM integration, feedback generation |
| `grpc_services/` | gRPC server for backend communication |
| `job_handler/` | Process eval jobs from Redis queue |
| `server/` | gRPC service implementation |
| `utils/` | Helpers, plagiarism detection, GitHub API |

**What It Does:**
1. Receives code from backend
2. Executes code in isolated environment
3. Checks for plagiarism (GitHub comparison)
4. Generates AI feedback using LLMs
5. Scores based on rubrics
6. Returns results to backend

---

### **`infrastructure/`** - Cloud Infrastructure ☁️
**Purpose:** Production deployment on AWS using Infrastructure-as-Code  
**Tech:** Terraform, AWS services, Cloudflare DNS  

**AWS Services Managed:**
| Service | Purpose |
|---------|---------|
| **VPC** | Virtual networking & security |
| **EC2 + ASG** | Compute instances with auto-scaling |
| **RDS PostgreSQL** | Multi-AZ relational database |
| **Application Load Balancer** | Request distribution & SSL |
| **S3** | File storage (submissions, resources) |
| **CloudFront** | CDN for static assets |
| **CloudWatch** | Logging, monitoring, alerts |
| **IAM** | Access control & security |
| **Cloudflare** | DNS, DDoS protection, SSL/TLS |

---

### **`.github/`** - CI/CD Configuration 
**Purpose:** Automated testing, building, and deployment  
**Includes:**
- GitHub Actions workflows
- Build pipelines
- Test automation
- Deployment triggers

---

## 🔌 Service Communication Flow

```
┌─────────────────────┐
│   React Apps        │
│     (Users)         │
└──────────┬──────────┘
           │ REST API
           │ WebSocket (real-time)
           ▼
┌──────────────────────────────────────┐
│  NestJS Backend (Port 3000)          │
│  ✓ REST endpoints                    │
│  ✓ Real-time notifications           │         │
│  ✓ Database: PostgreSQL + Redis      │
└──────────┬───────────────────────────┘
           │ gRPC (gRPC protocol)
           ▼
┌──────────────────────────────────────┐
│  Python Code Eval (Port 50051)       │
│  ✓ Code execution                    │
│  ✓ AI feedback generation            │
│  ✓ Result scoring                    │
│  ✓ Plagiarism checks                 │
└──────────────────────────────────────┘

📦 DATA STORAGE:
├─ PostgreSQL: User, class, assignment data
├─ Redis: Caching & job queue
├─ AWS S3: File uploads
└─ Cloudinary/R2: Images & CDN
```

---

## 🛠️ Technology Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, Vite, TypeScript, Tailwind CSS, Socket.io |
| **Backend API** | NestJS, TypeScript, TypeORM, Express.js |
| **Eval Engine** | Python 3.10+, gRPC, LLM APIs |
| **Database** | PostgreSQL 14+, Redis 6+ |
| **Cloud** | AWS (EC2, RDS, S3, ALB, CloudFront) |
| **DNS & CDN** | Cloudflare (proxy, DDoS, SSL) |
| **AI Services** | OpenAI API, Google GenAI, Ollama |
| **Storage** | AWS S3, Cloudinary, Cloudflare R2 |
| **Queue** | Bull MQ (Node.js), RQ (Python) |
| **IPC** | gRPC, REST APIs, WebSocket |
| **DevOps** | Terraform, Docker, Docker Compose |
| **CI/CD** | GitHub Actions |


## Additional Documentation

- [Project Website](https://domrov.app)
- [Admin Panel](https://admin.domrov.app)  
- [Open API Documentation](https://api.domrov.app/api-docs)  

---

## Contact Us

- Email: cpf.cadt@gmail.com  

---

## Terms of Use

This project is open source
