# Fusion Hotel Group MRBS

Meeting Room Booking System built on [FastAPI full-stack template](https://github.com/fastapi/full-stack-fastapi-template).

## Local development (no Docker)

### Prerequisites

- Python 3.10+ with [uv](https://docs.astral.sh/uv/)
- [Bun](https://bun.sh)
- PostgreSQL running locally

### Quick start (Windows)

Double-click **`start-dev.bat`** to run backend + frontend.

| File | Mô tả |
|---|---|
| `start-dev.bat` | Mở backend + frontend (2 cửa sổ) |
| `start-backend.bat` | Chỉ backend |
| `start-frontend.bat` | Chỉ frontend |
| `setup.bat` | Cài deps lần đầu |
| `setup-db.bat` | Migration + seed data |

### Manual

Edit `.env` in project root with your PostgreSQL credentials:

```dotenv
POSTGRES_SERVER=localhost
POSTGRES_PORT=5432
POSTGRES_DB=app
POSTGRES_USER=postgres
POSTGRES_PASSWORD=<your-password>
```

Create the database:

```powershell
psql -U postgres -h localhost -c "CREATE DATABASE app;"
```

### 2. Backend

```powershell
cd backend
uv sync
uv run alembic upgrade head
uv run python app/initial_data.py
uv run fastapi dev app/main.py
```

API: http://localhost:8000/docs

### 3. Frontend

```powershell
cd D:\SACAI\05_Projects\Mrbs
bun install
bun run dev
```

App: http://localhost:5173

**Login:** `admin@example.com` / `changethis`

## Features (MVP)

- Day view schedule grid (08:30–17:30, 30-min slots)
- Rooms: Glass Room (10), Board Room (20) — seeded
- Create / edit / cancel bookings
- Internal vs External color coding
- Conflict detection (409 if room already booked)
- Admin: manage rooms at `/rooms`

## Production (GitHub → Portainer)

See **[PORTAINER.md](./PORTAINER.md)** for step-by-step deploy.

1. Push to `https://github.com/bktrung2003/mrbs` — GitHub Actions builds images to GHCR
2. Portainer stack uses `compose.portainer.yml`
3. Set `VITE_API_URL` repo variable before first frontend build
