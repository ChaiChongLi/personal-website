# Personal Website — Claude Code Guide

Personal dashboard with stocks, news, todos, tools, and a resume builder.
Stack: Angular 19 + Node.js/Express + MySQL 8 + Docker Compose.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Angular 19 (standalone components, signals), Angular Material 19, RxJS 7 |
| Backend | Node.js 20, Express 4, mysql2/promise |
| Database | MySQL 8.0 |
| Auth | JWT (access token in localStorage, refresh token in httpOnly cookie) |
| Deploy | Docker Compose (MySQL + Node backend + Nginx/Angular frontend) |
| PDF gen | Puppeteer + Chromium (backend Dockerfile installs Chromium) |

---

## Common Commands

### Docker (primary workflow)
```bash
# Build and start all services
docker-compose up -d --build

# View logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Restart a single service
docker-compose restart backend

# Rebuild and restart backend only
docker-compose up -d --build backend

# IMPORTANT: CSS/SCSS changes require --no-cache to bypass Docker layer cache
docker-compose build --no-cache frontend && docker-compose up -d frontend

# Stop everything
docker-compose down

# Wipe and reset database
docker-compose down -v && docker-compose up -d --build
```

### Local development (no Docker)
```bash
# Backend
cd backend && npm run dev        # nodemon, auto-reload

# Frontend
cd frontend && npm start         # ng serve on :4200
```

---

## Project Structure

```
personal-website/
├── docker-compose.yml
├── nginx/nginx.conf             # Reverse proxy: /api → backend:3000, SPA fallback
├── database/init.sql            # Schema + default admin user
├── backend/
│   ├── .env                     # Runtime env (not committed)
│   ├── .env.example             # Template
│   └── src/
│       ├── server.js            # Entry point
│       ├── app.js               # Express app, middleware stack
│       ├── config/
│       │   ├── database.js      # MySQL pool (10 connections)
│       │   └── security.js      # JWT, bcrypt, cookie, CORS, rate limit config
│       ├── middleware/
│       │   ├── auth.middleware.js        # verifyAccessToken — attaches req.user
│       │   ├── rateLimiter.middleware.js # General + auth-specific limiters
│       │   └── errorHandler.middleware.js
│       ├── routes/
│       │   ├── index.js         # Mounts all routers under /api/v1
│       │   ├── auth.routes.js
│       │   ├── stock.routes.js
│       │   ├── news.routes.js
│       │   ├── todo.routes.js
│       │   ├── tool.routes.js
│       │   └── resume.routes.js
│       ├── controllers/         # One per feature
│       ├── models/              # Raw SQL queries (parameterized)
│       ├── services/
│       │   ├── googleFinance.service.js  # Google Finance HTML scraping
│       │   ├── news.service.js           # Google News RSS
│       │   ├── pdf.service.js            # Puppeteer PDF generation
│       │   └── token.service.js          # JWT create/verify
│       └── utils/
│           ├── response.helper.js        # sendSuccess / sendError
│           └── logger.js                 # Winston
└── frontend/src/app/
    ├── app.routes.ts            # Root routing
    ├── core/
    │   ├── guards/auth.guard.ts         # Checks localStorage access_token
    │   ├── interceptors/auth.interceptor.ts  # Injects Bearer, handles 401 refresh
    │   └── services/            # auth, stock, news, todo, tool, resume
    ├── layout/
    │   ├── main-layout/         # Shell: mat-sidenav + router-outlet
    │   └── sidebar/             # Navigation links
    └── features/                # Lazy-loaded page components
        ├── auth/login, auth/register
        ├── dashboard/
        ├── stocks/              # + add-stock-dialog/
        ├── news/
        ├── todo/
        ├── tools/
        └── resume/
```

---

## API Conventions

### Base URL
- Dev: `http://localhost:3000/api/v1`
- Prod: `/api/v1` (proxied by Nginx)

### All responses wrap data in an envelope
```json
{ "success": true, "statusCode": 200, "message": "...", "data": <payload> }
```
**Always unwrap `response.data` in the frontend service.** This is the most common source of blank UI.

### Paginated endpoints use `sendPaginated`
```json
{ "success": true, "data": [...], "pagination": { "total": n, "page": 1, "limit": 20 } }
```
`getTodos` uses this — unwrap `response.data` (array is at root of `data`, not nested).

### Route prefix
All routes are under `/api/v1/`. Double-check this before assuming a URL.

---

## Auth Pattern

```
Login → { data: { accessToken, refreshToken } }
                ↓
localStorage: 'access_token' = accessToken
httpOnly cookie: 'refresh_token' = refreshToken
                ↓
Interceptor adds: Authorization: Bearer <access_token>
                ↓
On 401: interceptor calls POST /api/v1/auth/refresh (uses cookie)
        → gets new accessToken → retries original request
```

**Guard** (`auth.guard.ts`): reads `localStorage.getItem('access_token')` — no async, no timing issue.

**Backend middleware** (`verifyAccessToken`): extracts Bearer token, attaches decoded payload to `req.user`.
Always null-guard: `const userId = req.user?.id; if (!userId) return sendError(res, 'Unauthorized', 401);`

---

## Database Schema

### users
`id` (UUID), `username`, `email`, `password_hash` (bcrypt 12 rounds), `refresh_token`, timestamps

### stock_watchlist
`id`, `user_id` (FK), `symbol` (e.g., MAYBANK), `market` (exchange code: KLSE/NASDAQ/NYSE/SGX/HKEX), `company_name`, `notes`, timestamps
- Unique constraint: `(user_id, symbol, market)`

### todo_items
`id`, `user_id`, `title`, `description`, `priority` (low/medium/high), `status` (pending/in_progress/done), `due_date`, `is_deleted` (TINYINT, soft delete), timestamps
- DB uses `in_progress` (underscore); frontend uses `in-progress` (hyphen) — convert in service layer

### tools
`id`, `user_id`, `name`, `github_url`, `description`, `tags` (JSON array), `category`, `is_favorite` (BOOL), timestamps

### resume_profiles
`id`, `user_id`, `profile_name`, `personal_info` (JSON), `work_experience` (JSON), `education` (JSON), `skills` (JSON), `certifications` (JSON), `projects` (JSON), `summary`, timestamps

### news_cache
`id`, `symbol`, `headline`, `source`, `url`, `published_at`, `snippet`, `created_at`
- No background scheduler — cache is populated on-demand when user clicks Fetch
- `getCachedNews()` checks for entries within last 30 minutes before hitting Google
- On fetch failure, falls back to stale cache entries rather than erroring

---

## UI Standards

### Form Fields
All `mat-form-field` components must use `floatLabel="always"` so labels are always pinned above the field — never floating inside as a placeholder. This is the project standard across all dialogs and forms.

```html
<mat-form-field appearance="outline" floatLabel="always">
  <mat-label>Field Name</mat-label>
  <input matInput placeholder="..." />
</mat-form-field>
```

---

## Key Patterns

### Backend: Field naming
- DB columns: `snake_case` (`company_name`, `due_date`, `created_at`)
- Response JSON from backend: mixed (DB rows returned as-is unless mapped)
- Always map snake_case → camelCase in the frontend service's `mapX()` helper

### Frontend: Subscription cleanup
All HTTP subscriptions use `takeUntilDestroyed`:
```typescript
private readonly destroyRef = inject(DestroyRef);

this.service.getData()
  .pipe(takeUntilDestroyed(this.destroyRef))
  .subscribe({ next: ..., error: ... });
```

### Frontend: Signal-based state
```typescript
data = signal<MyType[]>([]);
isLoading = signal(false);

// Immutable update
this.items.update(items => items.map(i => i.id === id ? { ...i, ...changes } : i));
```

### Backend: Response helpers
```javascript
const { sendSuccess, sendError } = require('../utils/response.helper');

return sendSuccess(res, data, 'Message', 200);
return sendError(res, 'Error message', 400);
```

### Todo status conversion
```
DB / backend:  pending | in_progress | done
Frontend:      pending | in-progress | done
```
`toDbStatus('in-progress')` → `'in_progress'`
`mapTodo(raw)`: `raw.status === 'in_progress' ? 'in-progress' : raw.status`

### Soft delete (todos)
- `DELETE` endpoint sets `is_deleted = 1`, never hard-deletes
- All SELECT queries must include `AND is_deleted = 0`
- INSERT must explicitly set `is_deleted = 0`

### Resume form → backend field mapping
```
profileName          → profile_name
fullName/email/...   → nested personal_info JSON object
professionalSummary  → summary
workExperience       → work_experience
```

### Stock prices (Google Finance)
- URL: `https://www.google.com/finance/quote/{SYMBOL}:{EXCHANGE}`
- Scrapes HTML attributes: `data-last-price`, `data-last-normal-market-change`, `data-last-normal-market-change-percent`
- Legacy market codes (MY/US/SG) auto-mapped to exchange codes in `googleFinance.service.js`
- Volume, 52-week high/low, market cap are NOT available via scraping → always null

### News module (Google News RSS)
- Backend `GET /api/v1/news/` — fetches news for all stocks in user's watchlist (click-to-fetch, no auto-load)
- Backend `GET /api/v1/news/:symbol` — fetches news for a single symbol
- Response shape: `{ data: { totalSymbols: n, symbols: { AAPL: [...], TSLA: [...] } } }`
- Each article: `{ headline, source, url, published_at, snippet }`
- Frontend converts symbols object to `Map<string, NewsItem[]>` in the component
- **Route order matters**: `DELETE /cache` must be defined before `GET /:symbol` in news.routes.js
- News is click-to-fetch only — `ngOnInit` does NOT call `loadNews()`, only the Fetch button does

### Tools/Bookmarks module
- Categories: GitHub, Tools, Article, Useful URL (hardcoded in frontend, no backend categories endpoint)
- `AddToolDialogComponent` handles both add and edit mode via `@Optional() @Inject(MAT_DIALOG_DATA)`
- `ToolDetailDialogComponent` is read-only view; closes with `'edit'` string to trigger edit dialog
- Field mapping: `githubUrl` → `github_url` in POST/PATCH payload; `mapTool()` in service maps back
- `toggleFavorite` uses `PATCH /tools/:id/favorite` (not POST, not toggle-favorite)

---

## Environment Variables (Backend)

See `backend/.env.example` for full list. Key variables:

```env
PORT=3000
NODE_ENV=development
DB_HOST=mysql               # 'mysql' in Docker, 'localhost' for local dev
DB_NAME=personal_website
DB_USER=appuser
DB_PASSWORD=AppPass@123
JWT_ACCESS_SECRET=<min 32 chars — CHANGE IN PRODUCTION>
JWT_REFRESH_SECRET=<min 32 chars — CHANGE IN PRODUCTION>
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:4200
```

---

## Default Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@personal.com | Admin@123 |

Password rules: 8+ chars, uppercase, lowercase, number, special character.

---

## Common Pitfalls

1. **Blank UI / no data**: Almost always the envelope — check you're reading `response.data`, not `response` directly.

2. **Todo status mismatch**: DB stores `in_progress`, frontend uses `in-progress`. Run through `toDbStatus()` / `mapTodo()`.

3. **DB host in Docker**: Use `DB_HOST=mysql` (service name), not `localhost`.

4. **Stock prices null**: Google Finance scraping can fail silently. UI guards all `.toFixed()` calls with null checks — keep this pattern.

5. **Auth interceptor loop**: The refresh call itself must NOT be intercepted again. The interceptor skips requests to `/auth/refresh`.

6. **mat-dialog dark theme**: Use `panelClass: 'add-stock-dialog'` in `dialog.open()`. Target `.mdc-dialog__surface` (not `.mat-mdc-dialog-container` alone) in `::ng-deep` SCSS.

7. **`sendPaginated` vs `sendSuccess`**: `getTodos` uses `sendPaginated` — response is `{ success, data: [...], pagination }`. The array is `response.data`, not `response.data.data`.

8. **Angular Material `background` vs `background-color`**: MDC components set `background: rgba(0,0,0,0)` (shorthand) on list items and options. Overriding with `background-color` does NOT work — must use `background` shorthand in CSS overrides.

9. **Docker layer cache for CSS**: `docker-compose up -d --build` reuses cached layers and may NOT pick up `.scss` changes. Always use `docker-compose build --no-cache frontend && docker-compose up -d frontend` for style changes. Use `ng serve` locally for instant hot-reload during styling work.

10. **Winston logger two-arg pattern**: `logger.error('msg:', error.message)` silently drops the second arg — Winston's printf format only uses the `message` field. Always use template literals: `` logger.error(`msg: ${error.message}`) ``.

---

## Future Planning

### Background News Fetching
Currently news is **click-to-fetch** — the user manually triggers a fetch from the News page. The planned upgrade is an automatic background process that pre-fetches news on a schedule so the page always shows fresh results without waiting.

**Planned approach:**
- Use `node-cron` (already a common Node.js scheduler) inside the backend
- Schedule runs every 30 minutes: fetch news for **all users' watchlist stocks**
- Store results in the existing `news_cache` table (no schema change needed)
- Frontend continues to call `GET /api/v1/news/` — it just gets pre-cached results instantly

**Implementation steps when ready:**
1. `npm install node-cron` in backend
2. Create `backend/src/jobs/newsFetcher.job.js`:
   ```javascript
   const cron = require('node-cron');
   const stockModel = require('../models/stock.model');
   const newsService = require('../services/news.service');

   // Run every 30 minutes
   cron.schedule('*/30 * * * *', async () => {
     // Get all unique symbols across all users
     // Call newsService.fetchNewsBySymbol() for each
     // Results auto-saved to news_cache
   });
   ```
3. Import and start the job in `backend/src/server.js`
4. Add a `last_fetched_at` column to `news_cache` or a separate `news_fetch_log` table so the frontend can show "Last updated X minutes ago"
5. Frontend: remove the Fetch button (or keep as manual override), show last-updated timestamp

**Considerations:**
- Rate limiting — if many users with many stocks, batch requests with delay between symbols
- Only fetch for symbols that have been active recently (avoid fetching stale/unused watchlists)
- Graceful shutdown — ensure cron job stops cleanly when container restarts (`SIGTERM` handler)
