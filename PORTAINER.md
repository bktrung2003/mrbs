# Deploy MRBS with Portainer

## 1. GitHub Actions (automatic)

Every push to `master` builds and pushes:

| Image | Tag |
|-------|-----|
| `ghcr.io/bktrung2003/mrbs-backend` | `latest`, commit SHA |
| `ghcr.io/bktrung2003/mrbs-frontend` | `latest`, commit SHA |

**First time:** open each package on GitHub → Package settings → change visibility to **Public** (or add GHCR credentials in Portainer).

**Frontend API URL:** set repository variable `VITE_API_URL` (Settings → Secrets and variables → Actions → Variables) to your public API URL, e.g. `https://mrbs-api.example.com` or `http://192.168.1.10:8000`. Re-run the workflow after changing it.

## 2. Portainer stack

1. **Stacks** → **Add stack** → **Git repository**
2. Repository URL: `https://github.com/bktrung2003/mrbs`
3. Compose path: `compose.portainer.yml`
4. Branch: `master`
5. Environment variables: copy from `.env.example` and set real secrets (`SECRET_KEY`, `POSTGRES_PASSWORD`, `FIRST_SUPERUSER_PASSWORD`, etc.)
6. Deploy

Default ports:

- Frontend: `80` → web app
- Backend API: `8000` → `/docs`

## 3. Update after a new push

- **Webhook:** Portainer stack → Webhooks → copy URL → GitHub repo → Settings → Webhooks (optional)
- Or click **Pull and redeploy** on the stack after CI finishes

## 4. Traefik / HTTPS (optional)

For production with domains, use `compose.yml` + external Traefik network — see `deployment.md`.
