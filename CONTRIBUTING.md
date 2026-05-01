# Contributing to Hotel & Restaurant Review Management System

## Development Workflow

### Quick Start (Full System)
```bash
python launcher.py
```
The launcher automatically installs missing dependencies, creates virtual environments, starts all 5 services, and opens browsers.

### Component Setup

| Component | Language | Setup Command | Run |
|-----------|----------|---------------|-----|
| Backend | Python | `cd backend; pip install -r requirements.txt; playwright install chromium` | `uvicorn app.main:app --reload --host 0.0.0.0 --port 8000` |
| Frontend | Node.js | `cd frontend; npm install` | `npm run dev` |
| Admin Frontend | Node.js | `cd admin-frontend; npm install` | `npm run dev` |
| Scraper Engine | Python | `cd microservices/scraper_engine; pip install -r requirements.txt; playwright install chromium` | `python api/main.py` |
| Embedding Service | Docker/Python | `cd microservices/embedding-service; docker build -t embedding-service .` | `docker run -d -p 8001:8000 -v chroma_data:/data/chroma --name embedding_service embedding-service` |

### Environment Setup
Copy `.env.example` to `.env` in each component directory before first run. See the relevant component README for required variables.

---

## Branch Naming

- `feature/<name>` — New features
- `fix/<name>` — Bug fixes
- `docs/<name>` — Documentation changes
- `refactor/<name>` — Code restructuring

## Commit Message Format

Use [Conventional Commits](https://www.conventionalcommits.org/):
```
feat: add competitor tracking dashboard
fix: resolve pagination crash on Google scraper
docs: update ER diagrams for groups module
refactor: extract sync logic into shared service
```

---

## Code Style

### Python (Backend, Scraper Engine, Embedding Service)
- Follow **PEP 8** guidelines
- Use **type hints** throughout
- Naming: `snake_case` for variables/functions, `PascalCase` for classes
- Linting: Flake8 (config in `.flake8`)

### TypeScript/React (Frontend, Admin Frontend)
- **Strict mode** enabled in `tsconfig.json`
- **Functional components** with hooks (React 19)
- Naming: `PascalCase` for components, `camelCase` for variables/hooks/functions
- **Named exports** preferred, default exports for pages
- Linting: ESLint (`npm run lint`)

---

## Architecture Rules

### Backend (Domain-Driven Design)
1. **Module boundaries are strict.** `modules.admin` must not import from `modules.reviews` unless explicitly designed as an abstraction. Use Pydantic schema passing if needed.
2. **Do not recreate database utilities** in modules. Rely on `app.core.db_utils` for pyodbc and `app.database.session` for ORM.
3. **Dual DB Layer**: ORM/SQLAlchemy for structured User/Auth/Roles/Groups. Raw PyODBC (`db_utils`) for high-performance extraction, analytical dashboards, and reviews.
4. **No global mutable state** outside controlled singletons (SQLAlchemy `engine`, `Base`).
5. **Use `log_activity`** for all system-significant events.

### Scraper Engine
1. **No ad-hoc dependencies.** Stick to `playwright`, `httpx`, and standard library.
2. **Schema philosophy**: Use the Base-to-Subtype pattern (`Review` ↔ platform-specific detail tables).
3. **The Pull Model**: The engine notifies backend on completion; backend pulls data. Do not push review data directly into backend tables.
4. **Synchronous Playwright**: Use `playwright.sync_api`. FastAPI handles async HTTP while Playwright runs on `ThreadPoolExecutor`.
5. **Always use UUIDs** for source IDs — never integers.

---

## Testing

### Python Tests
| Component | Command |
|-----------|---------|
| Backend | `$env:PYTHONPATH = ".;$env:PYTHONPATH"; pytest tests/` |
| Scraper Engine | `cd microservices/scraper_engine; pytest tests/` |
| Embedding Service | `cd microservices/embedding-service; venv\Scripts\python.exe -m pytest tests/ -v` |

### Frontend Tests
| Component | Command |
|-----------|---------|
| Frontend | `cd frontend; npm test` (watch: `npm run test:watch`) |
| Admin Frontend | `cd admin-frontend; npm test` |

### Pre-Commit Checklist
- [ ] All tests pass (`pytest` / `npm test`)
- [ ] Lint passes (`npm run lint` / flake8)
- [ ] Type check passes (`npm run build` / `npx tsc --noEmit`)
- [ ] Relevant READMEs updated
- [ ] ER/UML diagrams updated if schema changed
- [ ] Module analysis docs updated if architecture changed
- [ ] Launcher can start all 5 services (`python launcher.py`)

---

## Documentation

### When to Update What
| Change | Update |
|--------|--------|
| New API endpoint | `backend/docs/api_qwen.md`, `API_CALLS.md` (if consumed by frontend) |
| DB schema change | `backend/docs/database_schema_analysis.md`, ER diagrams in `docs/ER diagrams/` |
| New module/service | Create `module_analysis.md` in `app/modules/<name>/docs/`, update root README |
| Architecture change | Architecture diagrams in `docs/Architecture diagrams/`, `docs/README.md` index |
| Environment variable change | `.env.example` files, README env sections |
| New scraper platform | `microservices/scraper_engine/platforms/<name>/README.md`, scraper engine README |

### Diagram Tools
- **Mermaid.js** — Markdown-native (preferred for sequence/flow diagrams)
- **Draw.io** / **Lucidchart** — For ER diagrams and architecture
- Export as high-resolution PNG or SVG with descriptive kebab-case names

---

## Git Workflow

1. Create a feature branch from `dev`
2. Make changes, commit with Conventional Commits format
3. Push and open a Pull Request against `dev`
4. CI pipeline runs tests automatically; **failed tests block deployment**
5. Merge to `dev` triggers automatic deployment to production servers

---

## Hard Rules

- **Never hardcode configuration.** Use `.env` files.
- **Never commit secrets** (API keys, passwords, `.env` files).
- **Never skip hooks** (`--no-verify`, `--no-gpg-sign`) without explicit approval.
- **Never force-push to `dev` or `main`**.
