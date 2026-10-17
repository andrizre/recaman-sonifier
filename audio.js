/* Recamán sonification engine.
   Each sequence value maps to a pitch; three synth voices are available.
   Karplus–Strong uses an AudioWorklet-free approach: a short noise burst
   fed through a feedback delay line built from standard nodes. */

const RecamanAudio = (() => {
  let ctx = null;
  let master = null;
  let reverb = null;

  function ensureCtx() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = 0.6;
      master.connect(ctx.destination);
      reverb = makeReverb(ctx, master);
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  // Simple generated impulse-response reverb (exponentially decaying noise).
  function makeReverb(ac, destination) {
    const seconds = 1.8;
    const rate = ac.sampleRate;
    const len = Math.floor(seconds * rate);
    const buf = ac.createBuffer(2, len, rate);
    for (let ch = 0; ch < 2; ch++) {
      const data = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.5);
      }
    }
    const convolver = ac.createConvolver();
    convolver.buffer = buf;
    const wet = ac.createGain();
    wet.gain.value = 0.25;
    convolver.connect(wet);
    wet.connect(destination);
    return convolver;
  }

  // Map a value to a frequency. Normalizes the sequence range into N octaves,
  // optionally quantized to a pentatonic scale.
  function valueToFreq(value, minValue, maxValue, octaves, pentatonic) {
    const span = Math.max(1, maxValue - minValue);
    let norm = (value - minValue) / span; // 0..1
    norm = 1 - norm; // low values -> low pitch feels natural for arcs
    const totalSemitones = norm * octaves * 12;
    let semis = totalSemitones;
    if (pentatonic) {
      const scale = [0, 2, 4, 7, 9];
      const octave = Math.floor(totalSemitones / 12);
      const degree = Math.round((totalSemitones - octave * 12) / 12 * (scale.length - 1));
      const clamped = Math.max(0, Math.min(scale.length - 1, degree));
      semis = octave * 12 + scale[clamped];
    }
    return 220 * Math.pow(2, semis / 12);
  }

  // --- Voices -----------------------------------------------------------

  function playPluck(ac, freq, when, dur) {
    // Noise burst -> delay feedback = Karplus–Strong plucked string.
    const burstLen = Math.floor(ac.sampleRate / freq);
    const buf = ac.createBuffer(1, Math.max(burstLen, 2), ac.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = ac.createBufferSource();
    src.buffer = buf;

    const delay = ac.createDelay(0.05);
    delay.delayTime.value = 1 / freq;
    const fb = ac.createGain();
    fb.gain.value = 0.96;
    const damp = ac.createBiquadFilter();
    damp.type = "lowpass";
    damp.frequency.value = 4000;

    const env = ac.createGain();
    env.gain.setValueAtTime(0.0001, when);
    env.gain.exponentialRampToValueAtTime(0.5, when + 0.005);
    env.gain.exponentialRampToValueAtTime(0.0001, when + dur);

    src.connect(delay);
    delay.connect(damp);
    damp.connect(fb);
    fb.connect(delay);
    delay.connect(env);
    env.connect(master);
    env.connect(reverb);
    src.start(when);
    src.stop(when + 0.01);
  }

  function playBell(ac, freq, when, dur) {
    // Simple 2-operator FM bell.
    const carrier = ac.createOscillator();
    carrier.type = "sine";
    carrier.frequency.value = freq;
    const mod = ac.createOscillator();
    mod.type = "sine";
    mod.frequency.value = freq * 2.76; // inharmonic partial -> bell timbre
    const modGain = ac.createGain();
    modGain.gain.setValueAtTime(freq * 1.5, when);
    modGain.gain.exponentialRampToValueAtTime(1, when + dur * 0.6);
    mod.connect(modGain);
    modGain.connect(carrier.frequency);

    const env = ac.createGain();
    env.gain.setValueAtTime(0.0001, when);
    env.gain.exponentialRampToValueAtTime(0.4, when + 0.004);
    env.gain.exponentialRampToValueAtTime(0.0001, when + dur * 1.4);

    carrier.connect(env);
    env.connect(master);
    env.connect(reverb);
    mod.start(when);
    carrier.start(when);
    mod.stop(when + dur * 1.5);
    carrier.stop(when + dur * 1.5);
  }

  function playSine(ac, freq, when, dur) {
    const osc = ac.createOscillator();
    osc.type = "sine";
    osc.frequency.value = freq;
    const env = ac.createGain();
    env.gain.setValueAtTime(0.0001, when);
    env.gain.exponentialRampToValueAtTime(0.35, when + 0.01);
    env.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    osc.connect(env);
    env.connect(master);
    env.connect(reverb);
    osc.start(when);
    osc.stop(when + dur * 1.1);
  }

  const voices = { pluck: playPluck, bell: playBell, sine: playSine };

  function playNote(note, instrument) {
    const ac = ensureCtx();
    const fn = voices[instrument] || playPluck;
    fn(ac, note.freq, note.when, note.dur);
  }

  function scheduleAll(notes, instrument) {
    const ac = ensureCtx();
    const fn = voices[instrument] || playPluck;
    notes.forEach((n) => fn(ac, n.freq, n.when, n.dur));
  }

  function now() {
    ensureCtx();
    return ctx.currentTime;
  }

  function stopAll() {
    if (!ctx) return;
    // Quick master fade + rebuild: simplest reliable way to silence
    // scheduled feedback voices.
    try {
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.02);
      setTimeout(() => { if (master) master.gain.setTargetAtTime(0.6, ctx.currentTime, 0.01); }, 120);
    } catch (e) { /* noop */ }
  }

  return { ensureCtx, now, scheduleAll, playNote, stopAll, valueToFreq };
})();
