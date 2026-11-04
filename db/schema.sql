-- RutaSegura Girardot · esquema de base de datos (PostgreSQL)
-- Se puede ejecutar varias veces: borra y recrea las tablas (solo para desarrollo/demo)

DROP TABLE IF EXISTS security_events, alerts, share_links, incidents, comments, segment_scores,
  trip_ratings, trips, safe_points, risk_zones, emergency_contacts, users, cities CASCADE;

CREATE TABLE cities (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(50) UNIQUE NOT NULL,
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
  role VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  city_id INT REFERENCES cities(id),
  inactivity_minutes INT DEFAULT 5 CHECK (inactivity_minutes BETWEEN 1 AND 60),
  consent_location BOOLEAN DEFAULT FALSE,     -- consentimiento Ley 1581 de 2012
  onboarding_done BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- phone y email se guardan CIFRADOS (AES-256-GCM) → por eso son TEXT
CREATE TABLE emergency_contacts (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  phone TEXT,
  email TEXT,
  telegram_chat_id VARCHAR(50)
);

CREATE TABLE risk_zones (
  id SERIAL PRIMARY KEY,
  city_id INT REFERENCES cities(id),
  name VARCHAR(120),
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  radius_m INT NOT NULL DEFAULT 150,
  level SMALLINT NOT NULL CHECK (level BETWEEN 1 AND 5),   -- 5 = más riesgo
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
  source VARCHAR(20) DEFAULT 'osm',           -- 'osm' | 'demo' | 'comunidad'
  osm_id VARCHAR(30) UNIQUE                   -- evita duplicar elementos de OpenStreetMap
);

CREATE TABLE trips (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  origin_lat DOUBLE PRECISION, origin_lng DOUBLE PRECISION, origin_label VARCHAR(200),
  dest_lat DOUBLE PRECISION, dest_lng DOUBLE PRECISION, dest_label VARCHAR(200),
  geometry JSONB NOT NULL,                    -- GeoJSON LineString de la ruta elegida
  route_type VARCHAR(10) NOT NULL CHECK (route_type IN ('safe', 'fast')),
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

-- Calificación agregada por celda de ~100 m (lat/lng redondeados a 3 decimales)
CREATE TABLE segment_scores (
  cell_key VARCHAR(40) PRIMARY KEY,           -- ej. '4.302_-74.803'
  rating_sum INT DEFAULT 0,
  rating_count INT DEFAULT 0
);

CREATE TABLE comments (
  id SERIAL PRIMARY KEY,
  trip_id INT REFERENCES trips(id) ON DELETE CASCADE,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  status VARCHAR(15) DEFAULT 'pending',       -- 'pending' | 'visible' | 'hidden' (moderación)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE incidents (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE SET NULL,
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
  token VARCHAR(64) UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  last_lat DOUBLE PRECISION, last_lng DOUBLE PRECISION,
  last_update TIMESTAMPTZ
);

-- Alertas de emergencia (botón de ayuda o inactividad)
CREATE TABLE alerts (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  trip_id INT REFERENCES trips(id) ON DELETE SET NULL,
  lat DOUBLE PRECISION, lng DOUBLE PRECISION,
  reason VARCHAR(20) NOT NULL DEFAULT 'boton',  -- 'boton' | 'inactividad'
  contacts_notified INT DEFAULT 0,
  simulated BOOLEAN DEFAULT TRUE,               -- TRUE si no hay credenciales de envío reales
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- A09: bitácora de eventos de seguridad
CREATE TABLE security_events (
  id SERIAL PRIMARY KEY,
  event VARCHAR(40) NOT NULL,
  user_id INT REFERENCES users(id) ON DELETE SET NULL,
  ip VARCHAR(64),
  detail VARCHAR(300),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_trips_user ON trips(user_id);
CREATE INDEX idx_risk_city ON risk_zones(city_id);
CREATE INDEX idx_safe_city ON safe_points(city_id);
CREATE INDEX idx_contacts_user ON emergency_contacts(user_id);
