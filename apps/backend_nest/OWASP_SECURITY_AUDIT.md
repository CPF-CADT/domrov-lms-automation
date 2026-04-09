# OWASP Top 10 Security Audit Report

**Project**: Domrov LMS-Automation Backend (NestJS)  
**Audit Date**: March 8, 2026  
**Auditor**: Automated Security Review  
**Scope**: NestJS Backend API Security Assessment  
**Context**: Year 3 Student Development Project

---

## Executive Summary

This security audit evaluates the Domrov LMS-Automation backend against the OWASP Top 10 security risks. The audit focuses on real exploitable vulnerabilities relevant to a development-stage student project, prioritizing high and medium risk issues.

**Overall Assessment**: The codebase demonstrates solid security fundamentals with proper authentication, authorization guards, input validation, and secure password hashing. A few configuration issues require attention before production deployment.

---

## OWASP Top 10 Findings

---

### 1. Broken Access Control

**Status**: ⚠️ MINOR ISSUES FOUND  
**Severity**: Medium

#### Finding 1.1: CORS Configuration Too Permissive

**Location**: [main.ts](src/main.ts#L21-L25)

```typescript
app.enableCors({
  origin: '*',
  credentials: true,
  exposedHeaders: ['Content-Disposition'],
});
```

**Problem**: `origin: '*'` with `credentials: true` is contradictory and browsers will block this. However, if credentials weren't needed, this would allow any origin to make requests.

**Attack Scenario**:

```http
# An attacker hosts a malicious site that makes requests to your API
# If CORS is too permissive, they can steal user data via cross-origin requests

GET /users/me HTTP/1.1
Host: your-api.com
Origin: https://evil-site.com
Cookie: refresh_token=<stolen_cookie>
```

**Mitigation**:

```typescript
// main.ts - configure allowed origins specifically
app.enableCors({
  origin: [
    'http://localhost:3000',
    'https://your-production-domain.com',
    process.env.FRONTEND_URL,
  ].filter(Boolean),
  credentials: true,
  exposedHeaders: ['Content-Disposition'],
});
```

#### Finding 1.2: Good Access Control Implementation ✅

The codebase implements a robust guard system:

- `JwtAuthGuard` - Authentication guard
- `RolesGuard` - Role-based access control
- `ClassMemberGuard`, `ClassInstructorGuard`, `ClassOwnerGuard` - Resource-level authorization
- `AssessmentMemberGuard`, `SubmissionMemberGuard` - Fine-grained access control

These guards properly verify user permissions before allowing actions on resources.

---

### 2. Cryptographic Failures

**Status**: ⚠️ MINOR ISSUES FOUND  
**Severity**: Medium

#### Finding 2.1: Session Secret Has Default Fallback

**Location**: [main.ts](src/main.ts#L29-L35)

```typescript
app.use(
  session({
    secret: process.env.DOMROV_SECRET_KEY || 'default_secret', // ⚠️ Issue here
    resave: false,
    saveUninitialized: false,
    cookie: { secure: true, httpOnly: true, sameSite: 'strict' },
  }),
);
```

**Problem**: If `DOMROV_SECRET_KEY` environment variable is not set, sessions will use a weak, predictable `'default_secret'` value.

**Attack Scenario**:

```http
# If default_secret is used, attacker can forge session cookies
# by signing them with the known default secret

POST /auth/login HTTP/1.1
Content-Type: application/json
Cookie: connect.sid=<forged_session_with_known_secret>

# Attacker could hijack sessions or escalate privileges
```

**Mitigation**:

```typescript
// main.ts - throw error if secret is not configured
const sessionSecret = process.env.DOMROV_SECRET_KEY;
if (!sessionSecret) {
  throw new Error('DOMROV_SECRET_KEY environment variable is required');
}

app.use(
  session({
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: { secure: true, httpOnly: true, sameSite: 'strict' },
  }),
);
```

#### Finding 2.2: Good Password Hashing ✅

**Location**: [Encryption.ts](src/libs/utils/Encryption.ts)

```typescript
static async hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
}
```

Bcrypt with 10 rounds is appropriate for a development project. The implementation properly uses:

- Bcrypt for password hashing (industry standard)
- AES-256-GCM for API key encryption with proper IV handling
- Refresh tokens stored in HTTP-only cookies

---

### 3. Injection

**Status**: ✅ NO OBVIOUS VULNERABILITY DETECTED  
**Severity**: Low

#### Finding 3.1: SQL Injection Prevention ✅

The codebase uses TypeORM with parameterized queries:

**Example from [payment-flow.service.ts](src/modules/wallet/payment-flow.service.ts#L329)**:

```typescript
const user = await this.paymentRepo.query(
  'SELECT * FROM "user" WHERE id = $1',
  [userId], // ✅ Parameterized query - safe
);
```

**Example from [user.service.ts](src/modules/user/user.service.ts#L116)**:

```typescript
async findByQuery(query: Record<string, any>): Promise<User[]> {
  const { id, email, firstName, lastName, phoneNumber } = query
  const where: any = {}
  if (email) where.email = ILike(`%${email}%`)  // ✅ TypeORM handles escaping
  // ...
  return this.userRepository.find({ where, select: [...] })
}
```

#### Finding 3.2: Input Validation Enabled ✅

**Location**: [main.ts](src/main.ts#L36-L41)

```typescript
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true, // ✅ Strips unknown properties
    forbidNonWhitelisted: true, // ✅ Rejects unknown properties
    transform: true, // ✅ Transforms input to DTO types
    forbidUnknownValues: true, // ✅ Extra validation
  }),
);
```

This configuration provides strong protection against injection attacks.

---

### 4. Insecure Design

**Status**: ⚠️ INFORMATIONAL  
**Severity**: Low

#### Finding 4.1: Rate Limiting Implementation ✅

The project implements rate limiting on sensitive endpoints:

**Location**: [rate-limiter.service.ts](src/services/rate-limiter.service.ts)

```typescript
private readonly limit = 5; // max requests
private readonly ttl = 60; // seconds
```

Applied to:

- `/auth/sign-up`
- `/auth/login`
- `/auth/refresh-token`
- `/auth/verify-email`

#### Recommendation: Extend Rate Limiting

Consider extending rate limiting to other sensitive endpoints:

- Password change
- Email verification resend
- File uploads

```typescript
// Add rate limiter to password change endpoint
@Post('change-password')
@UseGuards(JwtAuthGuard, RateLimiterGuard)  // Add RateLimiterGuard
async changePassword(...) { ... }
```

---

### 5. Security Misconfiguration

**Status**: ⚠️ MINOR ISSUES FOUND  
**Severity**: Medium

#### Finding 5.1: Swagger/OpenAPI Exposed

**Location**: [main.ts](src/main.ts#L43-L56)

```typescript
const document = SwaggerModule.createDocument(app, config);
SwaggerModule.setup('api-docs', app, document, {
  swaggerOptions: { persistAuthorization: true, withCredentials: true },
});
```

**Context**: For a development project, this is acceptable. However, for production:

**Mitigation for Production**:

```typescript
// Only expose Swagger in development
if (process.env.NODE_ENV !== 'production') {
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document, {...});
}
```

#### Finding 5.2: Helmet.js Enabled ✅

```typescript
app.use(helmet());
```

Good security practice - sets various HTTP headers for protection.

#### Finding 5.3: Database Synchronize Enabled

**Location**: [data-source.ts](src/database/data-source.ts#L40)

```typescript
export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  url: process.env.POSTGRES_URL,
  synchronize: true, // ⚠️ Should be false in production
  // ...
};
```

**Risk**: `synchronize: true` automatically modifies database schema. This can cause data loss in production.

**Mitigation**:

```typescript
export const dataSourceOptions: DataSourceOptions = {
  // ...
  synchronize: process.env.NODE_ENV !== 'production',
  // Or simply: synchronize: false, and use migrations
};
```

---

### 6. Vulnerable and Outdated Components

**Status**: ✅ NO OBVIOUS VULNERABILITY DETECTED  
**Severity**: Informational

Based on the `package.json`, the project uses modern, actively maintained packages:

| Package        | Version | Status     |
| -------------- | ------- | ---------- |
| @nestjs/common | ^11.0.1 | ✅ Current |
| bcrypt         | ^6.0.0  | ✅ Current |
| passport-jwt   | ^4.0.1  | ✅ Current |
| helmet         | ^8.1.0  | ✅ Current |
| typeorm        | ^0.3.28 | ✅ Current |

**Recommendation**: Regularly run `npm audit` to check for known vulnerabilities.

```bash
npm audit
npm audit fix
```

---

### 7. Identification and Authentication Failures

**Status**: ✅ GOOD IMPLEMENTATION  
**Severity**: Low

#### Finding 7.1: Strong Password Policy ✅

**Location**: [auth.service.ts](src/modules/auth/auth.service.ts#L58-L72)

```typescript
if (signUpUserDto.password.length < 8)
  throw new BadRequestException('Password must be at least 8 characters');
if (!/[A-Z]/.test(signUpUserDto.password))
  throw new BadRequestException('Password must contain uppercase');
if (!/[0-9]/.test(signUpUserDto.password))
  throw new BadRequestException('Password must contain number/digit');
if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(signUpUserDto.password))
  throw new BadRequestException('Password must contain special character');
```

Good password policy enforcement.

#### Finding 7.2: Secure Token Handling ✅

**Location**: [auth.controller.ts](src/modules/auth/auth.controller.ts#L161-L168)

```typescript
res.cookie('refresh_token', refreshToken, {
  httpOnly: true, // ✅ Not accessible via JavaScript
  secure: true, // ✅ HTTPS only
  sameSite: 'strict', // ✅ CSRF protection
  maxAge: 7 * 24 * 60 * 60 * 1000,
});
```

Excellent cookie security configuration.

#### Finding 7.3: JWT Strategy Validation ✅

**Location**: [access-jwt-strategy.ts](src/modules/auth/stragies/access-jwt-strategy.ts)

```typescript
super({
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: secret,
  ignoreExpiration: false, // ✅ Tokens must not be expired
});
```

Proper JWT validation with expiration checking.

---

### 8. Software and Data Integrity Failures

**Status**: ✅ NO OBVIOUS VULNERABILITY DETECTED  
**Severity**: Informational

The project:

- Uses TypeORM entities with proper validation
- Implements DTO-based input validation
- Uses class-validator decorators

**Recommendation**: Consider implementing integrity checks for sensitive data:

```typescript
// Example: Add checksum verification for payment data
interface PaymentData {
  amount: number;
  packageId: number;
  checksum: string; // HMAC of amount + packageId
}
```

---

### 9. Security Logging and Monitoring Failures

**Status**: ✅ GOOD IMPLEMENTATION  
**Severity**: Informational

#### Finding 9.1: Sentry Integration ✅

**Location**: [instrument.ts](src/common/logging/instrument.ts)

```typescript
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  sendDefaultPii: true,
});
```

**Location**: [main.ts](src/main.ts#L39-L42)

```typescript
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 1.0,
});
```

#### Recommendation: Add Security Event Logging

Consider logging security-relevant events:

```typescript
// Example: Log failed login attempts
async login(login: LoginUserDTO): Promise<LoginResponseDto> {
  try {
    // ... login logic
  } catch (error) {
    this.logger.warn(`Failed login attempt for email: ${login.email}`, {
      ip: request.ip,
      userAgent: request.headers['user-agent'],
    });
    throw error;
  }
}
```

---

### 10. Server-Side Request Forgery (SSRF)

**Status**: ✅ NO OBVIOUS VULNERABILITY DETECTED  
**Severity**: Informational

The external API calls in the codebase are controlled:

1. **Bakong Payment API**: Uses environment-configured URL
2. **Cloudinary**: Uses SDK with API credentials
3. **R2/S3**: Uses SDK with configured endpoints

No user-controlled URLs are used in server-side requests.

**Good Practice Example from [payment.service.ts](src/services/payment.service.ts)**:

```typescript
// API URL is from environment, not user input
this.apiUrl = this.config.get<string>('BAKONG_API') || '';
```
---

## Summary Table

| OWASP Category                 | Status         | Severity      | Notes                               |
| ------------------------------ | -------------- | ------------- | ----------------------------------- |
| A01: Broken Access Control     | ⚠️ Minor Issue | Medium        | CORS configuration too permissive   |
| A02: Cryptographic Failures    | ⚠️ Minor Issue | Medium        | Session secret has default fallback |
| A03: Injection                 | ✅ Secure      | Low           | TypeORM with parameterized queries  |
| A04: Insecure Design           | ✅ Acceptable  | Low           | Rate limiting implemented           |
| A05: Security Misconfiguration | ⚠️ Minor Issue | Medium        | Swagger exposed, DB sync enabled    |
| A06: Vulnerable Components     | ✅ Current     | Informational | Dependencies up to date             |
| A07: Auth Failures             | ✅ Secure      | Low           | Strong auth implementation          |
| A08: Data Integrity            | ✅ Acceptable  | Informational | DTO validation in place             |
| A09: Logging Failures          | ✅ Acceptable  | Informational | Sentry integration present          |
| A10: SSRF                      | ✅ Secure      | Informational | No user-controlled URLs             |

---

## Priority Recommendations

### High Priority (Fix Before Production)

1. **Remove Default Session Secret**
   - File: `src/main.ts`
   - Action: Throw error if `DOMROV_SECRET_KEY` is not set

2. **Configure CORS Properly**
   - File: `src/main.ts`
   - Action: Specify allowed origins explicitly

3. **Disable Database Synchronize in Production**
   - File: `src/database/data-source.ts`
   - Action: Set `synchronize: false` for production

### Medium Priority (Recommended Improvements)

4. **Disable Swagger in Production**
   - Gate Swagger setup behind environment check

5. **Extend Rate Limiting**
   - Apply to password change and file upload endpoints

6. **Add Security Event Logging**
   - Log failed authentication attempts
   - Log privilege escalation attempts

---

## Conclusion

The Domrov LMS-Automation backend demonstrates solid security fundamentals appropriate for a Year 3 student project. The authentication system, authorization guards, and input validation are well-implemented. The identified issues are configuration-level concerns that should be addressed before production deployment but do not represent immediate exploitable vulnerabilities in a development environment.

**Overall Security Score**: 7.5/10 (Good for Development Stage)

---

_Report generated on March 8, 2026_
