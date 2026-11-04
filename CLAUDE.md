# CLAUDE.md — RutaSegura Girardot

> Archivo de contexto para Claude Code. Léelo completo antes de escribir código.
> Proyecto de la Maratón de Programación con Impacto Social (LCUP/CCPL) — Universidad de Cundinamarca, **Ciclo de Profundización**.

---

## 0. REGLAS DE TRABAJO (OBLIGATORIAS)

1. **Tiempo limitado:** la ventana de desarrollo es de ~2,5 horas. Trabaja por prioridades (P0 → P1 → P2). **No avances a P1 si P0 no corre de punta a punta.**
2. **Siempre dejar la app ejecutable.** Tras cada fase, `npm start` debe arrancar sin errores.
3. **Registro de uso de IA (requisito del reglamento, Art. 8 y 9):** después de cada fase completada, agrega una entrada en `docs/IA_LOG.md` con: fase, prompt/instrucción relevante, qué generó la IA, qué revisó o corrigió el equipo humano y evaluación crítica (sesgos, limitaciones, riesgos). Ver plantilla en la sección 12. **No omitas este paso.**
4. **El código debe ser comprensible por estudiantes de 4.º–6.º semestre** que lo van a sustentar en 10 minutos: comentarios breves en español en la lógica clave, nombres claros, sin sobreingeniería.
5. **Nunca inventes datos como si fueran reales.** Todo dato semilla (zonas de riesgo, puntos seguros) debe marcarse como `fuente = 'demo'` y documentarse como dato de ejemplo a validar con la comunidad.
6. **Seguridad desde el inicio**, no al final (sección 9).
7. **Si algo es ambiguo, elige la opción más simple que cumpla los requisitos** y documéntala en `docs/ARQUITECTURA.md`.
8. Idioma de la interfaz y de la documentación: **español (Colombia)**. Código (variables, funciones): inglés o español, pero **consistente**.

---

## 1. CONTEXTO DEL PROYECTO

**Problemática sorteada:** Ruta segura para mujeres en el espacio público nocturno, de manera translocal (piloto en **Girardot, Cundinamarca**).

**ODS:** 5 (Igualdad de género) y 11 (Ciudades y comunidades sostenibles).

**Idea de solución:** aplicación web que (a) muestra un mapa con zonas de riesgo y puntos seguros, (b) traza entre origen y destino la ruta **más segura** (no solo la más rápida) comparándola con la ruta rápida, (c) permite pedir ayuda rápido, (d) guarda el historial de rutas, (e) permite calificar y comentar rutas para retroalimentar el sistema, y (f) permite compartir la ubicación en tiempo real con contactos de confianza.

**Usuarias objetivo:** mujeres que caminan de noche en Girardot (estudiantes, trabajadoras). Deben poder usar la app con una mano, en el celular, con poca conexión y poco tiempo.

### Requisitos del Ciclo de Profundización (lo que se evalúa)

| Criterio (peso) | Qué debe demostrar el proyecto |
|---|---|
| Cumplimiento de requerimientos (30%) | Resuelve la problemática; arquitectura **MVC**; BD **PostgreSQL**; auth **JWT**; **al menos una API externa / datos abiertos**; despliegue en la nube; escalabilidad y sostenibilidad |
| UX (20%) | Diseño centrado en la usuaria, **accesibilidad WCAG 2.1 AA**, flujo lógico, responsive (mobile-first) |
| Seguridad (20%) | Autenticación robusta, cifrado de datos sensibles, protección contra **OWASP Top 10** |
| Usabilidad (15%) | **Onboarding**, ayuda contextual, eficiencia en tareas clave (pedir ayuda y trazar ruta en pocos toques) |
| Uso ético de la IA (15%) | Documentación de herramientas, prompts, evaluación crítica y marco ético de IA de Colombia (2021) |

**Entregables:** código fuente ejecutable · documento de arquitectura y decisiones técnicas (**máx. 5 páginas**) · documento de uso de IA · presentación de 10 min.

---

## 2. STACK TECNOLÓGICO (decisión cerrada)

| Capa | Tecnología |
|---|---|
| Backend | Node.js 20+ · Express 4 |
| Vistas (V) | EJS (renderizado en servidor) + CSS propio + JS vanilla en `public/js` |
| Base de datos | PostgreSQL (driver `pg`, consultas **parametrizadas**) |
| Mapa | Leaflet + teselas OpenStreetMap |
| Ruteo (API externa) | OpenRouteService (ORS) `foot-walking` con alternativas; **fallback:** OSRM público |
| Datos abiertos | OpenStreetMap vía Overpass API (luminarias, estaciones de policía, comercios abiertos) |
| Auth | JWT en cookie `httpOnly` + `bcrypt` |
| Seguridad | `helmet`, `express-rate-limit`, `express-validator`, `cors` restringido |
| Tiempo real (ubicación compartida) | Server-Sent Events (SSE) — más simple que WebSockets |
| Despliegue | Render (web service) + Neon o Supabase (PostgreSQL gratuito) |

Dependencias npm: `express ejs pg bcrypt jsonwebtoken cookie-parser helmet express-rate-limit express-validator cors dotenv node-fetch` (o `fetch` nativo de Node 20) y `nodemon` en dev.

Variables de entorno (`.env`, nunca subir al repo; crear `.env.example`):

```
PORT=3000
DATABASE_URL=postgres://...
JWT_SECRET=cambia_esto_por_un_secreto_largo
JWT_EXPIRES_IN=2h
ORS_API_KEY=
DEFAULT_CITY=girardot
NODE_ENV=development
TELEGRAM_BOT_TOKEN=        # opcional (P1): alertas a contactos
```

---

## 3. ARQUITECTURA MVC

**Regla central:** los **controladores no contienen lógica de negocio ni SQL**. Reciben la petición, validan, llaman a modelos/servicios y devuelven una vista o JSON. Las **vistas** no consultan la BD. Los **modelos** encapsulan el acceso a datos. Los **servicios** encapsulan APIs externas y el cálculo del puntaje.

```
rutasegura-girardot/
├── CLAUDE.md
├── package.json
├── .env.example
├── .gitignore
├── db/
│   ├── schema.sql              ← tablas
│   └── seed.sql                ← datos DEMO (marcados fuente='demo')
├── docs/
│   ├── ARQUITECTURA.md         ← máx. 5 páginas (entregable)
│   ├── IA_LOG.md               ← uso de IA con prompts (entregable)
│   └── SUSTENTACION.md         ← guion de 10 min
├── src/
│   ├── app.js                  ← configuración Express, middlewares, rutas
│   ├── server.js               ← arranque
│   ├── config/
│   │   ├── db.js               ← pool de pg
│   │   └── env.js
│   ├── models/                 ← M
│   │   ├── User.js
│   │   ├── EmergencyContact.js
│   │   ├── RiskZone.js
│   │   ├── SafePoint.js
│   │   ├── Trip.js
│   │   ├── TripRating.js
│   │   ├── Comment.js
│   │   ├── Incident.js
│   │   ├── ShareLink.js
│   │   └── City.js
│   ├── controllers/            ← C
│   │   ├── authController.js
│   │   ├── mapController.js
│   │   ├── routeController.js
│   │   ├── tripController.js
│   │   ├── ratingController.js
│   │   ├── contactController.js
│   │   ├── alertController.js
│   │   ├── incidentController.js
│   │   ├── shareController.js
│   │   └── adminController.js
│   ├── services/               ← lógica y APIs externas
│   │   ├── routingService.js       ← ORS / OSRM
│   │   ├── overpassService.js      ← luminarias, CAI, comercios (OSM)
│   │   ├── safetyScoreService.js   ← cálculo del puntaje (sección 6)
│   │   ├── geoUtils.js             ← haversine, muestreo de polilínea
│   │   └── notificationService.js  ← Telegram/email (P1)
│   ├── middleware/
│   │   ├── auth.js                 ← verifica JWT, expone req.user
│   │   ├── requireRole.js
│   │   ├── validators.js
│   │   └── errorHandler.js
│   ├── routes/
│   │   ├── web.js                  ← rutas que renderizan vistas
│   │   └── api.js                  ← rutas JSON (/api/...)
│   └── views/                  ← V
│       ├── layout/ (header, footer, head)
│       ├── auth/ (login, register)
│       ├── onboarding.ejs
│       ├── map.ejs                 ← pantalla principal
│       ├── trip-active.ejs
│       ├── trip-rate.ejs
│       ├── history.ejs
│       ├── contacts.ejs
│       ├── share-public.ejs        ← vista pública con token (sin login)
│       ├── admin/ (incidents.ejs, zones.ejs)
│       └── errors/ (404, 500)
└── public/
    ├── css/styles.css
    ├── js/ (map.js, trip.js, alarm.js, share.js, a11y.js)
    └── img/
```

---

## 4. MODELO DE DATOS (`db/schema.sql`)

Mantener simple: coordenadas en `lat/lng` (no es necesario PostGIS). Geometrías de rutas como `JSONB` (GeoJSON LineString).

```sql
CREATE TABLE cities (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(50) UNIQUE NOT NULL,          -- 'girardot'
  name VARCHAR(100) NOT NULL,
  center_lat DOUBLE PRECISION NOT NULL,
  center_lng DOUBLE PRECISION NOT NULL,
  bbox_south DOUBLE PRECISION, bbox_west DOUBLE PRECISION,
  bbox_north DOUBLE PRECISION, bbox_east DOUBLE PRECISION,
  active BOOLEAN DEFAULT TRUE
);

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'user',  -- 'user' | 'admin'
  city_id INT REFERENCES cities(id),
  inactivity_minutes INT DEFAULT 5,           -- umbral del botón de inactividad
  consent_location BOOLEAN DEFAULT FALSE,     -- consentimiento Ley 1581
  onboarding_done BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE emergency_contacts (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(30),
  email VARCHAR(150),
  telegram_chat_id VARCHAR(50)
);

CREATE TABLE risk_zones (
  id SERIAL PRIMARY KEY,
  city_id INT REFERENCES cities(id),
  name VARCHAR(120),
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  radius_m INT NOT NULL DEFAULT 150,
  level SMALLINT NOT NULL CHECK (level BETWEEN 1 AND 5),  -- 5 = más riesgo
  reason VARCHAR(40),                         -- 'poca_iluminacion','aislamiento','hurto','reportes'
  source VARCHAR(20) DEFAULT 'demo',          -- 'demo' | 'comunidad' | 'oficial'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE safe_points (
  id SERIAL PRIMARY KEY,
  city_id INT REFERENCES cities(id),
  name VARCHAR(120),
  type VARCHAR(30) NOT NULL,                  -- 'cai','estacion_policia','comercio_24h','luminaria'
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  source VARCHAR(20) DEFAULT 'osm'            -- 'osm' | 'demo' | 'comunidad'
);

CREATE TABLE trips (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  origin_lat DOUBLE PRECISION, origin_lng DOUBLE PRECISION, origin_label VARCHAR(200),
  dest_lat DOUBLE PRECISION, dest_lng DOUBLE PRECISION, dest_label VARCHAR(200),
  geometry JSONB NOT NULL,                    -- GeoJSON LineString de la ruta elegida
  route_type VARCHAR(10) NOT NULL,            -- 'safe' | 'fast'
  safety_score INT,
  duration_s INT, distance_m INT,
  status VARCHAR(15) DEFAULT 'active',        -- 'active' | 'completed' | 'alert' | 'cancelled'
  last_heartbeat TIMESTAMPTZ,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ
);

CREATE TABLE trip_ratings (
  id SERIAL PRIMARY KEY,
  trip_id INT UNIQUE REFERENCES trips(id) ON DELETE CASCADE,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  stars SMALLINT NOT NULL CHECK (stars BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Calificación agregada por tramo (celda de ~100 m) para retroalimentar el puntaje
CREATE TABLE segment_scores (
  cell_key VARCHAR(40) PRIMARY KEY,           -- ej. redondeo lat/lng a 3 decimales: '4.302_-74.803'
  rating_sum INT DEFAULT 0,
  rating_count INT DEFAULT 0
);

CREATE TABLE comments (
  id SERIAL PRIMARY KEY,
  trip_id INT REFERENCES trips(id) ON DELETE CASCADE,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  status VARCHAR(15) DEFAULT 'visible',       -- 'visible' | 'hidden' (moderación)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE incidents (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE SET NULL,   -- reporte puede ser anónimo hacia afuera
  city_id INT REFERENCES cities(id),
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  type VARCHAR(30) NOT NULL,                  -- 'acoso','hurto','sin_luz','zona_sola','otro'
  description TEXT,
  status VARCHAR(15) DEFAULT 'pending',       -- 'pending' | 'approved' | 'rejected'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE share_links (
  id SERIAL PRIMARY KEY,
  trip_id INT REFERENCES trips(id) ON DELETE CASCADE,
  token VARCHAR(64) UNIQUE NOT NULL,          -- aleatorio (crypto.randomBytes)
  expires_at TIMESTAMPTZ NOT NULL,
  last_lat DOUBLE PRECISION, last_lng DOUBLE PRECISION,
  last_update TIMESTAMPTZ
);

CREATE INDEX idx_trips_user ON trips(user_id);
CREATE INDEX idx_risk_city ON risk_zones(city_id);
CREATE INDEX idx_safe_city ON safe_points(city_id);
```

Seed (`db/seed.sql`): ciudad Girardot (centro aprox. lat `4.3014`, lng `-74.8031`), un usuario admin de prueba y una usuaria de prueba (con contraseñas hasheadas generadas por un script, **no** en texto plano), 5–8 `risk_zones` y 5–8 `safe_points` **de ejemplo cerca del centro con `source='demo'`**. Documentar en `docs/ARQUITECTURA.md` que son datos de demostración y que en producción se alimentan con Overpass, reportes aprobados y alianzas con la Alcaldía/Policía/Secretaría de la Mujer.

---

## 5. API Y RUTAS

### Vistas (`routes/web.js`)
| Método | Ruta | Descripción | Auth |
|---|---|---|---|
| GET | `/` | Redirige a `/map` o `/login` | — |
| GET/POST | `/register`, `/login` | Registro e inicio de sesión | — |
| POST | `/logout` | Cierra sesión | ✔ |
| GET | `/onboarding` | Tutorial de 3 pasos (primer ingreso) | ✔ |
| GET | `/map` | Pantalla principal | ✔ |
| GET | `/trip/:id` | Ruta activa | ✔ |
| GET | `/trip/:id/rate` | Calificar al terminar | ✔ |
| GET | `/history` | Historial de rutas | ✔ |
| GET | `/contacts` | Contactos de emergencia y ajustes | ✔ |
| GET | `/share/:token` | Vista pública de ubicación compartida | token |
| GET | `/admin/incidents`, `/admin/zones` | Moderación | admin |

### API JSON (`routes/api.js`, prefijo `/api`)
| Método | Ruta | Descripción | Prioridad |
|---|---|---|---|
| POST | `/auth/register`, `/auth/login` | Auth (JWT en cookie httpOnly) | P0 |
| GET | `/map/layers?city=girardot` | Zonas de riesgo + puntos seguros | P0 |
| POST | `/routes/compute` | Body: origen, destino → devuelve ruta rápida y ruta(s) segura(s) con puntaje | P0 |
| POST | `/trips` | Inicia un recorrido (guarda ruta elegida) | P0 |
| PATCH | `/trips/:id/finish` | Finaliza recorrido | P0 |
| GET | `/trips` | Historial de la usuaria | P0 |
| POST | `/trips/:id/rating` | Calificación + comentario → actualiza `segment_scores` | P0 |
| POST | `/alerts/emergency` | Registra alerta y notifica contactos | P0 (llamada `tel:123` es solo cliente) |
| GET/POST/DELETE | `/contacts` | CRUD de contactos de emergencia | P1 |
| POST | `/trips/:id/heartbeat` | Latido + ubicación actual | P1 |
| POST | `/trips/:id/share` | Genera enlace con token y expiración | P1 |
| POST | `/share/:token/location` | La usuaria actualiza su posición | P1 |
| GET | `/share/:token/stream` | SSE para quien recibe el enlace | P1 |
| POST | `/incidents` | Reporte de incidente | P1 |
| GET | `/trips/:id/comments`, POST | Comentarios | P1 |
| PATCH | `/admin/incidents/:id` | Aprobar/rechazar (aprobar crea/actualiza zona) | P1 |
| POST | `/routes/community` | Usuaria publica ruta con descripción | P2 |

Respuestas JSON consistentes: `{ ok: true, data: ... }` o `{ ok: false, error: "mensaje claro en español" }`.

---

## 6. SERVICIO DE PUNTAJE DE SEGURIDAD (`safetyScoreService.js`)

Es el **núcleo técnico**; debe estar bien comentado y con una función pura testeable.

**Flujo de `POST /api/routes/compute`:**
1. `routingService` solicita a ORS (`foot-walking`, `alternative_routes` hasta 3) la ruta rápida y alternativas. Si ORS falla o no hay API key, usar OSRM (`alternatives=true`). Si ambos fallan, responder error claro (sin romper la app).
2. Para cada ruta: muestrear puntos de su polilínea cada ~30 m (`geoUtils.sampleLine`).
3. Calcular el puntaje de 0 a 100:

```
puntaje = 100
 − Σ penalización_zona_riesgo   (por cada punto muestreado dentro de una risk_zone:
                                 nivel × 0.6, normalizado por # de puntos)
 − penalización_sin_cobertura   (tramos largos sin safe_point a < 150 m: hasta −20)
 + bonus_puntos_seguros         (cercanía a CAI/estación/comercio 24h: hasta +15)
 + ajuste_comunidad             (promedio de segment_scores de las celdas que cruza:
                                 de −10 a +10)
 − penalización_desvío          (si duración > 1.3 × duración de la ruta rápida: −(exceso))
```
   Acotar el resultado entre 0 y 100. **Hacer pesos constantes configurables en un objeto `WEIGHTS` arriba del archivo.**
4. Elegir como `safe` la alternativa con mayor puntaje que no exceda +40 % de tiempo sobre la rápida. Devolver ambas rutas en GeoJSON + `score`, `duration_s`, `distance_m`, y una **explicación legible** por qué es más segura (ej. "evita 2 zonas con poca iluminación; pasa a 80 m de una estación de policía"). La explicación evita estigmatizar barrios: describir **factores**, no etiquetar zonas como "peligrosas".
5. Si la ruta segura y la rápida coinciden, informarlo.

`overpassService.js`: consulta Overpass dentro del bbox de la ciudad para `highway=street_lamp`, `amenity=police`, `shop`/`amenity` con horario nocturno; **cachear el resultado en la tabla `safe_points`** (no consultar Overpass en cada petición). Manejar timeouts y que OSM tenga pocos datos en Girardot (fallback a datos demo).

---

## 7. FUNCIONALIDADES DE SEGURIDAD PERSONAL (detalles técnicos)

- **Botón de emergencia (P0):** botón grande, siempre visible en `/map` y `/trip/:id`. Un toque → modal de confirmación de 3 s con cancelación → abre `tel:123` y llama a `POST /api/alerts/emergency` (guarda ubicación y notifica contactos si existen). Debe funcionar con una mano y con lector de pantalla.
- **Alarma sonora:** `public/js/alarm.js` con Web Audio API (oscilador/sirena). Requiere gesto del usuario para iniciar → se "arma" al iniciar el recorrido. **Limitación a documentar honestamente:** una web no puede forzar el volumen del dispositivo al máximo; la alarma suena al volumen actual. Mostrar un aviso en el onboarding ("sube el volumen antes de salir").
- **Alarma por inactividad (P1):** al iniciar la ruta se activa un temporizador (`users.inactivity_minutes`). Se reinicia con cualquier interacción o con un botón "Estoy bien". Si vence → suena alarma, aviso en pantalla de 20 s y, si no responde, `POST /api/alerts/emergency` con `reason='inactividad'`. Usar la **Screen Wake Lock API** para que la pantalla no se apague, y enviar heartbeats cada 30 s. Documentar que en navegadores en segundo plano el funcionamiento puede ser limitado.
- **Ubicación compartida (P1):** `ShareLink` con `token = crypto.randomBytes(24).toString('hex')`, expiración (por defecto 2 h) o al terminar el recorrido. La vista pública `/share/:token` muestra solo la posición actual (sin datos personales) vía SSE. Solo se activa si la usuaria dio `consent_location`.
- **Notificaciones a contactos (P1):** `notificationService` con Telegram Bot API (gratis y simple) o, como alternativa, `mailto:`/`wa.me` con mensaje prellenado. Si no hay credenciales configuradas, simular el envío en consola y marcar `alert_sent_simulated` — no fallar.

---

## 8. UX, USABILIDAD Y ACCESIBILIDAD (WCAG 2.1 AA)

- **Mobile-first**, tipografía mínima 16 px, objetivos táctiles ≥ 44×44 px.
- **Contraste** mínimo 4.5:1; modo oscuro opcional (uso nocturno) respetando `prefers-color-scheme`.
- Etiquetas `<label>` en todos los campos, `aria-live` para mensajes de error y estado de ruta, foco visible, navegación completa por teclado, `lang="es"`, textos alternativos.
- La información **no depende solo del color**: rutas diferenciadas por color **y** por estilo de línea/etiqueta ("Ruta segura 82/100").
- **Onboarding** de 3 pantallas (qué hace la app → cómo pedir ayuda → permisos de ubicación y consentimiento).
- **Ayuda contextual:** iconos "?" con explicación breve en el mapa y en la configuración de inactividad.
- **Tareas clave en ≤ 3 toques:** pedir ayuda (1–2), trazar ruta (3).
- Mensajes de error claros y en lenguaje cotidiano. Estados de carga visibles (el ruteo externo puede tardar).
- Tono cálido y no alarmista; nada de lenguaje culpabilizante.
- Aviso visible: "Esta herramienta es un apoyo, no una garantía de seguridad. En emergencia llama al 123".

---

## 9. SEGURIDAD (checklist OWASP Top 10) — implementar y documentar

- [ ] **A01 Control de acceso:** middleware `auth` + `requireRole('admin')`; cada consulta de trips/contactos filtra por `req.user.id` (evitar IDOR).
- [ ] **A02 Fallos criptográficos:** contraseñas con `bcrypt` (cost ≥ 10); cookies `httpOnly`, `secure` (en producción), `sameSite='strict'`; HTTPS en despliegue; cifrar en reposo los campos sensibles de contactos (teléfono/email) con AES-256-GCM usando clave de entorno `DATA_KEY` (P1) — o justificar la limitación en la documentación.
- [ ] **A03 Inyección:** solo consultas parametrizadas (`$1, $2`); `express-validator` en todo input; escapar salida en EJS (`<%= %>`, no `<%- %>` con datos de usuario).
- [ ] **A04 Diseño inseguro:** minimización de datos de ubicación, enlaces con expiración, consentimiento explícito.
- [ ] **A05 Configuración incorrecta:** `helmet`, CORS restringido, sin stack traces en producción, `.env` fuera del repo.
- [ ] **A07 Autenticación:** rate limiting estricto en `/login` y `/register` (ej. 10 intentos / 15 min), política mínima de contraseña, mensaje genérico en fallo de login.
- [ ] **A08/A09:** registrar en consola/tabla eventos de seguridad (login fallido, alerta, acceso denegado).
- [ ] **A10 SSRF:** el servidor solo llama a hosts fijos (ORS, OSRM, Overpass); nunca a URLs enviadas por el cliente.
- [ ] **Moderación:** comentarios e incidentes pasan por estado `pending/visible/hidden` para evitar reportes maliciosos o difamatorios.
- [ ] **Privacidad (Ley 1581 de 2012):** pantalla de consentimiento, política de tratamiento resumida, opción de borrar cuenta y datos.

---

## 10. PLAN DE EJECUCIÓN POR FASES

> Presupuesto de tiempo orientativo para ~2,5 h. Marca cada fase como completada y registra el uso de IA (regla 3).

### FASE 0 — Andamiaje (≈ 10 min)
- Inicializar proyecto, estructura de carpetas, `package.json`, scripts (`start`, `dev`, `db:init`), `.env.example`, `.gitignore`.
- `src/app.js` con helmet, cookie-parser, json, estáticos, EJS, manejador de errores.
- **Criterio de salida:** `npm run dev` muestra una página base en `/`.

### FASE 1 — Base de datos y autenticación — P0 (≈ 25 min)
- `db/schema.sql` + `db/seed.sql` + script `npm run db:init`.
- Modelos `User`, `City`. `authController`, rutas, middleware `auth`, vistas `login`/`register` accesibles.
- **Criterio de salida:** registrarse, iniciar sesión, cookie JWT, ruta protegida redirige si no hay sesión.

### FASE 2 — Mapa y capas — P0 (≈ 25 min)
- Vista `/map` con Leaflet centrado en Girardot, `GET /api/map/layers`, pintar zonas (círculos) y puntos seguros con leyenda y alternativa textual.
- **Criterio de salida:** el mapa carga zonas y puntos desde la BD.

### FASE 3 — Ruteo y puntaje — P0 (≈ 35 min) ★ núcleo
- `routingService`, `geoUtils`, `safetyScoreService`, `POST /api/routes/compute`.
- UI: seleccionar origen/destino (clic en mapa y/o geolocalización), botón "Trazar ruta segura", mostrar ambas rutas, puntaje, diferencia de tiempo y explicación.
- Pruebas unitarias mínimas de `safetyScoreService` y `geoUtils` (Node test runner).
- **Criterio de salida:** se ven ruta rápida y segura con puntaje en pantalla.

### FASE 4 — Recorrido, historial, calificación y emergencia — P0 (≈ 25 min)
- `Trip`, `TripRating`, `segment_scores`; iniciar/finalizar recorrido; `/history`; `/trip/:id/rate`; botón de emergencia + `POST /api/alerts/emergency`.
- **Criterio de salida:** ciclo completo: trazar → iniciar → finalizar → calificar → verlo en historial; el puntaje de ese tramo cambia.

### FASE 5 — Onboarding, accesibilidad y pulido UX — P0/P1 (≈ 15 min)
- Onboarding, ayuda contextual, WCAG básico, aviso de limitaciones, estados de carga y error.

### FASE 6 — Contactos, inactividad y ubicación compartida — P1 (≈ 20 min)
- `/contacts`, alarma sonora, temporizador de inactividad, heartbeat, `ShareLink` + SSE, `notificationService`.

### FASE 7 — Comentarios, incidentes y moderación — P1 (si hay tiempo)

### FASE 8 — Despliegue y documentación — obligatoria (últimos ≈ 20 min)
- Despliegue en Render + BD en Neon/Supabase; variables de entorno; probar la URL pública de punta a punta.
- Completar `docs/ARQUITECTURA.md` (máx. 5 páginas) y `docs/IA_LOG.md`; escribir `README.md` con instalación y uso.
- **No empezar fase 6 o 7 si faltan menos de 40 minutos para la entrega sin haber desplegado.**

### P2 — Solo documentar como "trabajo futuro"
Rutas comunitarias con descripción, integración con datos oficiales de Policía/Alcaldía, app móvil nativa, modelos de ML para predecir riesgo por hora, replicación a otras ciudades vía tabla `cities`.

---

## 11. DOCUMENTACIÓN A GENERAR

### `docs/ARQUITECTURA.md` (máx. 5 páginas)
1. Problema y ODS. 2. Arquitectura MVC (diagrama simple en Mermaid). 3. Modelo de datos. 4. APIs externas y por qué se eligieron. 5. Algoritmo de puntaje y sus límites. 6. Seguridad (checklist de la sección 9, marcando qué se implementó). 7. UX/accesibilidad. 8. Escalabilidad y sostenibilidad (multi-ciudad, costos de capa gratuita, alianzas). 9. Limitaciones honestas (volumen no controlable desde web, datos demo, segundo plano, cobertura OSM). 10. Trabajo futuro.

### `docs/SUSTENTACION.md` (guion de 10 min)
Problema (1) → demo: login, ruta rápida vs. segura, iniciar, calificar, botón de emergencia (4) → arquitectura MVC y APIs (2) → seguridad y privacidad (1) → uso ético de la IA con ejemplos de lo que se corrigió (1) → escalabilidad y limitaciones (1). Incluir posibles preguntas del jurado y respuestas.

### `README.md`
Requisitos, instalación, variables de entorno, `npm run db:init`, `npm run dev`, usuarios de prueba, URL de despliegue.

---

## 12. `docs/IA_LOG.md` — PLANTILLA OBLIGATORIA

Marco de referencia: Marco Ético para la Inteligencia Artificial en Colombia (2021): transparencia, responsabilidad humana, privacidad, no discriminación, supervisión humana.

```markdown
# Registro de uso de Inteligencia Artificial

**Herramienta:** Claude Code (modelo: indicar)
**Equipo:** [nombres]  ·  **Fecha:** 4-nov-2026

## Principios que aplicamos
- Supervisión humana: el equipo revisó, probó y entiende todo el código entregado.
- Transparencia: cada uso de IA está registrado aquí.
- Privacidad y no discriminación: …
- Responsabilidad: el equipo responde por la calidad, originalidad y funcionamiento.

## Entradas
### Fase N — [nombre]
- **Prompt / instrucción relevante:** "…"
- **Qué generó la IA:** …
- **Qué revisó o corrigió el equipo:** …
- **Evaluación crítica (errores, sesgos, límites):** …
- **Tiempo estimado ahorrado / valor aportado:** …

## Reflexión final
- Dónde la IA ayudó más / menos.
- Riesgos éticos específicos de este proyecto (estigmatización de zonas, privacidad de ubicación, falsa sensación de seguridad) y cómo los mitigamos.
```

---

## 13. DEFINICIÓN DE "TERMINADO"

- [ ] Todo P0 funciona de punta a punta en la URL desplegada.
- [ ] Hay una usuaria de prueba y un admin de prueba documentados.
- [ ] Sin secretos en el repositorio; `.env.example` presente.
- [ ] Checklist de seguridad (sección 9) revisado y reflejado en la documentación.
- [ ] Revisión de accesibilidad básica hecha (teclado, contraste, etiquetas).
- [ ] `docs/IA_LOG.md` con una entrada por fase completada.
- [ ] `docs/ARQUITECTURA.md` ≤ 5 páginas, `README.md` y guion de sustentación listos.
- [ ] Código fuente comprimido/entregado antes de las **11:00 a. m.**

---

## 14. PRIMERAS INSTRUCCIONES PARA CLAUDE CODE

Empieza por la **Fase 0** y la **Fase 1**. Antes de escribir código, muestra en 10 líneas el plan de la fase y las dudas críticas (máximo 3). Al terminar cada fase: (1) ejecuta y verifica, (2) resume qué quedó funcionando, (3) agrega la entrada en `docs/IA_LOG.md`, (4) pregunta si continúa con la siguiente fase.
