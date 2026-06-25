# Internal Authentication & Security Architecture

This document serves as the official operational runbook and architectural overview for the service-to-service internal authentication ecosystem. It was generated following the completion of the Phase 2 Authentication Migration.

---

## 1. Architecture Overview

### Receiver-Owned API Keys
The system employs a **Receiver-Owned API Key Architecture**. Instead of sharing a single global secret across the entire ecosystem, each microservice independently issues, owns, and verifies its own API keys. 

When **Service A** needs to communicate with **Service B**, Service A must be explicitly provided with one of Service B's valid keys.

### Trust Model
The trust model operates on a principle of isolated verification.
- **The Caller** is responsible for transmitting the key securely via the `X-Internal-API-Key` HTTP header.
- **The Receiver** is responsible for validating that key against its local configuration before processing the request.

### Why this architecture was chosen:
1. **Compromise Isolation:** If the Scraper Engine's API key is exposed, an attacker cannot use it to query the Embedding Service or the Main Backend.
2. **Zero-Downtime Rotation:** Because each service maintains a list of valid keys (`BACKEND_API_KEYS`, etc.), a new key can be distributed before the old key is revoked.
3. **Least Privilege:** Services only possess the credentials for the specific services they are authorized to contact.

---

## 2. Authentication Flow

Every internal service-to-service communication is secured via the `X-Internal-API-Key` header.

* **Backend → Scraper Engine:**
  * **Caller:** Main Backend (`source_service.py`)
  * **Receiver:** Scraper Engine (`POST /api/{platform}/scrape`)
  * **Credential Sent:** `SCRAPER_API_KEY`
  * **Validation:** Scraper Engine (`core.security.verify_internal_request`)

* **Scraper Engine → Backend:**
  * **Caller:** Scraper Engine (`api/main.py`, `core/utils.py`)
  * **Receiver:** Main Backend (`GET /stuck-tasks`, `POST /{id}/sync-status`)
  * **Credential Sent:** `BACKEND_API_KEY`
  * **Validation:** Main Backend (`auth.utils.internal_auth.verify_internal_api_key`)

* **Backend → Embedding Service:**
  * **Caller:** Main Backend (`embedding_client.py`, `reply_generation_service.py`, `rules_service.py`)
  * **Receiver:** Embedding Service (all endpoints except `/health`)
  * **Credential Sent:** `EMBEDDING_API_KEY`
  * **Validation:** Embedding Service (`app.main.verify_api_key`)

* **Admin Frontend → Embedding Service:**
  * **Caller:** Admin Dashboard (`embeddingService.ts`)
  * **Receiver:** Embedding Service
  * **Credential Sent:** `VITE_EMBEDDING_API_KEY`
  * **Validation:** Embedding Service (`app.main.verify_api_key`)

---

## 3. Configuration Guide

| Environment Variable | Owning Service (Verifies) | Consuming Service (Sends) | Purpose |
|----------------------|---------------------------|---------------------------|---------|
| `BACKEND_API_KEYS` | Main Backend | N/A | Comma-separated list of valid keys accepted by the backend. |
| `BACKEND_API_KEY` | N/A | Scraper Engine | The specific key the Scraper sends to the Backend. |
| `SCRAPER_API_KEYS` | Scraper Engine | N/A | Comma-separated list of valid keys accepted by the Scraper. |
| `SCRAPER_API_KEY` | N/A | Main Backend | The specific key the Backend sends to the Scraper. |
| `EMBEDDING_API_KEYS` | Embedding Service | N/A | Comma-separated list of valid keys accepted by the Embedding service. |
| `EMBEDDING_API_KEY` | N/A | Main Backend | The specific key the Backend sends to the Embedding Service. |
| `VITE_EMBEDDING_API_KEY`| N/A | Admin Frontend | The specific key the Admin Frontend sends to the Embedding Service. |
| `INTERNAL_API_KEY` | All (Fallback) | All (Fallback) | Legacy shared secret. Retained for backward compatibility. |

---

## 4. Key Rotation Guide

Because the receivers accept a comma-separated list of keys, rotation can be performed with **zero downtime**.

1. **Add the new key to the Receiver:** Update the Receiver's `.env` file to include both the old and new keys (e.g., `EMBEDDING_API_KEYS=old_key_123,new_key_456`).
2. **Deploy the Receiver:** Restart the Receiver service. It will now accept both keys.
3. **Update the Caller:** Update the Caller's `.env` file to send only the new key (e.g., `EMBEDDING_API_KEY=new_key_456`).
4. **Deploy the Caller:** Restart the Caller service. It is now using the new key.
5. **Remove the old key from the Receiver:** Update the Receiver's `.env` file to contain only the new key (`EMBEDDING_API_KEYS=new_key_456`).
6. **Deploy the Receiver:** Restart the Receiver service. The old key is now fully revoked.

---

## 5. Failure Scenarios

| Scenario | System Behavior | Mitigation |
|----------|-----------------|------------|
| **Wrong Key** | Receiver rejects request with `401 Unauthorized`. | Ensure the Caller's configured key matches one of the Receiver's accepted keys. |
| **Missing Key** | Receiver rejects request with `401 Unauthorized`. | Ensure the Caller is configured to inject the `X-Internal-API-Key` header. |
| **Expired Key** | If a key was revoked (removed from array), Receiver returns `401 Unauthorized`. | Issue a valid key to the Caller and restart. |
| **Service Unavailable** | Caller receives timeout or connection error (e.g., `httpx.ConnectError`). | Callers implement standard `max_retries` (e.g., Scraper's 12-attempt loop). |
| **Mixed Deployment** | One service updated, others not. | Services transparently fallback to `INTERNAL_API_KEY`. No downtime occurs. |
| **Rollback** | A deployed service is reverted to an older build. | Because the backward compatibility layer remains, the ecosystem continues functioning seamlessly. |

---

## 6. Security Considerations

* **`hmac.compare_digest`:** All API key comparisons are performed using cryptographic timing-attack resistant comparisons. This prevents attackers from measuring string-comparison execution times to guess characters of the API key.
* **Structured Logging:** Authentication failures emit standard JSON-parsable attributes (`event=internal_auth_failure reason=invalid_api_key`).
* **Masked Secrets:** Failed API keys are severely truncated before logging (`***ecret`). A complete API key is never written to disk or transmitted to logging aggregators.
* **Least Privilege:** Services cannot spoof one another. The Scraper Engine possesses no credentials capable of accessing the Embedding Service.

---

## 7. Operational Runbook

### How to Deploy
1. Update the respective `.env` file (or CI/CD secret manager).
2. Restart the microservice (e.g., `docker compose restart backend`).
3. Services initialize configuration at boot; the new keys take effect instantly.

### How to Verify
1. Monitor the logs for `event=internal_auth_failure`. 
2. A completely silent log output indicates successful, authenticated internal communication.

### How to Troubleshoot
1. Identify the failing Caller via the Receiver's logs (check the `remote_ip` or `path`).
2. Verify the Caller's `.env` matches one of the values in the Receiver's `_KEYS` array.
3. If necessary, inject the legacy `INTERNAL_API_KEY` into both to rapidly restore connectivity.

### How to Rollback
1. Simply revert the deployment environment variables. 
2. The code strictly supports fallback to `INTERNAL_API_KEY`, rendering rollback risk-free.

---

## 8. Future Improvements

As the ecosystem scales, the following enhancements should be considered:

* **Request IDs (Correlation IDs):** Inject an `X-Request-ID` at the API Gateway to trace a single user action entirely through the Backend, Scraper, and Embedding logs. Appropriate when tracing bugs becomes difficult due to high traffic volume.
* **Service Identity Headers:** Combine `X-Internal-API-Key` with an `X-Service-Name` header to explicitly validate that a Caller is who they claim to be. Appropriate if internal routing becomes complex.
* **OpenTelemetry:** Migrate from standard string logging to distributed OTel tracing for full observability. Appropriate when migrating to Kubernetes.
* **mTLS (Mutual TLS):** Deprecate API keys entirely in favor of cryptographic certificate verification between microservices. Appropriate if adopting a service mesh (e.g., Istio or Linkerd).
* **OAuth Client Credentials:** Implement standard OAuth2 Machine-to-Machine (M2M) flows. Appropriate if third-party services or external vendors need automated access to internal APIs.
