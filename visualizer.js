/* Semicircular-arc visualizer for the Recamán sequence, in the style of
   the classic Numberphile drawing: consecutive terms are joined by arcs
   alternating above/below the number line. The currently-playing note is
   highlighted with a glowing dot and the arc pulses. */

const RecamanVisualizer = (() => {
  let canvas = document.getElementById("viz");
  let ctx2d = canvas.getContext("2d");
  let dots = []; // { x, y, r } for hit-testing / playback highlight
  let layout = null;

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (layout) draw(layout.seq, layout.activeIndex);
  }

  function computeLayout(seq, width, height) {
    const minV = 0;
    const maxV = Math.max(...seq);
    const padX = 40;
    const padY = 30;
    const usable = width - padX * 2;
    const scale = usable / Math.max(1, maxV);
    const y0 = height / 2;
    const pts = seq.map((v) => ({ x: padX + v * scale, y: y0 }));
    return { pts, scale, y0, padX, width, height };
  }

  function draw(seq, activeIndex) {
    const rect = canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    if (!layout || layout.seq !== seq || layout.width !== width) {
      layout = { ...computeLayout(seq, width, height), seq };
    }
    const { pts, y0 } = layout;

    ctx2d.clearRect(0, 0, width, height);

    // number line
    ctx2d.strokeStyle = "rgba(139, 147, 167, 0.35)";
    ctx2d.lineWidth = 1;
    ctx2d.beginPath();
    ctx2d.moveTo(20, y0);
    ctx2d.lineTo(width - 20, y0);
    ctx2d.stroke();

    dots = [];
    const maxRadius = Math.min(height / 2 - 20, 260);

    seq.forEach((v, i) => {
      if (i === 0) return;
      const a = pts[i - 1];
      const b = pts[i];
      const r = Math.abs(b.x - a.x) / 2;
      if (r < 0.5) return;
      const cx = (a.x + b.x) / 2;
      const above = i % 2 === 1; // alternate arcs
      const startAngle = above ? Math.PI : 0;
      const endAngle = above ? 2 * Math.PI : Math.PI;

      const isActive = i === activeIndex;
      const isPast = activeIndex >= 0 && i <= activeIndex;
      const age = activeIndex >= 0 ? Math.max(0, 1 - (activeIndex - i) / 40) : 1;

      ctx2d.beginPath();
      ctx2d.arc(cx, y0, r, startAngle, endAngle);
      ctx2d.strokeStyle = isActive
        ? "#f97316"
        : isPast
          ? `rgba(56, 189, 248, ${0.25 + 0.55 * age})`
          : "rgba(56, 189, 248, 0.18)";
      ctx2d.lineWidth = isActive ? 4 : 1.4;
      if (isActive) {
        ctx2d.shadowColor = "#f97316";
        ctx2d.shadowBlur = 18;
      } else {
        ctx2d.shadowBlur = 0;
      }
      ctx2d.stroke();
      ctx2d.shadowBlur = 0;
    });

    // dots at visited values
    seq.forEach((v, i) => {
      const p = pts[i];
      const isActive = i === activeIndex;
      const r = isActive ? 6 : 2.5;
      ctx2d.beginPath();
      ctx2d.arc(p.x, p.y, r, 0, 2 * Math.PI);
      ctx2d.fillStyle = isActive ? "#f97316" : "rgba(232, 236, 244, 0.75)";
      if (isActive) {
        ctx2d.shadowColor = "#f97316";
        ctx2d.shadowBlur = 16;
      }
      ctx2d.fill();
      ctx2d.shadowBlur = 0;
      dots.push({ x: p.x, y: p.y, index: i, value: v });
    });
  }

  function pointAt(i) {
    return dots[i] || null;
  }

  window.addEventListener("resize", resize);
  resize();

  return { draw, pointAt, computeLayout };
})();
