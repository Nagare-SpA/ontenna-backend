# Ontenna Learn 2.0 (consumer) — Esquema de contenido

Contrato de datos del módulo de aprendizaje de la app de consumo Ontenna (12+). Sirve para
DOS cosas: (1) la **semilla embebida** (offline) de la app, y (2) el **seed de ingesta** del
backend de consumo (tablas `learn_modules / learn_experiences / learn_levels`).
Estructura: **módulo → experiencia → nivel**. Camino tipo Duolingo. Independiente de
Ontenna School (contenido propio).

Cada módulo se exporta como `LearnContent/module_<N>.json`. Todos los patrones háptico/LED
SIEMPRE dentro de los límites del motor ERM: pulsos efectivos **no <80-100 ms**, no >8-10 Hz;
**F006** (vibración autónoma) preferido; **F007** (LED RGB) corre en paralelo al motor;
**F005** = nivel PWM 0-255 (rampas/intensidad en vivo). Requiere F002=1+F003=1+F004=1 y
~150 ms de settle tras cambiar de modo.

## Enums
- `response_mechanic`: `tap` | `tap_sync` | `choose` | `replicate` | `sequence` | `breathe` | `compose` | `decode` | `freeplay` | `none`
- `skill_focus`: `rhythm` | `memory` | `perception` | `wellness` | `focus` | `creativity` | `sound_awareness` | `safety` | `communication`
- `pattern_role` (en catálogo): libre (texto corto)

## Tipos de patrón
```jsonc
"vibration_pattern": {              // → F006 (preferido)
  "pulses": [ { "durationMs": 200, "intensity": 0.8, "sharpness": 0.0, "gapMs": 200 } ],
  "f006_bytes": [2,2,0,0,0,0,0,0]   // opcional: 8 bytes en unidades de 100 ms [On1,Off1..On4,Off4]
}
"led_pattern": {                    // → F007 (15 bytes = 3×[R,G,B,On,Off], en paralelo)
  "beats": [ { "r":0,"g":0,"b":255,"onMs":300,"offMs":200 } ],
  "f007_bytes": [0,0,255,3,2, 0,0,0,0,0, 0,0,0,0,0]
}
"f005_level": 200                   // opcional: PWM 0-255 (rampas/intensidad en vivo)
```

## Estructura de `module_<N>.json`
```jsonc
{
  "content_version": "1.0.0",            // versión del paquete (para descarga remota / rollback)
  "module": {
    "id": "L1", "number": 1, "name": "Ritmo",
    "icon": "metronome.fill", "color_theme": "#FF5A3C",
    "tagline": "Siente y domina el pulso.",
    "description": "…",
    "audience": "12+", "skill_focus": ["rhythm"]
  },

  "experiences": [
    {
      "id": "L1-E2", "module_id": "L1", "order": 2,
      "name": "Sincroniza tu tap", "icon": "hand.tap.fill",
      "short_desc": "Toca al ritmo de la vibración.",
      "skill_focus": "rhythm",
      "response_mechanic": "tap_sync",
      "uses_led": true,
      "est_seconds_per_level": 120,        // 2-5 min por nivel aprox.
      "level_count": 5
    }
  ],

  "levels": [
    {
      "id": "L1-E2-lv3", "experience_id": "L1-E2", "order": 3,
      "name": "Tempo medio", "difficulty": 3,
      "goal": "Mantén el tap dentro de ±120 ms durante 16 beats.",
      "params": { "tempo_bpm": 100, "success_window_ms": 120, "beats": 16,
                  "sequence_len": null, "options": null, "span": null },
      "vibration_pattern": { "pulses":[ {"durationMs":120,"intensity":0.85,"sharpness":0,"gapMs":480} ] },
      "led_pattern": { "beats":[ {"r":255,"g":90,"b":60,"onMs":120,"offMs":480} ] },
      "f005_level": null,
      "success_criteria": { "metric":"accuracy", "pass":0.7, "star2":0.85, "star3":0.95 },
      "scoring": { "xp": 20, "tracks":["accuracy","reaction_ms"] },
      "unlock_after": "L1-E2-lv2"          // null si es el primer nivel / desbloqueado
    }
  ],

  // Catálogo de patrones reutilizables del módulo (opcional pero recomendado)
  "haptic_patterns": [
    { "id":"L1.beat_strong", "role":"beat", "description":"…",
      "vibration_pattern": { … }, "led_pattern": { … }, "f005_level": null, "erm_ok": true }
  ]
}
```

## Gamificación (cómo lo consume la app)
- El **camino** se arma por `experiences.order` y `levels.order` + `unlock_after`.
- **XP** por nivel (`scoring.xp`); racha diaria y meta diaria las gestiona la app (no el dato).
- **Estrellas** por nivel vía `success_criteria` (pass / star2 / star3).
- `est_seconds_per_level` orienta la duración (2-5 min); experiencias de bienestar pueden ser
  más largas y sin "pass" competitivo (usar `metric:"completion"`).

## Reglas de generación
1. **6 módulos**, cada uno **4-8 experiencias**, cada experiencia **3-6 niveles**.
2. Tono **12+ (jóvenes/adultos)**: autosuperación, bienestar, diversión. NO infantil, NO
   clínico, NO "te enseña a oír/hablar". No sobreprometer (mono-actuador).
3. **Patrones reales y válidos ERM** en cada nivel (usa unidades de 100 ms en `f006_bytes`/
   `f007_bytes`; `sharpness` se ignora en ERM, inclúyelo por compatibilidad).
4. IDs estables: `L<n>` módulo, `L<n>-E<k>` experiencia, `L<n>-E<k>-lv<m>` nivel.
5. Dificultad creciente real entre niveles (tempo, tolerancia, span, opciones, velocidad…).
6. Estrena el **LED (F007)** donde sume; en bienestar, brillo/colores calmados.
