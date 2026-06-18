# MRBS — Meeting Room Booking System

Hệ thống đặt phòng họp và quản lý sự kiện cho **Fusion Hotel Group**.

| | |
|---|---|
| **Production** | https://mrbs2.fusionhotelgroup.com |
| **Phiên bản** | 1.0.1 — xem [CHANGELOG.md](./CHANGELOG.md) |
| **Repo** | https://github.com/bktrung2003/mrbs |

## Tính năng chính

- **Lịch phòng** — ngày / tuần / tháng; xem công khai hoặc đặt phòng sau khi đăng nhập
- **Booking** — nội bộ / khách, chờ duyệt, nhắc lịch
- **Sự kiện** — đăng ký online qua link public, check-in, khảo sát
- **Admin** — duyệt booking, quản lý phòng & người dùng (IT), báo cáo, import Excel
- **Mobile** — giao diện tối ưu điện thoại, menu dưới màn hình, cài PWA

## Vai trò

| Vai trò | Quyền |
|---------|--------|
| User | Đặt phòng, xem booking/sự kiện của mình |
| HR / Approver | Duyệt booking trên trang Admin |
| IT Admin (`is_superuser`) | Phòng, người dùng, branding, toàn quyền |

## Deploy production (Portainer)

Chi tiết: **[PORTAINER.md](./PORTAINER.md)**

1. Push `master` → GitHub Actions build image `ghcr.io/bktrung2003/mrbs-{frontend,backend}:latest`
2. Portainer stack từ repo, file `compose.portainer.yml`, env theo `portainer.env.example`
3. Web **3014**, API **8014**; `FRONTEND_URL` phải khớp URL trình duyệt

## Phát triển local

```bash
# Backend (cần PostgreSQL)
cd backend
uv sync
uv run alembic upgrade head
uv run fastapi dev app/main.py

# Frontend
cd frontend
bun install
bun run dev
```

API docs: http://localhost:8000/docs

## Cấu trúc

```
backend/     FastAPI + SQLModel + PostgreSQL
frontend/    React + Vite + TanStack Router
compose.portainer.yml   Stack production
```

## Ghi chú phiên bản

- Tag Git: `v1.0.0`, `v1.1.0`, …
- Trong app: **Account → What's new** (sau khi đăng nhập)
- Khi release: cập nhật `VERSION`, `CHANGELOG.md`, `frontend/src/content/whats-new.ts`, tag Git
