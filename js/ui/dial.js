/**
 * Semicircle dial: game degrees 0–160 mapped along arc (left→right).
 * Target + guess markers.
 */

/** Map game value 0–160 along the full semicircle (left = 0, right = 160). */
function polar(cx, cy, R, degreeGame) {
  const t = Math.max(0, Math.min(160, degreeGame)) / 160;
  const rad = Math.PI - t * Math.PI;
  return {
    x: cx + R * Math.cos(rad),
    y: cy - R * Math.sin(rad),
  };
}

/**
 * @param {HTMLElement} container
 * @param {object} room
 * @param {string} localPlayerUuid
 */
export function renderDial(container, room, localPlayerUuid) {
  const card = room.gameActiveCard;
  const leftLabel = card && card.valueLeft ? card.valueLeft : "—";
  const rightLabel = card && card.valueRight ? card.valueRight : "—";

  const ap = room.gameActivePlayer;
  const showTarget =
    ap && localPlayerUuid && playerUuid(ap) === localPlayerUuid;
  const targetDeg =
    room.gameTargetDegree != null ? Number(room.gameTargetDegree) : NaN;

  const cx = 200;
  const cy = 198;
  const R = 172;
  const guesses = Array.isArray(room.gameGuesses) ? room.gameGuesses : [];

  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("viewBox", "0 0 400 228");
  svg.setAttribute("class", "sp-dial-svg");
  svg.style.maxHeight = "260px";

  const defs = document.createElementNS(svgNS, "defs");
  const grad = document.createElementNS(svgNS, "linearGradient");
  grad.setAttribute("id", "spDialGrad");
  grad.setAttribute("x1", "0%");
  grad.setAttribute("y1", "0%");
  grad.setAttribute("x2", "100%");
  grad.setAttribute("y2", "0%");
  [["0%", "var(--sp-dial-1)"], ["50%", "var(--sp-dial-2)"], ["100%", "var(--sp-dial-3)"]].forEach(
    ([off, col]) => {
      const stop = document.createElementNS(svgNS, "stop");
      stop.setAttribute("offset", off);
      stop.setAttribute("style", `stop-color:${col};stop-opacity:1`);
      grad.appendChild(stop);
    }
  );
  defs.appendChild(grad);
  svg.appendChild(defs);

  const arcPath = arcPathD(cx, cy, R, 160);
  const track = document.createElementNS(svgNS, "path");
  track.setAttribute("d", arcPath);
  track.setAttribute("fill", "none");
  track.setAttribute("stroke", "url(#spDialGrad)");
  track.setAttribute("stroke-width", "14");
  track.setAttribute("stroke-linecap", "round");
  svg.appendChild(track);

  if (showTarget && !Number.isNaN(targetDeg)) {
    const t = clampDeg(targetDeg);
    const p = polar(cx, cy, R - 4, t);
    const needle = document.createElementNS(svgNS, "line");
    needle.setAttribute("x1", String(cx));
    needle.setAttribute("y1", String(cy));
    needle.setAttribute("x2", String(p.x));
    needle.setAttribute("y2", String(p.y));
    needle.setAttribute("stroke", "var(--sp-primary)");
    needle.setAttribute("stroke-width", "3");
    needle.setAttribute("stroke-linecap", "round");
    svg.appendChild(needle);

    const bull = document.createElementNS(svgNS, "circle");
    bull.setAttribute("cx", String(p.x));
    bull.setAttribute("cy", String(p.y));
    bull.setAttribute("r", "8");
    bull.setAttribute("fill", "var(--sp-primary)");
    bull.setAttribute("stroke", "#fff");
    bull.setAttribute("stroke-width", "2");
    svg.appendChild(bull);
  }

  for (const g of guesses) {
    const d = g.degree != null ? Number(g.degree) : NaN;
    if (Number.isNaN(d)) continue;
    const cc = clampDeg(d);
    const pt = polar(cx, cy, R + 4, cc);
    const dot = document.createElementNS(svgNS, "circle");
    dot.setAttribute("cx", String(pt.x));
    dot.setAttribute("cy", String(pt.y));
    dot.setAttribute("r", g.isPreview ? "5" : "7");
    dot.setAttribute("fill", g.isPreview ? "var(--sp-text-muted)" : "var(--sp-primary)");
    dot.setAttribute("opacity", g.isPreview ? "0.55" : "1");
    dot.setAttribute("stroke", "#fff");
    dot.setAttribute("stroke-width", "1");
    svg.appendChild(dot);
  }

  container.replaceChildren(svg);

  const labels = document.createElement("div");
  labels.className = "sp-dial-labels";
  labels.innerHTML = `<span class="start">${escapeHtml(leftLabel)}</span><span class="end">${escapeHtml(rightLabel)}</span>`;
  container.appendChild(labels);
}

function arcPathD(cx, cy, R, maxGameDeg) {
  const steps = 48;
  let d = "";
  for (let i = 0; i <= steps; i++) {
    const dg = (maxGameDeg * i) / steps;
    const { x, y } = polar(cx, cy, R, dg);
    d += (i === 0 ? "M " : " L ") + x.toFixed(2) + " " + y.toFixed(2);
  }
  return d;
}

function clampDeg(d) {
  if (d < 0) return 0;
  if (d > 160) return 160;
  return d;
}

function playerUuid(p) {
  return p && p.uuid ? p.uuid : "";
}

function escapeHtml(s) {
  const d = document.createElement("div");
  d.textContent = s;
  return d.innerHTML;
}
