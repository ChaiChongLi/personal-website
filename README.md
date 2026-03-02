# 🏠 Personal Dashboard Website

A full-stack personal productivity dashboard with stock watchlist, news aggregation, to-do management, tool bookmarks, and resume generation.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Angular 19 (standalone components, signals) |
| UI Library | Angular Material (dark theme) |
| Backend | Node.js 20 + Express 4 |
| Database | MySQL 8 |
| Container | Docker + Docker Compose |
| Web Server | Nginx 1.25 (reverse proxy) |
| Auth | JWT (access + refresh tokens, httpOnly cookies) |

---

## Features

1. **🔐 Secure Login** — JWT-based auth with access (15min) + refresh (7d) tokens
2. **📈 Stock Watchlist** — Malaysia (Bursa), US, Singapore markets via Yahoo Finance; auto-refresh every 60s
3. **📰 News Feed** — Google News RSS per watched stock; cached 30 minutes
4. **✅ To-Do List** — Kanban board with priorities, due dates, status tracking
5. **🔧 Tools Bookmarks** — GitHub URL bookmarks with descriptions, tags, categories, favorites
6. **📄 Resume Generator** — Multi-section form → PDF or Word (.docx) download

---

## Quick Start (Docker — recommended)

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running

### 1. Clone / download this project
```bash
# If using git:
git clone <your-repo-url> personal-website
cd personal-website
```

### 2. Configure environment
```bash
# The .env file is pre-configured for Docker.
# For production use, change these values in backend/.env:
nano backend/.env
```

Key variables to change for security:
```env
JWT_ACCESS_SECRET=<random 64-char string>
JWT_REFRESH_SECRET=<random 64-char string>
```

Generate random secrets:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 3. Start all services
```bash
docker-compose up -d --build
```

This builds and starts:
- **MySQL** on port 3306 (localhost only)
- **Backend API** on port 3000 (localhost only)
- **Frontend** on port 80 (accessible in browser)

### 4. Open the app
```
http://localhost
```

**Default login:**
- Username: `admin`
- Password: `Admin@123`

> ⚠️ Change the password after first login!

### Useful Docker commands
```bash
# View logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f backend

# Stop all services
docker-compose down

# Stop and delete data (fresh start)
docker-compose down -v

# Rebuild after code changes
docker-compose up -d --build
```

---

## Local Development (without Docker)

### Prerequisites
- Node.js 20+
- MySQL 8
- Angular CLI 19: `npm install -g @angular/cli@19`

### Database setup
```bash
# Create database
mysql -u root -p < database/init.sql
```

### Backend
```bash
cd backend
cp .env.example .env
# Edit .env with your local MySQL credentials
npm install
npm run dev     # Starts on http://localhost:3000
```

### Frontend
```bash
cd frontend
npm install
npm start       # Starts on http://localhost:4200
```

---

## Project Structure

```
personal-website/
├── docker-compose.yml          # Orchestrates all 3 services
├── nginx/
│   ├── nginx.conf              # Reverse proxy + security headers
│   └── proxy_params.conf       # Shared proxy settings
├── database/
│   └── init.sql                # MySQL schema + seed data
├── backend/                    # Node.js Express API
│   ├── Dockerfile
│   ├── .env                    # Environment config (gitignored)
│   ├── .env.example
│   └── src/
│       ├── app.js              # Express app + middleware stack
│       ├── server.js           # Entry point + graceful shutdown
│       ├── config/
│       │   ├── database.js     # MySQL connection pool
│       │   └── security.js     # Security constants
│       ├── middleware/
│       │   ├── auth.middleware.js
│       │   ├── rateLimiter.middleware.js
│       │   └── errorHandler.middleware.js
│       ├── controllers/        # Request handlers
│       ├── routes/             # Express routers
│       ├── services/           # Business logic
│       │   ├── yahooFinance.service.js
│       │   ├── news.service.js
│       │   ├── pdf.service.js
│       │   └── token.service.js
│       ├── models/             # Database queries
│       └── utils/
│           ├── logger.js       # Winston logger
│           └── response.helper.js
└── frontend/                   # Angular 19 SPA
    ├── Dockerfile
    ├── src/
    │   ├── app/
    │   │   ├── core/
    │   │   │   ├── guards/     # auth.guard.ts
    │   │   │   ├── interceptors/ # auth.interceptor.ts
    │   │   │   └── services/   # auth, stock, news, todo, tool, resume
    │   │   ├── layout/
    │   │   │   ├── main-layout/  # Sidenav shell
    │   │   │   └── sidebar/      # Navigation menu
    │   │   └── features/
    │   │       ├── auth/login/
    │   │       ├── dashboard/
    │   │       ├── stocks/
    │   │       ├── news/
    │   │       ├── todo/
    │   │       ├── tools/
    │   │       └── resume/
    │   └── styles.scss         # Global dark theme
    └── environments/
        ├── environment.ts      # Development config
        └── environment.prod.ts # Production config
```

---

## API Reference

Base URL: `http://localhost:3000/api/v1`

| Method | Path | Description |
|--------|------|-------------|
| POST | /auth/login | Login, get access token |
| POST | /auth/register | Register new user |
| POST | /auth/refresh | Refresh access token |
| POST | /auth/logout | Logout, clear tokens |
| GET | /auth/profile | Get current user |
| GET | /stocks | Get watchlist with live prices |
| POST | /stocks | Add stock to watchlist |
| DELETE | /stocks/:id | Remove stock |
| GET | /stocks/refresh | Force refresh prices |
| GET | /news/watchlist | News for all watchlist stocks |
| GET | /news/:symbol | News for specific symbol |
| GET | /todos | List todos (filterable) |
| POST | /todos | Create todo |
| PUT | /todos/:id | Update todo |
| DELETE | /todos/:id | Delete todo |
| GET | /todos/stats | Todo statistics |
| GET | /tools | List tools/bookmarks |
| POST | /tools | Add tool |
| PUT | /tools/:id | Update tool |
| DELETE | /tools/:id | Delete tool |
| PATCH | /tools/:id/favorite | Toggle favorite |
| GET | /resume | List resume profiles |
| POST | /resume | Create resume profile |
| PUT | /resume/:id | Update resume profile |
| GET | /resume/:id/download/pdf | Download as PDF |
| GET | /resume/:id/download/word | Download as Word |

---

## Security Implementation

| Feature | Implementation |
|---------|---------------|
| Password hashing | pt (12 rounds) |
| Access tokens | JWT, 15-minute expiry |
| Refresh tokens | JWT, 7-day expiry, httpOnly cookie |
| Brute force protection | express-rate-limit (5 login attempts/15min) |
| XSS prevention | Helmet CSP headers + Angular's built-in sanitization |
| SQL injection | Parameterized queries (mysql2) |
| Clickjacking | X-Frame-Options: DENY |
| MIME sniffing | X-Content-Type-Options: nosniff |
| HTTP parameter pollution | hpp middleware |
| Request size limit | 10KB body limit |
| CORS | Whitelist only frontend origin |

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 3000 | Backend server port |
| DB_HOST | mysql | MySQL host (Docker service name) |
| DB_NAME | personal_website | Database name |
| DB_USER | appuser | Database user |
| DB_PASSWORD | AppPass@123 | Database password |
| JWT_ACCESS_SECRET | — | **Change this!** 64+ random chars |
| JWT_REFRESH_SECRET | — | **Change this!** 64+ random chars |
| JWT_ACCESS_EXPIRES_IN | 15m | Access token lifetime |
| JWT_REFRESH_EXPIRES_IN | 7d | Refresh token lifetime |
| CORS_ORIGIN | http://localhost | Allowed frontend origin |

---

## Troubleshooting

**MySQL fails to start:**
```bash
docker-compose down -v    # Remove old volume
docker-compose up -d --build  # Fresh start
```

**Backend can't connect to MySQL:**
- Check DB_HOST=mysql (not localhost) in Docker environment
- Ensure MySQL healthcheck passes: `docker-compose ps`

**Frontend 502 Bad Gateway:**
- Backend may still be starting up
- Check: `docker-compose logs backend`

**Stock prices not loading:**
- Yahoo Finance may rate-limit requests
- Try the Refresh button, or wait a minute

**PDF generation fails:**
- Puppeteer needs Chromium; verify it's installed in container
- Check backend logs: `docker-compose logs backend`
