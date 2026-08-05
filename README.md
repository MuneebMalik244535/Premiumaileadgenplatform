# 🚀 Premium AI B2B Lead Generator SaaS (Production-Grade Architecture)

> **Forward Deployed Engineering Portfolio Project**  
> An enterprise-grade, distributed B2B Lead Scraping & AI Qualification SaaS platform built with FastAPI, React (Vite + Tailwind), PostgreSQL, Redis, Celery, Playwright, and Gemini AI.

---

## 🏗️ System Architecture

```mermaid
graph TD
    Client[Browser / User] --> Gateway[Nginx Reverse Proxy / Gateway :80]
    
    subgraph Frontend Tier
        Gateway -->|/| UI[React + Vite SPA]
    end
    
    subgraph Security & API Tier
        Gateway -->|/api/*| API[FastAPI Core Server :8000]
        Gateway -->|/api/ws| WS[WebSocket Live Logger]
        API -->|JWT Authentication| AuthModule[Bcrypt Auth & JWT]
    end

    subgraph Asynchronous Execution Tier
        API -->|Enqueue Scrape Task| Redis[(Redis Broker :6379)]
        Redis --> Worker1[Celery Worker 1 (Playwright/SerpAPI)]
        Redis --> Worker2[Celery Worker 2 (Gemini AI Scoring)]
        Worker1 & Worker2 -->|Publish Progress| PubSub[Redis PubSub]
        PubSub --> WS
    end

    subgraph Persistence Tier
        API -->|Read/Write Leads| DB[(PostgreSQL 15 Database)]
        Worker1 & Worker2 -->|Store Results| DB
    end
```

---

## ✨ Key Enterprise Features

- **⚡ Distributed Scraping Pipeline:** Asynchronous background job processing via Celery and Redis to handle multi-step web scraping without blocking HTTP request threads.
- **🧠 AI Lead Qualification:** Powered by Google Gemini AI models for multi-parameter lead scoring, website summary enrichment, and qualification metrics.
- **📡 Real-Time WebSocket Telemetry:** Live pub/sub task monitoring streaming granular execution logs directly to the user interface.
- **🛡️ Enterprise Security:** Bcrypt hashed password storage, JWT Bearer Token validation across all protected API routes, and CORS origin whitelisting.
- **🐳 5-Container Docker Stack:** Production-ready containerization featuring PostgreSQL 15, Redis 7, FastAPI, Celery, React SPA, and Nginx Gateway.

---

## 🛠️ Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | React 18, Vite 6, TypeScript, Tailwind CSS, Lucide React, Motion |
| **Backend API** | Python 3.11, FastAPI, Uvicorn, SQLAlchemy ORM, Pydantic |
| **Auth & Security** | OAuth2 Bearer, PyJWT, Passlib (Bcrypt) |
| **Task Queue** | Celery, Redis 7 (Broker & Result Backend) |
| **Data Engine** | PostgreSQL 15, Alembic |
| **Scraper Engine** | Playwright, BeautifulSoup4, SerpAPI |
| **AI Scoring** | Google Gemini Generative AI SDK |
| **Container & Proxy** | Docker Compose, Nginx (API Gateway & Static Server) |

---

## 🚀 Quickstart (Docker Production Deployment)

### 1. Prerequisites
- [Docker Engine](https://docs.docker.com/engine/install/) & `docker compose`
- Git

### 2. Environment Setup
Copy the environment template and configure your API keys:
```bash
cp backend/.env.example backend/.env
```

Set your secret keys inside `backend/.env`:
```env
GEMINI_API_KEY=your_gemini_api_key
SERPAPI_API_KEY=your_serpapi_api_key
JWT_SECRET_KEY=your_random_secure_secret_key
ADMIN_PASSWORD=your_secure_admin_password
```

### 3. Launch 5-Container Stack
Start the entire platform (Postgres, Redis, FastAPI, Celery, Frontend, Nginx) with a single command:
```bash
docker compose up -d --build
```

Access the application in your browser:
- **Web Interface & Dashboard:** [http://localhost](http://localhost)
- **API Health Check:** [http://localhost/healthz](http://localhost/healthz)
- **Interactive OpenAPI Docs:** [http://localhost:8000/docs](http://localhost:8000/docs)

---

## 📡 API Endpoint Reference

| Method | Endpoint | Auth Required | Description |
| :--- | :--- | :---: | :--- |
| `GET` | `/api/healthz` | ❌ No | System healthcheck (DB & API status) |
| `POST` | `/api/auth/login` | ❌ No | Authenticate admin user & receive JWT |
| `GET` | `/api/leads` | ✅ Yes | Query & filter saved B2B leads |
| `POST` | `/api/scrape` | ✅ Yes | Dispatch async lead scraping task |
| `GET` | `/api/tasks/{task_id}`| ✅ Yes | Fetch background task execution status |
| `WS` | `/api/ws` | ❌ No | WebSocket live task log streaming channel |
| `GET` | `/api/reports` | ✅ Yes | List generated PDF reports |
| `POST` | `/api/reports/generate`| ✅ Yes| Trigger PDF summary report creation |

---

## 💻 Local Development (Without Docker)

### Backend
```bash
cd backend
python -m venv venv
# Windows:
.\venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

---

## 🛡️ License & Attributions
Distributed under the MIT License. See `LICENSE` for details.
