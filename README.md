# RutaSegura Girardot

Aplicación web para que las mujeres que caminan de noche en Girardot comparen la **ruta rápida** con la **ruta más segura**, pidan ayuda con un toque y mejoren el mapa con sus calificaciones. ODS 5 y 11.

> Esta herramienta es un apoyo, no una garantía de seguridad. En emergencia llama al **123**.

**URL de despliegue:** https://rutasegura-girardot.azurewebsites.net *(Azure App Service F1; la primera carga puede tardar ~30 s)*

## Requisitos
- Node.js 20 o superior (probado con Node 24 en local y Node 22 en Azure)
- Una base de datos PostgreSQL (usamos [Neon](https://neon.tech), capa gratuita)

## Instalación
```bash
npm install
cp .env.example .env      # y completa DATABASE_URL, JWT_SECRET, DATA_KEY y las contraseñas de prueba
npm run db:init           # crea las tablas, carga los datos demo y crea las cuentas de prueba
npm run osm:sync          # (opcional) trae puntos seguros reales de OpenStreetMap
npm run dev               # http://localhost:3000
npm test                  # 11 pruebas unitarias (puntaje y geografía)
```

Para generar secretos:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"   # JWT_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"   # DATA_KEY (64 hex)
```

## Variables de entorno
| Variable | Para qué |
|---|---|
| `DATABASE_URL` | Conexión a PostgreSQL (`?sslmode=verify-full`) |
| `JWT_SECRET` | Firma de las sesiones (mínimo 32 caracteres) |
| `JWT_EXPIRES_IN` | Duración de la sesión (por defecto `2h`) |
| `DATA_KEY` | Clave AES-256 para cifrar teléfono y correo de los contactos |
| `ORS_API_KEY` | Opcional. Sin ella se usa el OSRM peatonal de FOSSGIS |
| `APP_URL` | URL pública (CORS) |
| `NODE_ENV` | `production` en Azure (activa cookies `secure`) |
| `SEED_ADMIN_PASSWORD`, `SEED_USER_PASSWORD` | Contraseñas de las cuentas de prueba que crea `db:init` |

## Cuentas de prueba
| Rol | Correo | Contraseña |
|---|---|---|
| Usuaria | `laura@rutasegura.test` | la de `SEED_USER_PASSWORD` (demo: `Usuaria2026!Girardot`) |
| Administración | `admin@rutasegura.test` | la de `SEED_ADMIN_PASSWORD` (demo: `Admin2026!Girardot`) |

## Cómo se usa
1. Inicia sesión. La primera vez verás un onboarding de 3 pasos.
2. En el mapa, toca el origen y luego el destino (o usa "Mi ubicación" o "Buscar") y pulsa **Trazar ruta segura**.
3. Compara las dos rutas (faroles = puntaje), lee por qué la recomendamos y pulsa **Iniciar recorrido**.
4. Al llegar, pulsa **Llegué bien** y califica: tus estrellas mejoran el puntaje de esas calles.
5. El botón rojo **Ayuda** está siempre visible: 3 s para cancelar, luego llama al 123 y avisa a tus contactos.
6. En el mapa puedes **reportar un problema**; la cuenta admin lo aprueba en **Moderar**.

## Despliegue en Azure (App Service, Linux, Node 22, plan F1)
1. Crea la Web App desde VS Code (*Azure App Service: Create New Web App... (Advanced)*) en una región permitida para Azure for Students (usamos **East US 2**).
2. En *Configuración → Variables de entorno* agrega: `NODE_ENV=production`, `DATABASE_URL`, `JWT_SECRET`, `DATA_KEY` (la misma de la BD), `APP_URL`, `DEFAULT_CITY=girardot`, `SCM_DO_BUILD_DURING_DEPLOYMENT=true`.
3. Clic derecho sobre la app → **Deploy to Web App**. `.vscode/settings.json` excluye `node_modules` y `.env` del paquete.

## Documentación
- [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md): arquitectura y decisiones técnicas
- [docs/IA_LOG.md](docs/IA_LOG.md): uso de inteligencia artificial
- [docs/SUSTENTACION.md](docs/SUSTENTACION.md): guion de la presentación

Mapa y datos © colaboradores de [OpenStreetMap](https://www.openstreetmap.org/copyright). Las zonas marcadas "demo" son datos de ejemplo.
