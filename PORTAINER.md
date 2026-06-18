# Deploy MRBS with Portainer

## 1. Images (GitHub Actions)

Push to `master` builds:

| Image | Tag |
|-------|-----|
| `ghcr.io/bktrung2003/mrbs-backend` | `latest` |
| `ghcr.io/bktrung2003/mrbs-frontend` | `latest` |

Make each GHCR package **Public** (or add registry credentials in Portainer).

Frontend calls the API on the **same domain** (`/api/...`) via nginx proxy inside the frontend container. You do **not** need `VITE_API_URL` unless the API is on a separate host.

## 2. Portainer stack

1. **Stacks** → **Add stack** → **Git repository**
2. Repository: `https://github.com/bktrung2003/mrbs`
3. Branch: `master`
4. Compose path: **`compose.portainer.yml`**
5. Environment: copy **`portainer.env.example`**, set real passwords and `FRONTEND_URL`
6. Deploy

### Ports (host)

| Service | Port | URL |
|---------|------|-----|
| Web | **3014** | `http://<server-ip>:3014` |
| API | **8014** | `http://<server-ip>:8014/docs` |

Login: `admin@example.com` / password from `FIRST_SUPERUSER_PASSWORD`

## 3. Stack env (minimum)

```env
DB_PASSWORD=...
SECRET_KEY=...
FIRST_SUPERUSER_PASSWORD=...
FRONTEND_URL=http://<server-ip>:3014
```

`FRONTEND_URL` must match the URL in the browser (scheme + IP/domain + port **3014**).

## 4. Update after push

Stack → **Pull and redeploy** after CI finishes.

## 5. Troubleshooting

| Symptom | Fix |
|---------|-----|
| Stack fails to parse env | Use `portainer.env.example` — only 4 required vars |
| `prestart` exits 1 | Check `DB_PASSWORD` matches postgres; logs: container `mrbs-prestart` |
| Web loads, login/API fails | Redeploy after CI rebuild; API must be same-origin `/api` (see compose nginx proxy) |
| CORS error | Set `FRONTEND_URL=https://mrbs2.fusionhotelgroup.com` (exact browser URL, no trailing slash) |
