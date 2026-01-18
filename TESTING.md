# Testing (Luca)

## 1) Estrategia de testing

- **Manual**: se hace con la colección de Bruno en `collection-luca/`. Cada request presente allí se considera “ejecutado manualmente al menos una vez”.
- **Automatizado**: Jest. La mayoría de specs son service-level y corren contra TypeORM (lógica + persistencia), no contra controllers HTTP. También hay un e2e enfocado en gov-sync.
- **Scope reminder (MVP)**: el foco es demostrar multi-tenancy + gov-sync resiliente (mock de gobierno + circuit breaker) y las primitivas base (tenants, users, auth dev).

## 2) Manual testing (Bruno)

Colección y environment:
- `collection-luca/bruno.json`
- `collection-luca/environments/local.bru`

Requests clave (archivos `.bru`):

### Auth

- `collection-luca/auth/signup.bru` (`POST /auth/signup`)
- `collection-luca/auth/login.bru` (`POST /auth/login`)

### Tenants

- `collection-luca/tenant/create.bru` (`POST /tenants`)
- `collection-luca/tenant/get.bru` (`GET /tenants`)

### Users

- `collection-luca/users/create.bru` (`POST /users`)
- `collection-luca/users/get.bru` (`GET /users`)
- `collection-luca/users/get by id.bru` (`GET /users/{id}`)

### Gov Sync

- `collection-luca/gov-sync/create job.bru` (`POST /tenants/{tenantId}/gov-sync/jobs`)
- `collection-luca/gov-sync/trigger processing.bru` (`POST /tenants/{tenantId}/gov-sync/jobs/{jobId}/process`)
- `collection-luca/gov-sync/get job.bru` (`GET /tenants/{tenantId}/gov-sync/jobs/{jobId}`)
- `collection-luca/gov-sync/gov-api-client-dev/circuit status.bru` (`GET /tenants/{tenantId}/gov-sync/__dev/gov-api/circuit`)

### Mock Gov API

- `collection-luca/gov-sync/mock-gov-api/set mode ok.bru`
- `collection-luca/gov-sync/mock-gov-api/set mode fail.bru`
- `collection-luca/gov-sync/mock-gov-api/set mode timeout.bru`
- `collection-luca/gov-sync/mock-gov-api/reset.bru`
- `collection-luca/gov-sync/mock-gov-api/stats.bru`

## 3) Tests automatizados (Jest)

Comandos:

```bash
pnpm test
pnpm test:gov-sync
pnpm test:e2e
```

Notas:
- `pnpm test` y `pnpm test:gov-sync` corren con `NODE_ENV=test`.
- En `NODE_ENV=test` se usa DB `luca_test` (puerto `57433`) y se habilita `dropSchema` para aislamiento entre tests.
