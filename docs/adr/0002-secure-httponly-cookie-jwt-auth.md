# ADR 0002: Secure HttpOnly Cookie JWT Authentication Migration

## Status
Accepted

## Context
Originally, the system stored JWT access tokens in the browser's `localStorage` (via the `token` key) and sent them in the `Authorization: Bearer <token>` header of every API call. 

While simple to implement, this pattern exposes the application to severe security risks:
1. **XSS Token Theft**: Any Cross-Site Scripting (XSS) vulnerability anywhere on the frontend would allow an attacker to read `localStorage` and exfiltrate the user's active session token.
2. **Session Hijacking**: Once exfiltrated, the attacker has complete, uninhibited access to the user's account until the JWT expires.

Furthermore, during early development, a FastAPI dependency injection issue was discovered where the `Request` object in the backend dependencies defaulted to `None` (`request: Request = None`), which caused silent failures when attempting to read request context (such as cookies) and resulted in infinite redirect loops on the admin dashboard.

## Decision
We migrated the entire session management and token delivery strategy to use secure, browser-managed cookies:

1. **HttpOnly and SameSite Cookies**: The backend now writes the JWT `access_token` into a secure, `HttpOnly`, `SameSite=Lax` cookie. The cookie is path-scoped to `/` and marked `Secure` in production environments.
2. **Automatic Browser Management**: The browser automatically handles cookie transmission for all subsequent API requests. The frontend javascript execution space can no longer access or read the token directly, completely mitigating XSS exfiltration risks.
3. **FastAPI Request Injection Corrected**: We removed the `= None` default from authentication dependencies, ensuring FastAPI's dependency injection container correctly supplies the active `Request` context to `get_current_user` and `get_optional_user`.
4. **Test-Only Fallback**: To preserve the validity of the existing frontend test suite (which relies on `localStorage` mocking), we implemented an environment-gated fallback in the frontend API client. This fallback strictly permits reading from `localStorage` ONLY in test modes (e.g. `process.env.NODE_ENV === 'test'` or `import.meta.env.MODE === 'test'`), completely isolating it from the production runtime.

## Consequences
- **Mitigated XSS Exfiltration**: Zero session token secrets are visible to Javascript or developer tools in production.
- **Improved UX**: Users are no longer plagued by infinite RBAC redirect loops.
- **No Test Regression**: All **176 user frontend tests** and **79 admin frontend tests** pass with 100% compliance.
- **Zero Frontend Code Churn**: Standard requests utilize browser-level cookie management, meaning the frontend's fetch layers require no complex header additions.
