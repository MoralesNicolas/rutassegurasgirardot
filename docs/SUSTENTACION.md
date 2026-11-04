# Guion de sustentación · RutaSegura Girardot (10 min + 5 de preguntas)

> La sustentación **se graba** y los jurados externos deciden con ese video: hablen claro, muestren la pantalla grande y hagan la demo con el celular en modo responsive (F12 → 390 px) o en un celular real proyectado.
> **Antes de empezar:** abran https://rutassegurasgirardot.onrender.com 2 minutos antes (Render Free "despierta" en ~50 s), dejen la sesión de Laura cerrada y suban el volumen.

## 0:00–1:00 · Problema (Integrante 1)
- "Una estudiante sale de clase a las 9 p. m. en Girardot. Google Maps le muestra la ruta **más rápida**, no la que tiene **más luz y más gente**."
- ODS 5 (moverse sin miedo es igualdad) y ODS 11 (ciudades seguras). Problema **translocal**: la app nace en Girardot y la tabla `cities` permite llevarla a otro municipio sin tocar el código.

## 1:00–5:00 · Demo (Integrante 2 maneja, Integrante 1 narra)
1. **Login** con `laura@rutasegura.test` → **onboarding de 3 pasos**: las dos rutas, el botón de ayuda (aviso "sube el volumen") y el consentimiento de ubicación (Ley 1581).
2. **Mapa:** círculos punteados (zonas con poca luz o reportes, marcadas como *demo*), puntos verdes (policía y comercios 24 h **reales de OpenStreetMap**) y puntitos ámbar (luminarias OSM).
3. **3 toques:** origen → destino → "Trazar ruta segura". Mostrar la línea ámbar (segura) frente a la gris punteada (rápida), los **faroles encendidos**, el número y la explicación: "evita…, pasa a 8 m de una estación de policía, 1 min más".
4. Abrir **"¿Cómo calculamos el puntaje?"** (ayuda contextual).
5. **Iniciar recorrido** → "Llegué bien" → **calificar 5★** → **historial**. Volver a trazar la misma ruta: **el puntaje sube** porque la comunidad la calificó (en las pruebas pasó de 74 a 84).
6. **Botón Ayuda:** 3 s para cancelar → alerta registrada, aviso al contacto (simulado y declarado como tal), botón de WhatsApp con el mensaje ya escrito y alarma sonora.
7. **Reportar un problema** en el mapa → cerrar sesión → entrar como `admin@rutasegura.test` → **Moderar** → aprobar → aparece la zona "comunidad". (Si piden más: la usuaria recibe 403 al entrar a /admin.)

## 5:00–7:00 · Arquitectura y APIs (Integrante 3)
- Diagrama MVC de `docs/ARQUITECTURA.md`: los modelos tienen el SQL, los controladores no; los servicios hacen el puntaje y las APIs externas.
- PostgreSQL en **Neon** + **Render** (costo $0) + JWT. Si preguntan por Azure: "lo intentamos primero; la cuenta de estudiante tiene cuota 0 de App Service en las regiones permitidas (mostrar captura) y lo documentamos como alternativa declarada".
- APIs: **OSRM peatonal (FOSSGIS)** y ORS, **Overpass** (datos abiertos OSM) y **Nominatim**. Cada una tiene un plan B si falla.
- Puntaje (`safetyScoreService`): funciones puras con **11 pruebas unitarias** (correr `npm test` si hay tiempo). Penaliza por metro expuesto a zonas, premia la cercanía a lugares de ayuda, suma la calificación comunitaria y castiga los desvíos largos. Si la mejor ruta todavía cruza una zona, pide **rutas de desvío** alrededor de ella.

## 7:00–8:00 · Seguridad y privacidad (Integrante 3)
- bcrypt, JWT en cookie httpOnly + sameSite strict, rate limit en el login, helmet con CSP, consultas parametrizadas, validación de cada entrada y salida escapada (el `<script>` de prueba sale como texto).
- **Teléfono y correo de los contactos cifrados con AES-256-GCM** (mostrar el valor cifrado en Neon si hay tiempo).
- Control por rol en el servidor, protección contra IDOR, bitácora `security_events` y borrado total de la cuenta (Ley 1581).

## 8:00–9:00 · Uso ético de la IA (Integrante 1)
- Usamos **Claude Code** y lo registramos **todo** (`docs/IA_LOG.md` + `registro-ia/` con cada prompt).
- **Ejemplos de lo que corregimos o decidimos nosotros:**
  - Elegimos Azure en vez de Render porque el reglamento pide AWS, GCP o Azure.
  - No pegamos la contraseña de la BD en el chat.
  - Cambiamos la fórmula para no diluir zonas peligrosas en rutas largas.
  - Vimos que el OSRM público solo rutea en carro y usamos el servidor peatonal.
  - Bloqueamos un comando que iba a cerrar todos los procesos del PC.
- **Marco Ético de IA de Colombia (2021):** supervisión humana (revisamos y probamos todo), transparencia (registro completo), privacidad (no se compartieron datos reales), no discriminación (la explicación describe factores y nunca barrios) y responsabilidad (el equipo responde por el código).

## 9:00–10:00 · Escalabilidad, límites y cierre (Integrante 2)
- Otra ciudad = una fila en `cities` + `npm run osm:sync`. El servidor no guarda estado, así que escala horizontalmente.
- **Límites honestos:** zonas demo, una web no puede subir el volumen, el seguimiento se pausa en segundo plano y OSM tiene pocas luminarias en Girardot.
- Cierre: "RutaSegura no promete que no pase nada: te ayuda a **decidir mejor** y a **no estar sola** si algo pasa."

## Preguntas probables del jurado
| Pregunta | Respuesta corta |
|---|---|
| ¿De dónde salen las zonas de riesgo? | Hoy son **datos demo** declarados como tales. En producción salen de reportes comunitarios **moderados** y de datos oficiales (Policía, Alcaldía, Secretaría de la Mujer). |
| ¿No estigmatiza barrios? | La app nunca nombra barrios; describe factores (luz, soledad, reportes). Cada reporte pasa por moderación humana antes de afectar el mapa. |
| ¿Qué pasa si se cae la API de rutas? | ORS → OSRM peatonal → mensaje claro. Overpass tiene espejo y los datos se guardan en la BD. |
| ¿Cómo protegen la ubicación? | Solo con consentimiento explícito. No se guarda un rastreo continuo, solo el origen, el destino y la ruta elegida. La cuenta se puede borrar con todo. |
| ¿Qué cifraron y cómo? | Teléfono y correo de los contactos con AES-256-GCM (IV único por dato, la etiqueta detecta alteraciones). Clave en variables de entorno, nunca en el repositorio. |
| ¿Por qué JWT en cookie y no en localStorage? | La cookie httpOnly no se puede leer con JavaScript (mitiga XSS) y sameSite strict mitiga CSRF. |
| ¿Cómo se valida el puntaje? | Con pruebas unitarias de su lógica. Los pesos son una propuesta inicial; el siguiente paso es calibrarlos con datos reales y calificaciones. |
| ¿Por qué no app nativa? | La web funciona en cualquier celular sin instalar nada. La limitación es el segundo plano y el volumen; la nativa es trabajo futuro. |
| ¿Qué hizo la IA y qué hicieron ustedes? | Ver `docs/IA_LOG.md`: la IA generó código y propuestas; el equipo decidió, corrigió, probó y entiende cada parte. |
