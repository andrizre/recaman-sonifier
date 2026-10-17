/* App controller: generate sequence, wire controls, drive playback loop
   with requestAnimationFrame so visuals stay in sync with scheduled audio. */

(() => {
  const countEl = document.getElementById("count");
  const tempoEl = document.getElementById("tempo");
  const octavesEl = document.getElementById("octaves");
  const instrumentEl = document.getElementById("instrument");
  const pentatonicEl = document.getElementById("pentatonic");
  const playBtn = document.getElementById("play");
  const stopBtn = document.getElementById("stop");
  const regenBtn = document.getElementById("regen");
  const exportBtn = document.getElementById("export-png");
  const helpLink = document.getElementById("help-link");
  const helpDialog = document.getElementById("help-dialog");
  const statusEl = document.getElementById("status");
  const nowNoteEl = document.getElementById("now-note");
  const seenEl = document.getElementById("seen-count");
  const collisionsEl = document.getElementById("collisions");
  const maxJumpEl = document.getElementById("max-jump");
  const countVal = document.getElementById("count-val");
  const tempoVal = document.getElementById("tempo-val");
  const octavesVal = document.getElementById("octaves-val");

  let seq = [];
  let notes = [];
  let playing = false;
  let playToken = 0; // invalidates stale rAF loops
  let seed = Math.floor(Math.random() * 1e9);

  // --- Sequence generation (optionally seeded shuffle of tie-breaking is
  // not possible: Recamán is deterministic — "regenerate" re-renders with a
  // fresh random hue + re-layout jitter instead). ---
  function generate(n) {
    const seen = new Set([0]);
    const out = [0];
    let collisions = 0;
    let maxJump = 0;
    let cur = 0;
    for (let i = 1; i <= n; i++) {
      let next = cur - i;
      const backOk = next > 0 && !seen.has(next);
      if (!backOk) next = cur + i;
      if (seen.has(next)) collisions++;
      maxJump = Math.max(maxJump, Math.abs(next - cur));
      seen.add(next);
      out.push(next);
      cur = next;
    }
    return { out, collisions, maxJump, unique: seen.size };
  }

  function buildNotes(seqArr) {
    const minV = 0;
    const maxV = Math.max(...seqArr);
    const stepMs = Number(tempoEl.value);
    const octaves = Number(octavesEl.value);
    const pent = pentatonicEl.checked;
    const start = RecamanAudio.now() + 0.15;
    return seqArr.map((v, i) => ({
      value: v,
      index: i,
      freq: RecamanAudio.valueToFreq(v, minV, maxV, octaves, pent),
      when: start + (i * stepMs) / 1000,
      dur: Math.max(0.12, (stepMs / 1000) * 0.9),
    }));
  }

  function updateStats(stats) {
    seenEl.textContent = stats.unique;
    collisionsEl.textContent = stats.collisions;
    maxJumpEl.textContent = stats.maxJump;
  }

  function regenerate() {
    seed = Math.floor(Math.random() * 1e9);
    stopPlayback();
    const n = Number(countEl.value);
    const { out, collisions, maxJump, unique } = generate(n);
    seq = out;
    updateStats({ collisions, maxJump, unique });
    RecamanVisualizer.draw(seq, -1);
    statusEl.textContent = `Recamán sequence, ${n} terms — press Play to hear it.`;
    nowNoteEl.textContent = "—";
  }

  function stopPlayback() {
    playing = false;
    playToken++;
    RecamanAudio.stopAll();
    playBtn.textContent = "▶ Play";
    playBtn.classList.remove("playing");
    if (seq.length) RecamanVisualizer.draw(seq, -1);
  }

  function play() {
    if (playing) { stopPlayback(); return; }
    RecamanAudio.ensureCtx();
    notes = buildNotes(seq);
    RecamanAudio.scheduleAll(notes, instrumentEl.value);
    playing = true;
    playBtn.textContent = "■ Stop";
    playBtn.classList.add("playing");
    statusEl.textContent = `Playing ${notes.length} notes at ${tempoEl.value} ms/step…`;

    const token = ++playToken;
    const startTime = performance.now();
    const audioStart = notes[0].when;
    const stepMs = Number(tempoEl.value);

    function frame() {
      if (!playing || token !== playToken) return;
      const elapsed = (performance.now() - startTime) / 1000;
      const idx = Math.min(notes.length - 1, Math.max(0, Math.floor((audioStart + elapsed - audioStart) / (stepMs / 1000))));
      const note = notes[idx];
      RecamanVisualizer.draw(seq, note.index);
      nowNoteEl.textContent = `a(${note.index}) = ${note.value}  ·  ${note.freq.toFixed(1)} Hz`;
      if (note.index >= notes.length - 1) {
        setTimeout(() => { if (playing && token === playToken) stopPlayback(); }, 600);
        return;
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  // --- Events ---
  countEl.addEventListener("input", () => { countVal.textContent = countEl.value; regenerate(); });
  tempoEl.addEventListener("input", () => { tempoVal.textContent = tempoEl.value; });
  octavesEl.addEventListener("input", () => { octavesVal.textContent = octavesEl.value; });
  playBtn.addEventListener("click", play);
  stopBtn.addEventListener("click", stopPlayback);
  regenBtn.addEventListener("click", regenerate);
  helpLink.addEventListener("click", (e) => { e.preventDefault(); helpDialog.showModal(); });

  exportBtn.addEventListener("click", () => {
    RecamanVisualizer.draw(seq, -1);
    const url = document.getElementById("viz").toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = "recaman.png";
    a.click();
  });

  // Init
  countVal.textContent = countEl.value;
  tempoVal.textContent = tempoEl.value;
  octavesVal.textContent = octavesEl.value;
  regenerate();
})();
