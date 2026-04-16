# Enterprise Hardening Implementation

> **Stack**: React 18 + TypeScript 5.9 | Supabase PostgreSQL (RLS) | Docker container isolation | CloudContext provider for multi-tenancy

This document summarizes the enterprise-grade security and governance controls implemented for Unison Tasks.

## Overview

Based on enterprise readiness audit recommendations, the following categories have been addressed:

| Category | Before | After (Phase 1) | After (Phase 2) | Key Changes |
|----------|--------|------------------|------------------|-------------|
| Runtime Preview Foundation | 7.5/10 | 9/10 | 9.5/10 | Auth, quotas, fail-closed middleware |
| Platform Surface Area | 6/10 | 7/10 | 8.5/10 | Shared middleware, input validation, rate limiting |
| Enterprise Governance | 2/10 | 6/10 | 7/10 | Audit logs, RBAC, session monitoring |
| Security Posture | 3/10 | 7/10 | 8.5/10 | Headers, WAF, sanitizer overhaul, CORS hardening |
| Operational Readiness | 4/10 | 7/10 | 8/10 | Error handling, request tracing, lockout protection |

---

## A) Preview Runtime Enterprise Hardening

### 1. AuthN/AuthZ on Every Endpoint

**File:** `preview-service/gateway/src/middleware/auth.ts`

- JWT token validation via Supabase Auth
- API key authentication as alternative
- Session ownership verification (users can only access their own sessions)
- Permission checking via `requirePermission()` middleware
- All session endpoints now require authentication

```typescript
// Example protected route
sessionRouter.post('/start', 
  requirePermission('preview:create'),
  checkQuota('session'),
  async (req: AuthenticatedRequest, res) => { ... }
);
```

### 2. Per-Session Resource Quotas

**Database:** `supabase/migrations/20260208000000_enterprise_hardening.sql`

- `organization_quotas` table with plan-based limits
- `organization_usage` table for real-time tracking
- `check_org_quota()` function for quota validation

**Gateway:** `preview-service/gateway/src/middleware/auth.ts`

- `checkQuota()` middleware enforces limits before session creation
- Quotas checked: concurrent sessions, daily sessions, AI generations

| Plan | Concurrent Sessions | Daily Sessions | AI Generations/Month |
|------|---------------------|----------------|----------------------|
| Free | 2 | 20 | 10 |
| Pro | 10 | 100 | 500 |
| Business | 50 | 500 | Unlimited |
| Enterprise | Custom | Custom | Custom |

### 3. Container Resource Limits

**File:** `preview-service/gateway/src/services/SessionManager.ts`

Enhanced container configuration:

```typescript
HostConfig: {
  // Memory limits
  Memory: 256MB (configurable),
  MemorySwap: Same as Memory (no swap),
  MemoryReservation: 50%,
  
  // CPU limits  
  CpuPeriod: 100000,
  CpuQuota: 25000 (25% CPU),
  
  // Process limits
  PidsLimit: 64,
  
  // Security
  SecurityOpt: ['no-new-privileges:true'],
  CapDrop: ['ALL'],
  CapAdd: ['CHOWN', 'SETUID', 'SETGID'],
  
  // Disk limits (if enabled)
  StorageOpt: { size: '100MB' }
}
```

### 4. Network Egress Restrictions

**File:** `preview-service/infrastructure/security.tf`

- Restricted worker security group (optional via `enable_network_restrictions`)
- VPC endpoints for private AWS service access (ECR, S3, CloudWatch)
- Workers cannot access metadata endpoints or scan the internet

### 5. Session Cleanup & Security

**File:** `preview-service/gateway/src/services/SessionManager.ts`

- Auto-removal enabled for containers
- 30-second cleanup loop for idle sessions
- Session timeout (5 minutes default)
- Orphan reaping via container labels

---

## B) Multi-Tenancy & Governance

### 1. Org/Workspace Model

**Database:** `supabase/migrations/20250117000000_complete_schema_system.sql` (existing)

Already in place:
- `organizations` table with owner, billing, settings
- `organization_members` with roles
- `projects` linked to organizations
- `project_members` with project-level roles

### 2. RBAC Roles & Permissions

**Database:** `supabase/migrations/20260208000000_enterprise_hardening.sql`

New tables:
- `rbac_permissions` - Granular permissions (e.g., `projects:create`, `files:delete`)
- `rbac_custom_roles` - Organization-defined roles
- `rbac_user_roles` - User role assignments

Permissions seeded:
- `projects:view`, `projects:create`, `projects:edit`, `projects:delete`, `projects:publish`
- `files:view`, `files:upload`, `files:edit`, `files:delete`, `files:share`
- `preview:create`, `preview:view`, `preview:manage`
- `team:view`, `team:invite`, `team:remove`, `team:manage_roles`
- `billing:view`, `billing:manage`
- `admin:view_audit_logs`, `admin:manage_settings`, `admin:manage_security`

Helper function:
```sql
SELECT user_has_permission(user_id, org_id, 'projects:create');
```

### 3. Audit Logs

**Database:** `supabase/migrations/20260208000000_enterprise_hardening.sql`

`audit_logs` table captures:
- Who (user_id, email)
- What (action, resource_type, resource_id)
- When (created_at)
- Where (ip_address, user_agent, country_code)
- Changes (JSONB diff of old/new values)

**Frontend:** `src/services/auditLogger.ts`

```typescript
// Log an action
await auditLogger.log({
  action: 'create',
  resourceType: 'project',
  resourceId: projectId,
  resourceName: 'My Website',
});

// Query logs (admin only)
const logs = await auditLogger.queryLogs({
  organizationId: orgId,
  action: 'delete',
  startDate: lastWeek,
});
```

### 4. Security Events

**Database:** `supabase/migrations/20260208000000_enterprise_hardening.sql`

`security_events` table tracks:
- Login attempts (success/failure)
- Password changes
- MFA events
- Permission changes
- Suspicious activity
- Rate limit exceeded

Risk levels: `low`, `medium`, `high`, `critical`

### 5. Environment Separation

**Database:** `supabase/migrations/20260208000000_enterprise_hardening.sql`

`environments` table:
- `development`, `staging`, `production`
- Custom domains per environment
- Protection levels (none, password, auth, ip_whitelist)
- Version tracking

---

## C) Product Quality Gates

### 1. Error Boundaries

**File:** `src/components/RouteErrorBoundary.tsx`

- `RouteErrorBoundary` - Catches errors in route components
- `AsyncBoundary` - Combines Suspense with error handling
- Generates unique error IDs for support
- Logs errors to security events
- User-friendly error UI with retry/home actions

**File:** `src/App.tsx`

All routes wrapped with `AsyncBoundary`:
```tsx
<Route path="/dashboard" element={
  <AsyncBoundary loading={<PageLoader />}>
    <Dashboard />
  </AsyncBoundary>
} />
```

### 2. Security Headers

**Files:** `vercel.json`, `netlify.toml`

Headers applied to all responses:
- `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: SAMEORIGIN`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()`
- `Content-Security-Policy: ...` (comprehensive policy)
- `Cross-Origin-Embedder-Policy`, `Cross-Origin-Opener-Policy`, `Cross-Origin-Resource-Policy`

### 3. Observability

**Infrastructure:** `preview-service/infrastructure/security.tf`

CloudWatch alarms:
- High CPU utilization (>80%)
- High memory utilization (>80%)
- High WAF blocked requests (potential attack)
- High 5xx error rate

**Logging:**
- Structured JSON logging via pino
- Request IDs for correlation
- Security event logging

---

## D) Infrastructure Security

### 1. WAF Protection

**File:** `preview-service/infrastructure/security.tf`

AWS WAFv2 with:
- Rate limiting per IP (2000 requests/5min)
- AWS Managed Rules - Common Rule Set
- AWS Managed Rules - Known Bad Inputs
- AWS Managed Rules - SQL Injection
- AWS Managed Rules - IP Reputation List

### 2. VPC Endpoints

**File:** `preview-service/infrastructure/security.tf`

Private endpoints for:
- ECR API (container registry)
- ECR DKR (Docker pulls)
- S3 (ECR layers)
- CloudWatch Logs

### 3. Secrets Management

**File:** `preview-service/infrastructure/security.tf`

AWS Secrets Manager for:
- Supabase credentials
- API keys
- Other sensitive configuration

---

## E) Phase 2 — Middleware Hardening (April 2026)

### 1. Shared Edge Function Security Layer

**Files:** `supabase/functions/_shared/`

New shared middleware modules available to all 44+ edge functions:

| Module | File | Purpose |
|--------|------|---------|
| **CORS** | `_shared/cors.ts` | Environment-aware CORS — restricts origins in production, allows localhost in dev |
| **Auth** | `_shared/auth.ts` | JWT verification, user extraction, business ownership validation |
| **Rate Limit** | `_shared/rateLimit.ts` | In-memory IP-based rate limiting with configurable windows |
| **Validation** | `_shared/validate.ts` | Email/UUID/URL/phone validation, body size limits, field rules |
| **Response** | `_shared/response.ts` | Secure JSON responses with `X-Content-Type-Options`, `X-Frame-Options`, cache control |

### 2. Cron Endpoint Authentication (CRITICAL FIX)

**Files:** `api/cron/booking-reminders.ts`, `api/cron/crm-daily.ts`, `api/cron/crm-weekly-summary.ts`

**Before**: If `CRON_SECRET` was not configured, endpoints were accessible without authentication (fail-open).

**After**: 
- `CRON_SECRET` is **required** — returns `503` if not configured
- Method validation added (only `GET`/`POST` allowed)
- Consistent auth pattern across all 3 cron endpoints

### 3. Gateway Middleware Overhaul

**File:** `preview-service/gateway/src/server.ts`

| Change | Before | After |
|--------|--------|-------|
| **Auth bypass** | `NODE_ENV === 'development'` auto-bypassed auth | Requires explicit `BYPASS_AUTH=true` env var |
| **Quota failures** | Fail-open (request proceeds) | Fail-closed — returns `503` |
| **Rate limiting** | Global 100 req/min only | Tiered: global 100/min + session creation 10/5min |
| **Request IDs** | Generated in auth middleware only | Generated early in pipeline, attached to all logs |
| **Request logging** | Basic method/path | Includes status, duration, IP, request ID |
| **Body limits** | 10MB JSON | 5MB JSON, 1MB URL-encoded |
| **CORS** | Flat string origin | Supports comma-separated origin list |
| **Helmet** | Default config | HSTS, noSniff, referrer-policy explicitly configured |

**File:** `preview-service/gateway/src/middleware/auth.ts`

| Change | Before | After |
|--------|--------|-------|
| **Auth bypass** | Auto-bypass in NODE_ENV=development | Explicit BYPASS_AUTH flag only |
| **Quota check failure** | `next()` — fail open | `res.status(503)` — fail closed |
| **Quota middleware error** | `next()` — fail open | `res.status(503)` — fail closed |
| **Session ownership (no Supabase)** | `next()` — allow | `res.status(503)` — deny |

### 4. Site Authentication Hardening

**File:** `supabase/functions/site-auth/index.ts`

| Change | Before | After |
|--------|--------|-------|
| **JWT secret** | Hardcoded fallback: `"site-auth-default-secret-change-in-production"` | **Required** — returns `503` if missing |
| **Session duration** | 7 days | 24 hours |
| **Password policy** | Min 6 characters | Min 8 characters + at least 1 letter + 1 number |

### 5. Event Ingestion Security

**File:** `api/inngest-send.ts`

| Change | Before | After |
|--------|--------|-------|
| **Authentication** | None — open endpoint | Requires `INNGEST_SEND_API_KEY` Bearer token |
| **CORS** | Wildcard `*` | Configurable via `ALLOWED_ORIGIN` env var |
| **Error details** | Exposed to clients | Hidden in production |
| **Event list** | Exposed on invalid event | Hidden in production |
| **Production guard** | None | Returns `503` if API key not configured in production |

### 6. HTML Sanitizer Overhaul

**File:** `src/utils/htmlSanitizer.ts`

| Change | Before | After |
|--------|--------|-------|
| **Blocked attrs** | 3 event handlers (`onerror`, `onload`, `onclick`) | 40+ event handlers + `formaction`, `xlink:href` |
| **Blocked tags** | 4 tags | 10 tags (added `applet`, `base`, `link`, `meta`, `noscript`, `template`) |
| **Link safety** | None | Blocks `javascript:`, `data:`, `vbscript:` URIs; forces `rel="noopener noreferrer"` |
| **Image safety** | None | Blocks `javascript:` and `data:text/html` src |
| **CSS sanitizer** | 6 patterns | 9 patterns + CSS exfiltration blocking |
| **Size limits** | None | 512KB HTML, 256KB CSS |
| **Allowed tags** | 22 tags | 48 tags (added tables, media, SVG, semantic elements) |
| **Accessibility** | Not considered | `aria-*` and `role` attributes allowed |

### 7. Edge Function Input Validation

**Files:** `supabase/functions/intent-router/index.ts`, `supabase/functions/automation-event/index.ts`

- **intent-router**: Added body size guard (64KB), safe JSON parsing, UUID validation for `businessId`, error messages sanitized (no internal details leaked)
- **automation-event**: Added method check (POST only), safe JSON parsing, UUID validation, intent format validation (`/^[a-zA-Z0-9._-]+$/`), business existence verification
- **workflow-cron**: Added authorization check (requires `CRON_SECRET` or `SUPABASE_SERVICE_ROLE_KEY`)

### 8. Client-Side Security Middleware

**File:** `src/lib/securityMiddleware.ts`

New client-side security layer:
- **Session monitor**: Proactive token refresh before expiry, idle detection
- **Login lockout**: 5 failed attempts → 15-minute lockout (client-side rate limiting)
- **Tab monitoring**: Concurrent session detection across browser tabs
- **URL safety**: `isSafeUrl()` blocks dangerous URI schemes
- **HTML escaping**: `escapeHtml()` for dynamic string contexts

**File:** `src/lib/apiSecurity.ts`

- **Request ID injection**: Every API call gets a unique `X-Request-ID`
- **Retry with backoff**: Automatic retry for 429/502/503/504 (honors `Retry-After`)
- **Error sanitization**: `sanitizeErrorMessage()` strips SQL errors, stack traces, and internal details

### 9. Security Headers

**File:** `vercel.json`

Added missing `X-Frame-Options: SAMEORIGIN` header to global response headers.

---

## Next Steps

### Recommended Phase 3 Priorities

1. **SSO Integration**
   - SAML 2.0 / OIDC support
   - Enterprise IdP integration

2. **Compliance Documentation**
   - SOC 2 readiness checklist
   - Data processing agreements

3. **Advanced Monitoring**
   - APM integration (DataDog/New Relic)
   - Distributed tracing

4. **Backup & DR**
   - Automated database backups
   - Cross-region replication
   - Recovery runbooks

5. **Penetration Testing**
   - Third-party security audit
   - Vulnerability scanning automation
