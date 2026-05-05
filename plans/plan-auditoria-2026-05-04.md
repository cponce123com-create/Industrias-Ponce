# Plan de Auditoría y Remediación — Industrias-Ponce

**Fecha**: 2026-05-04
**Estado**: Completo — 5 agentes ejecutados en paralelo

---

## Scorecard Global

| Área | Score | CRÍTICO | ALTO | MEDIO | BAJO |
|------|-------|---------|------|-------|------|
| Seguridad | 5.2/10 | 3 | 2 | 3 | 3 |
| Arquitectura | 6.4/10 | 2 | 3 | 5 | 1 |
| Rendimiento | 3.2/10 | 7 | 8 | 7 | 4 |
| DX / CI/CD | 5.8/10 | 2 | 4 | 4 | 2 |
| Integraciones | 5.5/10 | 4 | 3 | 5 | 0 |
| **TOTAL** | **5.2/10** | **18** | **20** | **24** | **10** |

---

## Hallazgos por Prioridad de Remediación

### Fase 1 — CRÍTICOs (primera semana)

#### SEG-01: Credenciales de demo en texto plano en código fuente
- **Archivos**: `lib/db/src/seed.ts:19-23`, `artifacts/api-server/src/lib/seed.ts:43-47`
- **Problema**: Contraseñas hardcodeadas (`Almacen2024!`), SHA-256 en lugar de bcrypt, `admin@almacen.com:admin123` en código público
- **Remediación**: Eliminar credenciales literales. Usar `process.env.DEMO_PASSWORD` con valor generado aleatoriamente en seed. Migrar seed a bcrypt.

#### SEG-02: UI de login expone credenciales de demo
- **Archivo**: `artifacts/legado/src/pages/auth/login.tsx:37-41, 168-173`
- **Problema**: Botones con emails de demo + hint "Tu contraseña es tu usuario + 123"
- **Remediación**: Eliminar botones de demo y hint. Mostrar mensaje genérico de contacto al admin.

#### SEG-03: JWT en localStorage — XSS
- **Archivos**: `artifacts/legado/src/hooks/use-auth.ts:9-29`, `artifacts/legado/src/lib/cloudinary.ts`
- **Problema**: Token accesible desde JavaScript, cualquier XSS expone la sesión completa
- **Remediación**: Migrar a cookies `HttpOnly; SameSite=Strict; Secure`. Modificar `auth.ts` para settear cookie en `/login` y leerla en `requireAuth`.

#### INT-01: Google Drive archivos públicos sin vencimiento
- **Archivo**: `artifacts/api-server/src/lib/google-drive.ts:75-79`
- **Problema**: Permiso `type: "anyone"` — archivo accesible por cualquier persona con el enlace
- **Remediación**: Cambiar a `type: "domain"` con `domain: "sanjacinto.com.pe"`.

#### INT-02: SMTP_USER hardcodeado en código fuente
- **Archivos**: `artifacts/api-server/src/lib/email.ts:508, 684, 769`
- **Problema**: `carlos.ponce@sanjacinto.com.pe` escrito directamente en 11+ ubicaciones
- **Remediación**: Definir `process.env.SMTP_USER` una sola vez, usar en todas partes.

#### INT-03: Upload de fotos sin `requireRole`
- **Archivo**: `artifacts/api-server/src/routes/surplus.ts:99`
- **Problema**: `POST /api/surplus/:id/photos` solo tiene `requireAuth`, usuarios readonly pueden subir
- **Remediación**: Agregar `requireRole("supervisor", "admin", "quality", "operator")`.

#### PERF-01: Sin índices en `inventory_records(product_id)` y `inventory_records(record_date)`
- **Archivo**: `lib/db/drizzle/0000_magical_thunderball.sql`
- **Problema**: FK más usada del sistema sin índice. Cada JOIN hace sequential scan. 6+ queries lentas por ausencia.
- **Remediación**: Migration `0007_add_perf_indexes.sql`:
  ```sql
  CREATE INDEX "inventory_records_product_id_idx" ON "inventory_records" ("product_id");
  CREATE INDEX "inventory_records_record_date_idx" ON "inventory_records" ("record_date" DESC);
  CREATE INDEX "inventory_records_product_date_idx" ON "inventory_records" ("product_id", "record_date" DESC);
  ```

#### PERF-02: N+1 en `/api/cuadre`
- **Archivo**: `artifacts/api-server/src/routes/cuadre.ts:30-88`
- **Problema**: 1 query base + 2 queries de último consumo por cada cuadre en página. 20 cuadres = 60 queries.
- **Remediación**: Materializar `ultimo_consumo` como columna en `cuadre_items`. Combinar las 2 queries de último consumo en una con FULL OUTER JOIN.

#### PERF-03: Sin middleware de compresión en Express
- **Archivo**: `artifacts/api-server/src/app.ts`
- **Problema**: Bundles JS sin gzip/brotli. Páginas pueden superar 1MB.
- **Remediación**: Agregar `compression` middleware al inicio de `app.ts`.

#### PERF-04: Sin `staleTime` ni `gcTime` en QueryClient
- **Archivo**: `artifacts/legado/src/App.tsx:36-43`
- **Problema**: Queries se re-fetchean innecesariamente en cada navegación. Auth query sin cache.
- **Remediación**:
  ```ts
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,  // 30s
      gcTime: 5 * 60 * 1000, // 5min
    },
  },
  ```

#### PERF-05: Sin índices en `balance_records(code)`
- **Problema**: Cuadre hace lookups por código constantemente sin índice.
- **Remediación**: En la misma migración 0007:
  ```sql
  CREATE INDEX "balance_records_code_idx" ON "balance_records" ("code");
  CREATE INDEX "cuadre_items_code_idx" ON "cuadre_items" ("code");
  ```

#### PERF-06: Select * en 6+ endpoints
- **Archivos**: `samples.ts`, `immobilized.ts`, `personnel.ts`, `dye-lots.ts`, `auth.ts`
- **Problema**: `db.select().from(table)` trae todas las columnas incluyendo `password_hash` y photos JSON
- **Remediación**: Especificar columnas explícitamente en cada query.

#### PERF-07: XLSX importado estáticamente en todas las rutas
- **Archivos**: `products.ts`, `balances.ts`, `epp.ts`, `supplies.ts`, `reports.ts`
- **Problema**: `import * as XLSX from "xlsx"` incrementa bundle ~2MB
- **Remediación**: Dynamic import: `const XLSX = await import("xlsx")` dentro del handler.

#### PERF-08: N+1 en `dye-lots.ts getNotificationData`
- **Archivo**: `artifacts/api-server/src/routes/dye-lots.ts:31-48`
- **Problema**: `SELECT * FROM users` + filter en JS en cada POST/PUT
- **Remediación**: `SELECT id, email, name FROM users WHERE status = 'active'` directamente.

---

### Fase 2 — ALTO (segunda semana)

#### SEG-04: Contraseñas temporales predecibles
- **Archivo**: `artifacts/api-server/src/routes/admin-users.ts:104-137`
- **Problema**: `username + "123"` predecible. Contraseña devuelta en respuesta JSON.
- **Remediación**: `crypto.randomBytes(16).toString('hex')`. No devolver contraseña en respuesta.

#### SEG-05: ADMIN_SETUP_KEY sin endpoint
- **Archivo**: `.env.example:13`
- **Problema**: Key documentada pero `/api/admin/setup` no existe
- **Remediación**: Implementar endpoint que valide `ADMIN_SETUP_KEY` y permita crear primer admin solo si no existe ninguno.

#### INT-04: Pool de PostgreSQL sin límite máximo
- **Archivo**: `lib/db/src/index.ts:16-18`
- **Problema**: Pool puede agotar límite de Neon (3 conexiones en plan gratuito)
- **Remediación**:
  ```ts
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  ```

#### INT-05: Documentos como base64 en PostgreSQL
- **Archivo**: `artifacts/api-server/src/routes/documents.ts:99-104`
- **Problema**: Archivos de hasta 8MB almacenados en columna de texto. Tabla crece desproporcionadamente.
- **Remediación**: Migrar a Cloudinary (ya configurado y no usado) o Google Drive.

#### INT-06: Filename en multer sin sanitizar
- **Archivo**: `artifacts/api-server/src/routes/surplus.ts:119`
- **Problema**: `path.extname(f.originalname)` usa nombre del cliente directamente
- **Remediación**: `const safeName = f.originalname.replace(/[^a-zA-Z0-9._-]/g, "_")`

#### PERF-09: N+1 en `inventory.ts` — 3 queries secuenciales
- **Archivo**: `artifacts/api-server/src/routes/inventory.ts:165-189`
- **Problema**: boxes, lcRows ejecutados secuencialmente
- **Remediación**: `Promise.all([boxesQuery, lcQuery])`.

#### PERF-10: N+1 en `products.ts checkProductDependencies`
- **Archivo**: `artifacts/api-server/src/routes/products.ts:220-233`
- **Problema**: 5 queries secuenciales en DELETE
- **Remediación**: Combinar en una sola query con UNION ALL o consulta a `information_schema`.

#### PERF-11: Sin límite en `GET /api/inventory/stats` — COUNT en JS
- **Archivo**: `artifacts/api-server/src/routes/inventory.ts:92-93`
- **Problema**: `SELECT id FROM products` trae todas las filas solo para `.length`
- **Remediación**: `SELECT count() FROM products WHERE status = 'active'`

#### PERF-12: Lucide-react importado estáticamente
- **Archivos**: Todas las páginas
- **Problema**: Iconos cargan el árbol completo del paquete sin tree-shaking
- **Remediación**: Dynamic imports o `@iconify/react` con paths individuales.

#### PERF-13: Re-renders de `useAuth` en toda la app
- **Archivo**: `artifacts/legado/src/hooks/use-auth.ts:56`
- **Problema**: `isLoading` cambia frecuentemente y causa re-render global
- **Remediación**: Separar auth state en dos: auth token (inmutable post-login) y loading state (local).

#### PERF-14: `useToast` useEffect con `[state]` dependency
- **Archivo**: `artifacts/legado/src/hooks/use-toast.ts:172-182`
- **Problema**: Listener se re-registra en cada toast
- **Remediación**: Dependency array `[]`.

#### PERF-15: `useMemo` faltantes en filtered arrays
- **Archivos**: `balances.ts`, `inventory.ts`
- **Problema**: `filtered` recalculado en cada keystroke sin memoización
- **Remediación**: `useMemo([records, search], ...)` en todos los arrays filtrados por búsqueda.

#### DX-01: Sin `strict: true` en tsconfig
- **Archivos**: `tsconfig.base.json`, `artifacts/api-server/tsconfig.json`, `artifacts/legado/tsconfig.json`
- **Problema**: Flags individuales vs strict completo
- **Remediación**: Agregar `"strict": true` al base, resolver errores incrementalmente.

#### DX-02: 4 instancias de `as any` en prod
- **Archivos**: `inventory.ts:120`, `sobrantes.tsx:527`, `email-notifications.tsx:210,214,237`
- **Problema**: Escape de type safety
- **Remediación**: Tipar `newItem()` con interfaz. Usar inferencia de Zod schema.

#### DX-03: Sin ESLint en el workspace
- **Problema**: No hay `.eslintrc*`, no hay `lint` script
- **Remediación**: Crear `eslint.config.ts` con `typescript-eslint/strict`, `react-hooks`, `no-restricted-syntax` para `as any`.

#### DX-04: Sin rollback de migraciones
- **Problema**: 7 migraciones forward-only, no hay SQL de rollback
- **Remediación**: Documentar SQL de reversión de cada migration en `docs/migrations.md`.

#### DX-05: Sin health check activo en render.yaml
- **Archivo**: `render.yaml`
- **Problema**: `healthCheckPath` no configurado
- **Remediación**: `healthCheckPath: /healthz`

#### DX-06: Sin rollback strategy en render.yaml
- **Problema**: No hay `previousRetainDeploymentCount` ni `rollback` block
- **Remediación**: `previousRetainDeploymentCount: 2`, `rollback.enabled: true`

#### DX-07: Orden incorrecto en buildCommand de render
- **Problema**: `legado build` antes de `api-server build`
- **Remediación**: Reordenar — api-server primero (falla más rápido).

---

### Fase 3 — MEDIO (tercera semana)

#### SEG-06: CORS permite peticiones sin Origin
- **Archivo**: `artifacts/api-server/src/app.ts:77-86`
- **Problema**: `!origin` return `callback(null, true)` con `credentials: true`
- **Remediación**: Rechazar peticiones sin Origin cuando `credentials: true`.

#### SEG-07: CSP sin configuración explícita
- **Archivo**: `artifacts/api-server/src/app.ts:23`
- **Problema**: `helmet()` sin CSP custom permite inline scripts
- **Remediación**: Configurar CSP explícito, deployar en report-only primero.

#### ARC-01: OpenAPI spec desincronizada del API real
- **Archivo**: `lib/api-spec/openapi.yaml`
- **Problema**: Spec describe Digital Legacy app, API real es almacén químico
- **Remediación**: Regenerar spec desde el código real. Crear script `scripts/validate-openapi.ts`.

#### ARC-02: api-client-react no se usa en páginas
- **Archivo**: `lib/api-client-react/src/index.ts`
- **Problema**: Hooks generados existen pero las páginas usan fetch directo
- **Remediación**: Centralizar en `src/lib/api-client.ts`. Decidir: usar hooks generados o eliminar el paquete.

#### ARC-03: Sin versionado en API REST
- **Problema**: Todos los endpoints bajo `/api/` sin versioning
- **Remediación**: Migrar a `/api/v1/` desde ahora. Script que parsee rutas y verifique consistencia.

#### ARC-04: Pages sobrepasan límite de 650 líneas
- **Archivos**: `products.tsx` (647), `inventory.tsx` (609), `reports.tsx`, `admin-users.tsx`, `msds.tsx`, `samples.tsx`
- **Problema**: Convenciones documentadas en `replit.md` no se cumplen consistentemente
- **Remediación**: Aplicar patrón partials a todas las páginas >400 líneas.

#### ARC-05: apiErrorHandler centralizado ausente
- **Archivo**: `artifacts/api-server/src/app.ts:112-115`
- **Problema**: Errores inconsistentes entre endpoints: `{ error }` vs `{ message }` vs `{ ok: false }`
- **Remediación**: Crear `lib/error.ts` con clase `ApiError` y middleware `apiErrorHandler` unificado.

#### ARC-06: Validation helper unificado ausente
- **Problema**: `supplies.ts` y `surplus.ts` hacen `.safeParse()` y retornan solo el primer error
- **Remediación**: Crear `lib/validation.ts` con `validateBody<T>` helper.

#### ARC-07: mockup-sandbox sin uso claro en producción
- **Archivo**: `artifacts/mockup-sandbox/`
- **Problema**: No está en pipeline de build, no tiene tests, componentes duplican `legado/src/components/ui`
- **Remediación**: Eliminar si no hay uso activo documentado.

#### ARC-08: Foreign keys ausentes en `cuadre_records` y `cuadre_items`
- **Archivo**: `lib/db/src/schema/cuadre-records.ts`
- **Problema**: Sin constraints hacia `users`, `products`, `balance_records`
- **Remediación**: Migration adding foreign keys con `references()`.

#### INT-07: Cloudinary SDK configurado pero no usado para uploads
- **Archivo**: `artifacts/api-server/src/lib/cloudinary.ts`
- **Problema**: `uploadToCloudinary` existe pero uploads van por Google Drive
- **Remediación**: Documentar la decisión o migrar uploads a Cloudinary.

#### INT-08: Rate limiting por IP pero no por usuario autenticado
- **Problema**: `generalApiLimiter` solo limita por IP. Usuario autenticado malicioso puede abusar.
- **Remediación**: Crear `userLimiter` que cuente por `req.auth.userId`.

#### INT-09: Variables YouTube y RENIEC no usadas
- **Archivos**: `.env.example:30, 42`
- **Problema**: Docs mencionan APIs sin código que las use
- **Remediación**: Eliminar del `.env.example` o documentar como "reservado para futuro".

#### PERF-16: Imágenes sin `loading="lazy"`
- **Archivos**: `inventory-partials.tsx`, `inventory.tsx`, `surplus.tsx`
- **Problema**: `<img src={...}>` carga inmediatamente sin lazy loading
- **Remediación**: `loading="lazy"` + `decoding="async"` en todas las img generadas por usuarios.

#### PERF-17: Imágenes sin transformación (Cloudinary URL params)
- **Problema**: Fotos Drive mostradas sin resize, ancho de banda desperdiciado
- **Remediación**: Helper de transformación o resize en el servidor.

#### PERF-18: Sin `React.Suspense` prefetch para rutas lazy
- **Problema**: Usuario ve loader en primera navegación a cada módulo
- **Remediación**: Prefetch on hover con IntersectionObserver.

#### PERF-19: N+1 en EPP import loop
- **Archivo**: `artifacts/api-server/src/routes/epp.ts:144-177`
- **Problema**: 500 filas → 500 queries secuenciales
- **Remediación**: Batch inserts con `db.insert().values(batch)`.

#### PERF-20: Cache-Control headers ausentes en static assets
- **Archivo**: `artifacts/api-server/src/app.ts:100`
- **Problema**: Navegadores no cachean assets versionados
- **Remediación**: `maxAge: "1y"` para assets, `no-cache` para index.html.

#### DX-08: JSDoc faltante en funciones exportadas
- **Problema**: Auth, migrations, seed sin documentación
- **Remediación**: JSDoc mínimo en funciones públicas: `@param`, `@returns`, `@throws`.

#### DX-09: Dependabot no configurado
- **Problema**: No hay actualizaciones automáticas de dependencias
- **Remediación**: Configurar Dependabot en `.github/dependabot.yml`.

#### DX-10: GitHub Actions CI ausente
- **Problema**: No hay pipeline de `typecheck` + `test` en cada push
- **Remediación**: Crear `.github/workflows/ci.yml`.

---

## Arquitectura Propuesta — Estructura Final

```
industrias-ponce/
├── artifacts/
│   ├── api-server/
│   │   └── src/
│   │       ├── app.ts
│   │       ├── index.ts
│   │       ├── routes/
│   │       │   ├── index.ts           # Router master
│   │       │   ├── health.ts          # /api/healthz (auth opcional)
│   │       │   ├── auth.ts            # /api/auth/*
│   │       │   ├── products.ts        # /api/products/*
│   │       │   ├── inventory.ts       # /api/inventory/*
│   │       │   ├── supplies.ts        # /api/supplies/*
│   │       │   ├── surplus.ts         # /api/surplus/*
│   │       │   ├── cuadre.ts          # /api/cuadre/*
│   │       │   ├── samples.ts         # /api/samples/*
│   │       │   ├── immobilized.ts     # /api/immobilized/*
│   │       │   ├── reports.ts         # /api/reports/*
│   │       │   ├── documents.ts       # /api/documents/*
│   │       │   ├── personnel.ts       # /api/personnel/*
│   │       │   ├── dye-lots.ts        # /api/dye-lots/*
│   │       │   ├── lot-evaluations.ts # /api/lot-evaluations/*
│   │       │   ├── notifications.ts  # /api/notifications/*
│   │       │   ├── disposition.ts     # /api/disposition/*
│   │       │   ├── admin-users.ts    # /api/admin/users/*
│   │       │   └── epp.ts            # /api/epp/*
│   │       ├── lib/
│   │       │   ├── auth.ts             # JWT, requireAuth, requireRole
│   │       │   ├── error.ts            # ApiError + handler    ← NUEVO
│   │       │   ├── validation.ts      # validateBody helper   ← NUEVO
│   │       │   ├── audit.ts           # Write-only audit log
│   │       │   ├── rate-limit.ts       # 5 limitadores
│   │       │   ├── logger.ts
│   │       │   ├── email.ts            # SMTP con env var única
│   │       │   ├── google-drive.ts    # Domain-restricted shares
│   │       │   ├── cloudinary.ts      # Para migración de uploads
│   │       │   └── pagination.ts       # Cursor-based pagination
│   │       └── __tests__/             # Tests por módulo
│   │
│   └── legado/                        # SPA React 19 (CSR)
│       └── src/
│           ├── App.tsx                # QueryClient c/ staleTime
│           ├── lib/
│           │   ├── api-client.ts      # Centralizar fetches       ← NUEVO
│           │   └── utils.ts
│           ├── pages/
│           │   ├── auth/
│           │   ├── dashboard.tsx
│           │   └── modules/           # Un subdirectorio por módulo
│           │       ├── products/
│           │       ├── inventory/
│           │       ├── supplies/
│           │       └── ...
│           ├── components/ui/         # shadcn/ui unificado
│           ├── components/shared/      # DataTable, FormField ← NUEVO
│           ├── hooks/
│           │   ├── use-auth.ts        # Cookies HttpOnly
│           │   ├── use-pagination.ts  ← NUEVO
│           │   └── use-warehouse.ts
│           └── contexts/
│               └── WarehouseContext.tsx
│
├── lib/
│   ├── api-spec/                      # REGENERAR desde código
│   │   ├── openapi.yaml
│   │   └── orval.config.ts
│   ├── api-zod/src/generated/          # Sincronizado con routes
│   ├── api-client-react/src/generated/ # Consumido por api-client.ts
│   └── db/
│       ├── drizzle.config.ts
│       ├── drizzle/                   # 0000-0006 + 0007 (índices)
│       │   └── 0007_add_perf_indexes.sql              ← PRIORIDAD
│       └── src/
│           ├── index.ts               # Pool con límites configurados
│           ├── migrate.ts
│           └── schema/                 # Un archivo por tabla
│               ├── _enums.ts          # ← Consolidar enums aquí
│               ├── users.ts
│               ├── products.ts
│               └── ...
│
├── scripts/
│   ├── validate-openapi.ts             # ← NUEVO: spec vs código
│   ├── check-migrations.sh             # ← NUEVO: detecta dupes
│   └── generate-admin.ts               # ← NUEVO: para ADMIN_SETUP_KEY
│
├── .github/
│   ├── workflows/
│   │   └── ci.yml                      # ← NUEVO: typecheck + test
│   └── dependabot.yml                  # ← NUEVO
│
├── .env.example                        # SMTP_USER como env var
├── render.yaml                         # healthCheckPath, rollback, orden
├── eslint.config.ts                    # ← NUEVO
├── .prettierrc                         # ← NUEVO
├── pnpm-workspace.yaml
└── tsconfig.base.json                  # strict: true ← PRIORIDAD
```

---

## Siguiente Paso

Ejecutar remediaciones en orden:
1. **Fase 1 (CRÍTICOs)**: Migración de índices + eliminación de credenciales hardcodeadas + fix localStorage → cookie + fix Drive público
2. **Fase 2 (ALTO)**: Strict TS + ESLint + render.yaml completo + query optimization
3. **Fase 3 (MEDIO)**: Arquitectura, versionado API, docs