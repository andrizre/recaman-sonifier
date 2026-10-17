# recaman-sonifier

Interactive audiovisual explorer for the **Recamán sequence** — the famous
self-referential integer sequence where step `n` moves `n` backwards if the
result is positive and unseen, otherwise forwards:

```
a(n) = a(n-1) - n  if a(n-1) - n > 0 and not already seen, else a(n-1) + n
```

The sequence is drawn as alternating semicircular arcs (à la the classic
Numberphile animation) while each value is mapped to pitch and played through
one of three synthesized instruments — a Karplus–Strong pluck, an FM bell, or
a pure sine — with optional pentatonic quantization, generated-impulse reverb,
live playback highlighting, sequence statistics, and PNG export.

## Run

No build step, no dependencies, no backend:

```bash
cd recaman-sonifier
python3 -m http.server 8080
# open http://localhost:8080
```

(Or just open `index.html` directly — everything is local; audio uses the Web
Audio API, so any modern browser works.)

## Controls

- **Terms** — sequence length (10–150)
- **Tempo** — milliseconds per note
- **Octaves** — pitch range mapped from the value range
- **Instrument** — pluck / bell / sine
- **Pentatonic** — snap pitches to a pentatonic scale (more musical, less chaotic)
- **Export PNG** — save the arc drawing

## Files

- `index.html` — layout and help dialog
- `style.css` — dark theme styling
- `audio.js` — Web Audio engine (three synth voices, reverb, pitch mapping)
- `visualizer.js` — canvas arc renderer with playback highlighting
- `main.js` — sequence generation and app controller

## Concept

The Recamán sequence (OEIS A005132) looks random but is fully deterministic,
and it's an open problem whether every positive integer appears. Hearing it
makes its jagged recurrence structure obvious — clusters of low notes, sudden
leaps, near-miss repetitions — in a way the eye alone can miss.
