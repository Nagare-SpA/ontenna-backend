# PROMPT — "Learn 2.0" en la app Ontenna (B2C / consumer)

## ROL Y MISIÓN
Trabajas DENTRO del repo existente de la app de consumo Ontenna (iOS/SwiftUI). NO es una
app nueva ni es "Ontenna School". Vas a REEMPLAZAR el módulo educativo actual (16
actividades en `Ontenna/Features/Learn/`) por un MÓDULO DE APRENDIZAJE GRANDE estilo
Duolingo, pensado para **jóvenes y adultos (12+)**. Objetivo: que miles de usuarios B2C
—muchos de los cuales NUNCA usarán School— tengan algo profundo, rejugable y con
progresión que los haga volver semanas y meses. Self-serve: sin cuentas de escuela, sin
profesor, sin currículo formal.

## PRINCIPIOS
1. **12+ (jóvenes/adultos).** Tono de autosuperación + bienestar + diversión, NO infantil,
   NO clínico. Nada de "te enseña a oír/hablar" ni "cura la sordez".
2. **No sobreprometer.** Motor mono-actuador (pelo/cuello): experiencia sensorial gruesa,
   no percepción fina de afinación. Comunícalo con honestidad.
3. **Acotado, no eterno.** Profundidad con niveles finitos por experiencia, no contenido
   infinito. Fija el alcance (6 módulos) desde el día 1; evita scope creep.
4. **Accesible.** Todo visual + háptico/luminoso; el audio nunca es el único canal. Alto
   contraste, texto escalable, color nunca como único canal (forma+etiqueta+posición).
5. **Reutiliza, no reescribas** la capa que ya existe en el repo (BLE, patrones, scoring).

## DECISIONES YA TOMADAS (no las re-preguntes)
- **Motor de contenido INDEPENDIENTE:** este Learn tiene su PROPIO contenido y datos. NO
  comparte engine ni archivos con Ontenna School. Es autónomo dentro de este repo.
- **BACKEND = el de Ontenna que la app YA usa hoy** (el Supabase de consumo/auth actual,
  el mismo que la app de Ontenna utiliza en producción). **NO** el backend creado para
  Ontenna School, **NO** el catálogo de Symphony. El contenido remoto de Learn se aloja
  como tablas nuevas DENTRO de ese backend de consumo existente; no se crea un backend nuevo
  ni se repunta `SB.client`.
- **Balanceado "un poco de todo":** los 6 módulos pesan parecido; no hay un único vertical.
- **El módulo musical NO duplica Symphony.** Symphony (pestaña Música) ya reproduce
  canciones reales con stems/arte; ese es su territorio. En Learn, lo musical es CREAR y
  JUGAR con ritmo (componer tus propios patrones, juegos de beat), nunca reproducir canciones.

## ARQUITECTURA DE CONTENIDO: módulos → experiencias → niveles
- **6 módulos.** Cada módulo tiene **4-8 experiencias**. Cada experiencia tiene **3-6
  niveles** de dificultad creciente (camino Duolingo: nodos que se desbloquean).
- ~36 experiencias × ~4 niveles ≈ **~140 unidades jugables**. Sustancial, no infinito.

### Los 6 módulos
1. **🥁 Ritmo** — sentir y dominar el pulso. Experiencias: siente el beat · sincroniza tap ·
   tempo creciente · ritmos irregulares · pulso del cuerpo · reto de ritmo. (Sin canciones
   reales — eso es Symphony.)
2. **🧩 Percepción y Memoria** — entrena tu mente con vibración. Adivina el patrón · memoria
   háptica (Simon) · ¿igual o distinto? · cadena creciente · reacción rápida · descifra.
3. **🧘 Calma y Enfoque** — bienestar por vibración. Respiración guiada · meditación
   sensorial · reset de estrés · foco/atención · rutina para dormir · ancla de calma.
4. **🎛️ Crea y Juega con Ritmo** — creatividad háptica (NO Symphony). Construye tu propio
   loop/patrón · "drum-machine" háptica simple · juegos de beat · combina vibración+luz ·
   guarda y comparte tu creación. Generativo/creativo, sin catálogo de canciones ni stems.
5. **🌍 Conciencia del Sonido** — reconoce tu entorno. ¿Qué sonido es? · entrena tus alertas ·
   sonidos de seguridad · sonidos del hogar · ¿de dónde viene? (Usa el catálogo de ~50
   sonidos del repo y el LED RGB por categoría/color.)
6. **✨ Lenguaje Háptico** — códigos y comunicación por vibración. Aprende morse jugando ·
   señales y significados · envía/recibe un mensaje · tu código secreto · retos. (Base para
   social/multi-dispositivo a futuro.)

Estrena el **LED RGB (F007)** transversalmente: color del beat, de la respiración, de cada
sonido, de tus creaciones — corre en paralelo al motor.

## SISTEMA DUOLINGO (gamificación acotada)
- **Camino visual por módulo:** nodos = experiencias/niveles que se desbloquean en orden.
- **Niveles** (3-6) por experiencia, dificultad creciente (reusa `Difficulty`).
- **XP, racha diaria, meta diaria** configurable (1-3 sesiones/día).
- **Logros/medallas** (primera racha de 7, dominar un módulo, etc.).
- **Pantalla "Tu progreso":** dominio por módulo, tiempo activo, mejor racha.
- **Sin vidas ni paywall agresivo** (acompaña a un producto físico; no es free-to-play).

## QUÉ REUTILIZAR (ya está en el repo)
- Modelos: `VibrationPattern { pulses:[Pulse{durationMs,intensity,sharpness,gapMs}] }`,
  `Difficulty` (easy/normal/hard → extiéndelo a niveles si hace falta), `ActivityProgress`
  (bestScore/streak/avgAccuracy…), `SessionResult`, `LearnPersistence` + Analytics.
- Reproducción: `OntennaPatternPlayer` (prefiere F006 autónomo; F005 en vivo; F007 LED en
  paralelo). Respeta límites ERM (no <80 ms, no >8-10 Hz) y el settle ~150 ms tras cambiar
  de modo. NO reimplementes BLE: ya funciona.
- Para el módulo 5 reutiliza el catálogo de ~50 sonidos (`SoundCatalog`/`AlertCatalog`).
- NO uses datos ni código de Ontenna School (motor independiente).

## QUÉ HACER
1. Diseña el modelo de datos propio del Learn consumer: `module → experience → level`, con
   patrón háptico por nivel y reglas de respuesta/scoring. Contenido en archivos/datos
   editables, dentro de este repo.
2. Construye el sistema de camino/niveles/XP/racha reusando scoring y persistencia.
3. Implementa los 6 módulos con sus experiencias y niveles; estrena el LED (F007).
4. Retira limpiamente las 16 actividades actuales, mapeándolas: ritmo→M1, patrones→M2,
   respiración→M3, morse→M6, alertas→M5. (Elimínalas de la UI; archiva el código si quieres.)
5. Pulido de recompensas, animaciones y feedback satisfactorio (visual + háptico).

## CONTENIDO REMOTO (backend) — catálogo que crece sin releases
El contenido (módulos/experiencias/niveles/patrones) es DATA, así que se sirve desde el
backend para crecer el catálogo y corregir patrones sin pasar por App Store.
- **Usa el BACKEND DE ONTENNA QUE LA APP YA USA HOY** (el Supabase de consumo/auth actual,
  en producción) añadiendo tablas de contenido Learn (p. ej. `learn_modules /
  learn_experiences / learn_levels`, con el `VibrationPattern` y reglas como JSON).
  **NO crees un backend nuevo. NO uses el backend de Ontenna School. NO toques el Supabase de
  Symphony ni repuntes `SB.client`.** Es el mismo proyecto Supabase que la app ya consume.
- **Offline-first (obligatorio):** la app TRAE un paquete semilla embebido que funciona sin
  red y en el primer arranque; luego descarga el **paquete de contenido más reciente**
  (versionado) y lo cachea localmente. El núcleo jugable NUNCA depende de la red.
- **Versionado:** cada publicación de contenido sube una versión; la app fija una versión y
  migra cuando descarga una nueva. Permite rollback.
- **Validación ERM en el servidor:** valida cada patrón remoto (no <80 ms, no >8-10 Hz, F006
  preferido) antes de publicarlo; la app también valida/satura al recibir, por seguridad.
- **Progreso del usuario (opcional):** sincroniza progreso/racha/medallas a la nube reusando
  la auth de consumo, para que sobreviva un cambio de teléfono. Opcional y no bloqueante:
  si no hay sesión/red, todo funciona local (como hoy con `LearnPersistence`).
- Define una **capa de repositorio** que abstraiga "contenido local vs remoto" para no atar
  la UI a la fuente; arranca con local y enchufa el remoto detrás de la misma interfaz.

## ENTREGABLE Y SECUENCIA
- **Fase 1 (esqueleto jugable):** sistema Duolingo (camino, niveles, XP, racha, progreso) +
  1 módulo vertical completo con experiencias y niveles + estreno del LED. App testeable.
  Define ya la **capa de repositorio** (local↔remoto) aunque el contenido arranque embebido.
- **Fase 1.5 (contenido remoto):** tablas de contenido en el Supabase de consumo + descarga
  versionada con caché y semilla offline + validación ERM en servidor. El catálogo ya crece
  sin releases. (Progreso en la nube: opcional, después.)
- **Fase 2 (cobertura):** los 6 módulos con 4-6 experiencias cada uno; módulo 5 con catálogo
  de sonidos; módulo 4 creativo (compositor de patrones).
- **Fase 3 (retención/social):** logros, meta diaria, compartir creaciones/códigos, y
  (futuro) retos multi-dispositivo en Lenguaje Háptico.
Cada fase: código compilable en este repo. Antes de borrar nada, lístame las 16 actuales
marcando a qué módulo nuevo migra cada una y confírmame el plan.

## NOTA
Trabajas en el REPO VIVO de la app de consumo Ontenna (no en "Ontenna Reference", que es la
copia congelada que usa School). Si algo del protocolo BLE no calza con el hardware real,
el dispositivo manda sobre la documentación.
