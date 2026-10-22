
/* Shareable URL state: encode/decode control configuration in the URL hash.
   Format: #t<count>:m<tempo>:o<octaves>:i<instrument>:p<0|1>
   Tolerant of bogus input: invalid or out-of-range values are ignored. */

const RecamanState = (() => {
  const RANGES = {
    t: { min: 10, max: 150, def: 70 },
    m: { min: 80, max: 600, def: 300 },
    o: { min: 2, max: 6, def: 4 },
  };
  const INSTRUMENTS = ["pluck", "bell", "sine"];

  function encode(cfg) {
    const parts = [];
    if (cfg.count != null) parts.push("t" + cfg.count);
    if (cfg.tempo != null) parts.push("m" + cfg.tempo);
    if (cfg.octaves != null) parts.push("o" + cfg.octaves);
    if (cfg.instrument) parts.push("i" + cfg.instrument);
    if (cfg.pentatonic != null) parts.push("p" + (cfg.pentatonic ? 1 : 0));
    return parts.join(":");
  }

  function clampNum(v, r) {
    const n = Number(v);
    if (!Number.isFinite(n)) return null;
    return Math.min(r.max, Math.max(r.min, Math.round(n)));
  }

  function decode(hash) {
    if (!hash || typeof hash !== "string") return null;
    const out = {};
    let any = false;
    for (const part of hash.replace(/^#/, "").split(":")) {
      const m = /^([tmoip])(.*)$/.exec(part);
      if (!m) continue;
      const key = m[1], val = m[2];
      if (key === "i") {
        if (INSTRUMENTS.includes(val)) { out.instrument = val; any = true; }
      } else if (key === "p") {
        if (val === "0" || val === "1") { out.pentatonic = val === "1"; any = true; }
      } else {
        const n = clampNum(val, RANGES[key]);
        if (n !== null) {
          if (key === "t") out.count = n;
          else if (key === "m") out.tempo = n;
          else out.octaves = n;
          any = true;
        }
      }
    }
    return any ? out : null;
  }

  return { encode, decode, RANGES, INSTRUMENTS };
})();
