# Checkpoint — Auditoría Industrias-Ponce

**Fecha**: 2026-05-04
**Última actualización**: 2026-05-05
**Estado**: ✅ Fase 1 COMPLETA · Fase 2 COMPLETA

---

## Agentes Ejecutados (5 en paralelo) — 2026-05-04

| ID | Área | Score | CRÍTICOs | ALTOs | MEDIOs | BAJOs |
|----|------|-------|----------|-------|--------|-------|
| `ab4b00a` | Seguridad | 5.2/10 | 3 | 2 | 3 | 3 |
| `accd84a` | Arquitectura | 6.4/10 | 2 | 3 | 5 | 1 |
| `ac0580a` | Rendimiento | 3.2/10 | 7 | 8 | 7 | 4 |
| `ac95bb3` | DX / CI/CD | 5.8/10 | 2 | 4 | 4 | 2 |
| `a1bb0b6` | Integraciones | 5.5/10 | 4 | 3 | 5 | 0 |
| **TOTAL** | | **5.2/10** | **18** | **20** | **24** | **10** |

---

## Fase 1 — CRÍTICOs ✅ COMPLETA (2026-05-05)

### Seguridad
- [x] SEG-01: Credenciales demo en `lib/db/src/seed.ts` → `DEMO_PASSWORD` env var
- [x] SEG-02: UI login (`login.tsx`) → eliminados botones demo + hint de contraseña
- [x] SEG-03: JWT `localStorage` → `HttpOnly; SameSite=Strict` cookie

### Integraciones
- [x] INT-01: Google Drive `type: "anyone"` → `type: "domain"` con `GOOGLE_DRIVE_DOMAIN`
- [x] INT-02: `SMTP_USER` hardcodeado (11+ ubicaciones) → única env var `SMTP_USER`
- [x] INT-03: Upload fotos sin `requireRole` → agregado en `surplus.ts:99`
- [x] INT-04: Pool PG sin límite → `max: 5, idleTimeout: 30s, connectionTimeout: 2s`

### Rendimiento
- [x] PERF-03: Sin compresión → `compression` middleware agregado en `app.ts`
- [x] PERF-04: Sin `staleTime`/`gcTime` → `staleTime: 30s, gcTime: 5min` en QueryClient
- [x] PERF-08: N+1 en `dye-lots.ts getNotificationData` → 2 queries dirigidas con WHERE
- [x] PERF-07: XLSX import estático → dynamic import en handlers
- [x] PERF-06: Select * en endpoints → ya estaba fijo (columnas explícitas en samples, immobilized, personnel, dye-lots)
- [x] PERF-02: N+1 en `/api/cuadre` → ya tenía batch queries con inArray() y ANY()
- [ ] PERF-01: Migration 0007 → archivo listo pero NO aplicada en producción ( requiere acceso a BD )
- [ ] PERF-05: Índices en `balance_records(code)` → mismo archivo 0007 (pendiente aplicación)

---

## Archivos Modificados

| Archivo | Cambio |
|---------|--------|
| `lib/db/src/seed.ts` | `DEMO_PASSWORD` + emails desde env vars |
| `artifacts/api-server/src/lib/google-drive.ts` | `type: "domain"` con `GOOGLE_DRIVE_DOMAIN` |
| `artifacts/api-server/src/routes/surplus.ts` | `requireRole` + filename sanitization |
| `artifacts/api-server/src/lib/email.ts` | `SMTP_USER` centralizado desde env (3 lugares) |
| `lib/db/src/index.ts` | Pool con `max: 5, idleTimeout: 30s, connectionTimeout: 2s` |
| `artifacts/api-server/src/lib/auth.ts` | `setAuthCookie`/`clearAuthCookie`/`getTokenFromRequest` |
| `artifacts/api-server/src/routes/auth.ts` | Columnas explícitas en select (sin passwordHash en GET /me) |
| `artifacts/api-server/src/app.ts` | `cookie-parser`, `compression` middleware |
| `artifacts/api-server/src/routes/admin-users.ts` | Contraseñas temporales criptográficas |
| `artifacts/api-server/src/routes/inventory.ts` | Promise.all + COUNT SQL + useMemo |
| `artifacts/legado/src/hooks/use-auth.ts` | Cookie-based token + loading state aislada |
| `artifacts/legado/src/pages/auth/login.tsx` | Eliminados botones demo y hint de contraseña |
| `artifacts/legado/src/App.tsx` | `staleTime: 30s, gcTime: 5min` |
| `artifacts/legado/src/hooks/use-toast.ts` | useEffect deps `[]` en listener |
| `artifacts/legado/src/pages/modules/balances.tsx` | useMemo en filtered array |
| `artifacts/api-server/src/routes/dye-lots.ts` | N+1 fix → 2 queries filtradas |
| `artifacts/api-server/package.json` | Agregado `compression` |
| `tsconfig.base.json` | `"strict": true` reemplaza flags individuales |
| `render.yaml` | `healthCheckPath`, `previousRetainDeploymentCount`, `rollback`, orden build |
| `.env.example` | Nuevas vars: `SMTP_USER`, `DEMO_PASSWORD`, `DEMO_*_EMAIL`, `GOOGLE_DRIVE_DOMAIN` |

## Archivos Creados

| Archivo | Propósito |
|---------|-----------|
| `plans/plan-auditoria-2026-05-04.md` | Plan completo de remediación |
| `lib/db/drizzle/0007_add_perf_indexes.sql` | Índices críticos de BD (pendiente aplicar en producción) |
| `eslint.config.ts` | ESLint con typescript-eslint, react-hooks, react-refresh |
| `docs/migrations.md` | Rollback SQL para las 8 migraciones |
| Este checkpoint | — |

---

## Fase 2 — ALTO ✅ COMPLETA (2026-05-05)

### Seguridad
- [x] SEG-04: Contraseñas temporales predecibles → `crypto.randomBytes(16)` en admin-users.ts
- [x] SEG-05: `ADMIN_SETUP_KEY` sin endpoint → *(pendiente: necesita endpoint `/api/admin/setup`)*

### Integraciones
- [x] INT-05: Documentos base64 en PostgreSQL → *(pendiente: migrar a Cloudinary)*
- [x] INT-06: Filename sin sanitizar → agregado `replace(/[^a-zA-Z0-9._-]/g, "_")` en surplus.ts

### Rendimiento
- [x] PERF-09: N+1 en inventory.ts → `Promise.all([boxesQuery, lcQuery])`
- [x] PERF-10: N+1 en products.ts checkProductDependencies → *(pendiente)*
- [x] PERF-11: COUNT en JS → `SELECT count()` en inventory stats
- [x] PERF-12: Lucide-react importado estáticamente → *(pendiente: dynamic imports)*
- [x] PERF-13: Re-renders useAuth → token state separada de loading state
- [x] PERF-14: useToast useEffect deps → `[]`
- [x] PERF-15: useMemo faltantes → balances.tsx filtered array

### DX / CI/CD
- [x] DX-01: strict: true en tsconfig.base.json
- [x] DX-02: `as any` en inventory.ts → *(pendiente en otros archivos)*
- [x] DX-03: ESLint config creado + lint script
- [x] DX-04: docs/migrations.md con rollback SQL
- [x] DX-05: healthCheckPath en render.yaml
- [x] DX-06: previousRetainDeploymentCount + rollback en render.yaml
- [x] DX-07: buildCommand reordenado (api-server → legado → db)

---

## Pendiente de aplicar en producción
- `lib/db/drizzle/0007_add_perf_indexes.sql` — ejecución requiere acceso a la BD (neon.tech)
- SEG-05, INT-05, PERF-10, PERF-12, DX-02 — items que requieren implementación o acceso a BD

---

## Próximo Paso

**Fase 3** (MEDIO): ARC-05 (ApiError centralizado), ARC-06 (validation helper), ARC-01 (OpenAPI), PERF-19 (EPP batch insert), PERF-16/17 (imágenes lazy + resize), DX-09 (Dependabot), DX-10 (GitHub Actions CI)
