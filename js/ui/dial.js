/**
 * Semicircle dial: 180° total arc with 10° grey caps on both sides.
 * Game degrees (0–160) are mapped to the center 160° active span.
 * Target + guess markers.
 */

const GAME_DEG_MIN = 0;
const GAME_DEG_MAX = 160;
const DIAL_DEG_MIN = 0;
const DIAL_DEG_MAX = 180;
const DIAL_CAP_DEG = 10;
const ACTIVE_DIAL_START = DIAL_DEG_MIN + DIAL_CAP_DEG; // 10
const ACTIVE_DIAL_END = DIAL_DEG_MAX - DIAL_CAP_DEG; // 170

/** Map dial degree (0–180) along the semicircle (left = 0, right = 180). */
function polar(cx, cy, R, degreeDial) {
  const t = Math.max(DIAL_DEG_MIN, Math.min(DIAL_DEG_MAX, degreeDial)) / DIAL_DEG_MAX;
  const rad = Math.PI - t * Math.PI;
  return {
    x: cx + R * Math.cos(rad),
    y: cy - R * Math.sin(rad),
  };
}

function gameToDialDeg(gameDeg) {
  const clamped = clampDeg(gameDeg);
  return ACTIVE_DIAL_START + clamped;
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
  [
    ["0%", "var(--sp-dial-1)", "0.28"],
    ["50%", "var(--sp-dial-2)", "0.22"],
    ["100%", "var(--sp-dial-3)", "0.28"],
  ].forEach(([off, col, op]) => {
      const stop = document.createElementNS(svgNS, "stop");
      stop.setAttribute("offset", off);
      stop.setAttribute("style", `stop-color:${col};stop-opacity:${op}`);
      grad.appendChild(stop);
    });
  defs.appendChild(grad);
  svg.appendChild(defs);

  const capColor = "var(--sp-text-muted)";

  const leftCap = document.createElementNS(svgNS, "path");
  leftCap.setAttribute("d", sectorPathD(cx, cy, R, DIAL_DEG_MIN, ACTIVE_DIAL_START));
  leftCap.setAttribute("fill", capColor);
  svg.appendChild(leftCap);

  const activeTrack = document.createElementNS(svgNS, "path");
  activeTrack.setAttribute("d", sectorPathD(cx, cy, R, ACTIVE_DIAL_START, ACTIVE_DIAL_END));
  activeTrack.setAttribute("fill", "url(#spDialGrad)");
  svg.appendChild(activeTrack);

  const rightCap = document.createElementNS(svgNS, "path");
  rightCap.setAttribute("d", sectorPathD(cx, cy, R, ACTIVE_DIAL_END, DIAL_DEG_MAX));
  rightCap.setAttribute("fill", capColor);
  svg.appendChild(rightCap);

  // Base bar under the whole semicircle, matching the grey wedge color.
  const baseBar = document.createElementNS(svgNS, "rect");
  baseBar.setAttribute("x", String((cx - R).toFixed(2)));
  baseBar.setAttribute("y", String(cy.toFixed(2)));
  baseBar.setAttribute("width", String((2 * R).toFixed(2)));
  baseBar.setAttribute("height", "5");
  baseBar.setAttribute("fill", capColor);
  svg.appendChild(baseBar);

  if (showTarget && !Number.isNaN(targetDeg)) {
    const t = gameToDialDeg(targetDeg);
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
    const cc = gameToDialDeg(d);
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

function arcPathD(cx, cy, R, startDialDeg, endDialDeg) {
  const steps = 48;
  let d = "";
  for (let i = 0; i <= steps; i++) {
    const dg = startDialDeg + ((endDialDeg - startDialDeg) * i) / steps;
    const { x, y } = polar(cx, cy, R, dg);
    d += (i === 0 ? "M " : " L ") + x.toFixed(2) + " " + y.toFixed(2);
  }
  return d;
}

function sectorPathD(cx, cy, outerR, startDialDeg, endDialDeg) {
  const outerArc = arcPathD(cx, cy, outerR, startDialDeg, endDialDeg);
  return `${outerArc} L ${cx.toFixed(2)} ${cy.toFixed(2)} Z`;
}

function clampDeg(d) {
  if (d < GAME_DEG_MIN) return GAME_DEG_MIN;
  if (d > GAME_DEG_MAX) return GAME_DEG_MAX;
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
