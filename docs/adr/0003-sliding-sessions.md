# ADR 0003: Sliding Sessions for Stateless Session Management

## Status
Accepted

## Context
With the migration to secure cookie-based JWT authentication (ADR 0002), tokens are stateless and expire after a preconfigured duration (60 minutes). 

If a user remains highly active within the application (e.g., replying to reviews, configuring data sources, analyzing sentiment), having their session abruptly terminate exactly 60 minutes after their login creates a highly frustrating user experience.

We needed a session extension model that meets the following criteria:
1. **Seamless User Experience**: Active users should have their sessions automatically extended as long as they are actively interacting with the application.
2. **Zero Frontend Overhead**: No complex background timeout loops, heartbeats, or interceptor configurations should be needed in the client-side code.
3. **Stateless Efficiency**: The solution must not introduce any database overhead or require persistent server-side state (such as checking session tables in Redis/SQL on every single request).

## Decision
We implemented **Sliding Sessions (Approach 1)** via an HTTP middleware on the FastAPI backend:

1. **Lightweight HTTP Middleware**: Registered an `@app.middleware("http")` middleware in [main.py](file:///e:/L2%20Project/hotel-and-restaurant-review-management-system/backend/app/main.py) to intercept incoming requests.
2. **Graceful Remaining Duration Check**:
   - The middleware inspects the `access_token` cookie.
   - It attempts to decode the token statelessly using `jose.jwt.decode` and the server's `JWT_SECRET_KEY` and `JWT_ALGORITHM`.
   - If the token is valid, it retrieves the `exp` claim and subtracts the current timestamp (`time.time()`).
3. **Threshold Rotation**:
   - If the token has **5 minutes or less** remaining of its valid lifetime (but is still valid), the middleware automatically signs and issues a brand-new access token with refreshed expiration.
   - The middleware sets the new token in a secure, `HttpOnly`, `SameSite=Lax` cookie in the outgoing response.
   - If the token is already expired or invalid, the middleware ignores it, allowing the standard routing/dependencies to return a `401 Unauthorized` and prompt the user to log in again.
4. **No Frontend Modifications**: The browser handles cookie updates automatically under the hood, completely transparently to the frontend app.

## Consequences
- **Excellent UX**: Sessions stay active indefinitely while the user is actively working, ending only after 60 minutes of complete inactivity.
- **O(1) CPU/DB Overhead**: No database calls are required to renew the token. Calculations are computed in memory, keeping latency extremely low.
- **Improved Security**: Refreshing tokens statelessly with a short threshold limits the exposure window of any individual token without disrupting active users.
- **Robust Verification**: Tested with a complete suite of integration tests covering no token, invalid token, expired token, far-from-expiry, and near-expiry renewal flows.
