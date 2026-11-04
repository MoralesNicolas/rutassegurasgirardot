-- Datos semilla de DEMOSTRACIÓN (source = 'demo').
-- NO son datos reales de riesgo de Girardot: son ejemplos para probar la app y deben
-- validarse con la comunidad, la Alcaldía, la Policía y la Secretaría de la Mujer.
-- Los nombres describen FACTORES (luz, soledad, reportes), nunca etiquetan barrios.
-- Las cuentas de prueba (con contraseña hasheada) las crea db/init.js.

INSERT INTO cities (slug, name, center_lat, center_lng, bbox_south, bbox_west, bbox_north, bbox_east)
VALUES ('girardot', 'Girardot, Cundinamarca', 4.3014, -74.8031, 4.2800, -74.8300, 4.3250, -74.7700);

INSERT INTO risk_zones (city_id, name, lat, lng, radius_m, level, reason, source) VALUES
  (1, 'Tramo con poca iluminación (demo)',          4.3045, -74.8065, 150, 4, 'poca_iluminacion', 'demo'),
  (1, 'Corredor solitario de noche (demo)',          4.2990, -74.8000, 120, 3, 'aislamiento',      'demo'),
  (1, 'Sector con reportes ciudadanos (demo)',       4.3070, -74.7990, 180, 5, 'reportes',         'demo'),
  (1, 'Calle con luminarias dañadas (demo)',         4.2965, -74.8075, 150, 3, 'poca_iluminacion', 'demo'),
  (1, 'Sector con reportes de hurto (demo)',         4.3020, -74.7955, 130, 4, 'hurto',            'demo'),
  (1, 'Lote sin vigilancia (demo)',                  4.3100, -74.8040, 160, 2, 'aislamiento',      'demo'),
  (1, 'Paso peatonal poco transitado (demo)',        4.2940, -74.7980, 140, 3, 'reportes',         'demo');

INSERT INTO safe_points (city_id, name, type, lat, lng, source) VALUES
  (1, 'CAI de ejemplo · Centro (demo)',           'cai',              4.3025, -74.8035, 'demo'),
  (1, 'Estación de Policía de ejemplo (demo)',    'estacion_policia', 4.3060, -74.8015, 'demo'),
  (1, 'Tienda abierta 24 h (demo)',               'comercio_24h',     4.3000, -74.8050, 'demo'),
  (1, 'Droguería 24 h (demo)',                    'comercio_24h',     4.2985, -74.8025, 'demo'),
  (1, 'CAI de ejemplo · Norte (demo)',            'cai',              4.3085, -74.8070, 'demo'),
  (1, 'Estación de servicio 24 h (demo)',         'comercio_24h',     4.2955, -74.8030, 'demo');
