# ISRA — Tipos de Cambio Fronterizos con Bolivia

Plataforma web para consultar tipos de cambio entre el Boliviano (BOB) y las monedas limítrofes (ARS, BRL, CLP, PEN, PYG), con datos de Binance y remesadores locales.

## 🚀 Stack Tecnológico

| Capa | Tecnología |
|------|------------|
| **Frontend** | Astro + Cloudflare Pages |
| **Backend** | Hono.js (Cloudflare Workers) |
| **Base de Datos** | Cloudflare D1 (SQLite en edge) |
| **Hosting** | Cloudflare Pages + Workers |
| **Gráficas** | Chart.js |

## 📁 Estructura del Proyecto

```
/
├── src/
│   ├── pages/              # Astro pages
│   │   ├── index.astro     # Main rates page
│   │   ├── calculator.astro
│   │   └── admin/index.astro
│   ├── components/        # Astro + React components
│   │   ├── RateCard.astro
│   │   ├── RateChart.tsx   # Chart.js island
│   │   ├── Calculator.tsx  # Calculator island
│   │   └── StatsPanel.astro
│   └── layouts/
│       └── Layout.astro
├── workers/
│   ├── api/                # Hono REST API
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── routes/
│   │   │   ├── services/
│   │   │   └── middleware/
│   │   └── package.json
│   └── cron/               # Binance sync cron worker
├── drizzle/
│   └── 001_init.sql        # Database migrations
├── wrangler.toml
└── astro.config.mjs
```

## ⚙️ Setup Local

### Prerrequisitos

- Node.js 20+
- npm 10+
- Wrangler CLI (`npm install -g wrangler`)

### Instalación

```bash
# 1. Instalar dependencias del frontend
npm install

# 2. Instalar dependencias del workers/api
cd workers/api && npm install && cd ../..

# 3. Crear D1 database local
wrangler d1 create isra-db --local

# 4. Actualizar wrangler.toml con el database_id
# Ver las instrucciones abajo para configurar el entorno

# 5. Aplicar migraciones
wrangler d1 execute isra-db --local --file=./drizzle/001_init.sql

# 6. Iniciar dev server
npm run dev
```

### Configuración de wrangler.toml

Después de crear el D1 database, actualizá `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "isra-db"
database_id = "AQUI_TU_DATABASE_ID"  # Reemplazar con el ID del D1 creado
```

### Variables de Entorno

Crear `.dev.vars` en la raíz:

```
BINANCE_API_URL=https://api.binance.com
ADMIN_API_KEY=tu-admin-api-key
```

## 🌐 API Endpoints

### Públicos

| Método | Path | Descripción |
|--------|------|-------------|
| GET | `/api/rates` | Tipos de cambio actuales (Binance + frontera) |
| GET | `/api/rates/:pair/history?period=30d` | Histórico de un par |
| GET | `/api/stats/:pair` | Estadísticas (promedios, desviación, IC) |
| POST | `/api/calculator` | Calcular conversión |

### Protegidos (requieren X-API-Key)

| Método | Path | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/api/border-rates` | Remesador | Subir rate de frontera |
| GET | `/admin/remesadores` | Admin | Listar remesadores |
| POST | `/admin/remesadores` | Admin | Crear remesador |
| DELETE | `/admin/remesadores/:id` | Admin | Revocar remesador |
| GET | `/admin/stats` | Admin | Estadísticas del sistema |

## 🧪 Testing

```bash
# Tests de unidad (stats, auth)
cd workers/api && npm test

# E2E tests
npm run test:e2e
```

## 🚢 Deploy

```bash
# 1. Crear D1 en producción
wrangler d1 create isra-db

# 2. Aplicar migraciones
wrangler d1 execute isra-db --remote --file=./drizzle/001_init.sql

# 3. Deploy Workers
cd workers/api && npm run deploy

# 4. Deploy Pages
npm run build
npx wrangler pages deploy dist/
```

## 📊 Monitoreo

- Logs de Workers: `wrangler tail`
- D1 Console: `wrangler d1 console isra-db`

## 🔒 Seguridad

- API keys hasheadas con SHA-256
- Admin y remesadores tienen keys separadas
- Keys de remesador pueden ser revocadas

## 📝 Notas

- Los rates de Binance se actualizan cada 15 minutos vía cron worker
- Los rates de frontera son cargados por remesadores autenticados
- Las predicciones estadísticas son solo referenciales y no garantizan resultados futuros

## 📄 Licencia

MIT