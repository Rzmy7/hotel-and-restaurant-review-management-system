# ADR 0001: Transition to Receiver-Owned API Keys

## Status
Accepted

## Context
The system initially relied on a single global secret (`INTERNAL_API_KEY`) shared across the Main Backend, Scraper Engine, Embedding Service, and Admin Frontend. If any single service or configuration file was compromised, an attacker would gain lateral movement capabilities across all internal APIs within the ecosystem. 

Furthermore, rotating a single global API key required coordinating simultaneous downtime across all microservices to prevent inter-service connection drops during the rotation window.

## Decision
We decided to implement a **Receiver-Owned API Key Architecture**:
1. Each microservice independently issues and validates its own API keys.
2. A Caller service must explicitly send the targeted Receiver's key in the `X-Internal-API-Key` HTTP header.
3. The Receiver validates the header against a locally configured array of accepted keys (`SERVICE_API_KEYS`).
4. Key comparison is performed using `hmac.compare_digest` to prevent timing attacks.
5. The legacy `INTERNAL_API_KEY` is retained in the accepted keys list as a fallback to ensure backward compatibility and zero-downtime deployment.

## Consequences

### Positive
* **Compromise Isolation:** Exposing one service's `.env` configuration no longer exposes credentials valid for the entire ecosystem.
* **Zero-Downtime Rotation:** The Receiver accepts an array of keys. A new key can be added to the Receiver, then updated on the Caller, and finally the old key can be removed from the Receiver without dropping any requests.
* **Granular Revocation:** Keys can be revoked per Caller/Receiver pair.

### Negative
* **Configuration Overhead:** Increases the number of `.env` variables from 1 global key to a distinct set of sending/receiving keys per service.
* **Dependency Expansion:** Requires explicitly mapping `Depends(verify_internal_request)` on all private endpoints across FastAPI applications.

## Alternatives Considered
* **OAuth2 Machine-to-Machine (Client Credentials):** Too complex and heavy for the current scale, requiring an external IdP or internal OAuth server.
* **Mutual TLS (mTLS):** Requires a service mesh (e.g., Istio) or extensive PKI management, which adds operational overhead exceeding current team capacity.

## Migration Strategy
Phase 1: Configure services to accept both the new specific keys and the legacy key.
Phase 2A: Update all Callers to send the new specific keys.
Phase 2B: Enforce `Depends()` auth blocks on all Receiver internal endpoints.
Phase 3 (Future): Fully deprecate the legacy key once environments strictly define the new keys.
