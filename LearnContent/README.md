# Ontenna Learn 2.0 (consumer) — Contenido semilla

Carpeta semilla del módulo de aprendizaje de la app de consumo Ontenna (audiencia **12+**).
Sirve para **dos cosas**: (1) la **semilla embebida (offline)** que la app trae de fábrica,
y (2) el **seed de ingesta** del **backend de consumo existente** (tablas `learn_modules /
learn_experiences / learn_levels`). Estructura: **módulo → experiencia → nivel**, camino
estilo Duolingo. Independiente de Ontenna School. Todos los patrones respetan el motor ERM.

## Contenido
| Archivo | Módulo | Experiencias | Niveles |
|---|---|:---:|:---:|
| module_1.json | 🥁 Ritmo | 6 | 30 |
| module_2.json | 🧩 Percepción y Memoria | 6 | 33 |
| module_3.json | 🧘 Calma y Enfoque | 6 | 26 |
| module_4.json | 🎛️ Crea y Juega con Ritmo | 6 | 26 |
| module_5.json | 🌍 Conciencia del Sonido | 6 | 28 |
| module_6.json | ✨ Lenguaje Háptico | 6 | 31 |
| **TOTAL** | **6 módulos** | **36** | **174** |

- **174 niveles jugables** (camino con desbloqueo `unlock_after`, XP, estrellas).
- Contrato de datos: [`SCHEMA.md`](SCHEMA.md).
- Todos los JSON **validan UTF-8**; patrones dentro de límites ERM (≥100 ms, ≤8-10 Hz).

## Cómo se usa
1. **App (semilla):** empaqueta estos JSON como recurso embebido → el Learn funciona offline
   y en el primer arranque.
2. **Backend de consumo (catálogo que crece):** ingiere estos JSON a las tablas de contenido
   del **Supabase de consumo que la app YA usa** (NO el de School, NO el de Symphony). Luego
   se publican versiones nuevas (`content_version`) para crecer el catálogo sin releases.
3. La app descarga el paquete más reciente, lo cachea y migra de versión; si no hay red, usa
   la semilla local.

## Notas de diseño
- **Tono 12+** (autosuperación, bienestar, diversión); no infantil, no clínico, no
  sobreprometer (mono-actuador).
- **Calma (M3)** y partes creativas (M4) usan `success_criteria: completion/creation` (valoran
  completar/crear, no "ganar"); los módulos de habilidad usan `pass/star2/star3`.
- **M4 NO duplica Symphony**: es ritmo háptico generado por el usuario, sin canciones/stems.
- **M5** usa color por categoría de sonido + firma háptica + icono/etiqueta (color nunca como
  único canal); "¿de dónde viene?" se trata como pista visual-cognitiva, sin afirmar
  localización por el cuerpo.

## Pendiente de producción
- QA en **dispositivo real** (que cada patrón se sienta como se diseñó).
- Pulido fino de valores y textos de cara al usuario; localización.
- (Opcional) ampliar experiencias/niveles vía el backend con el tiempo.
