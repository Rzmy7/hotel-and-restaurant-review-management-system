# 📚 System Architecture & Engineering Documentation

Welcome to the central technical documentation repository for the **Hotel and Restaurant Review Management & Analysis System**. This directory contains architectural blueprints, Architecture Decision Records (ADRs), security guidelines, and entity-relationship models.

---

## 🗺️ Documentation Directory Map

```
docs/
├── adr/                                # Architecture Decision Records (ADRs)
│   ├── 0001-receiver-owned-api-keys.md  # Policy for external LLM key management
│   ├── 0002-secure-httponly-cookie-jwt-auth.md # Cookie-based token isolation against XSS
│   └── 0003-sliding-sessions.md        # Session lifetime and sliding window refresh model
├── security/                           # Application Security & Threat Mitigation
│   └── authentication_guide.md         # Comprehensive auth & RBAC implementation guide
├── ER diagrams/                        # Relational Database Schema & Data Dictionaries
├── Architecture diagrams/              # Microservice Interaction & Sequence Flowcharts
└── technical_debt_backlog.md           # Engineering enhancements and backlog tracking
```

---

## 🏛️ Architecture Decision Records (ADRs)

| ADR Reference | Decision Summary & Context |
|---|---|
| **[ADR 0001: Receiver-Owned API Keys](adr/0001-receiver-owned-api-keys.md)** | Standardizes system-level API key management with tenant-specific overrides for external LLM providers (OpenAI, Qwen, DeepSeek, and other OpenAI-compatible providers). |
| **[ADR 0002: HttpOnly Cookie JWT Authentication](adr/0002-secure-httponly-cookie-jwt-auth.md)** | Transitioned from `localStorage` bearer tokens to encrypted `HttpOnly`, `SameSite=Strict` cookies to completely eliminate token exfiltration via client-side XSS. |
| **[ADR 0003: Sliding Sessions](adr/0003-sliding-sessions.md)** | Implements a sliding window session renewal mechanism that refreshes JWT claims on active requests while enforcing maximum hard session timeouts. |

---

## 🔐 Security & Threat Mitigation Guidelines

Detailed security practices are documented in **[`docs/security/authentication_guide.md`](security/authentication_guide.md)**:
- **Authentication Flow**: Credential validation, Bcrypt password hashing (work factor 12), and JWT claim issuance.
- **Inter-Service Security**: Secret key tokens (`X-Internal-API-Key`) protecting communication between FastAPI backend, Playwright scraper engine, and ChromaDB vector microservice.
- **Role-Based Access Control (RBAC)**: Fine-grained middleware authorization for `PLATFORM_ADMIN`, `GROUP_ADMIN`, `GROUP_MANAGER`, and `GROUP_MEMBER`.

---

## 🗄️ Relational Database & Entity Relationship Model

The central persistence engine is Microsoft SQL Server managed through SQLAlchemy 2.0. Core entity domains include:
1. **Tenants & Users**: `organizations`, `users`, `roles`, `groups`, `group_memberships`.
2. **Sources & Reviews**: `sources`, `reviews`, `review_aspects`, `sentiment_scores`, `review_replies`.
3. **AI & Vector Mapping**: `hotel_rules`, `vector_sync_logs`, `llm_gateway_configs`.
4. **Operations & Auditing**: `audit_logs`, `broadcasts`, `system_alerts`, `scheduler_jobs`.
