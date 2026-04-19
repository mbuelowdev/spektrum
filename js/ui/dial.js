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
const TARGET_RED = "#c62828";
const CAP_BLUE = "#181a3c";

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
 * @param {(degree: number) => void} [onDialDegreeClick]
 * @param {number | null} [localRayGameDegree]
 */
export function renderDial(container, room, localPlayerUuid, onDialDegreeClick, localRayGameDegree) {
  const card = room.gameActiveCard;
  const leftLabel = card && card.valueLeft ? card.valueLeft : "—";
  const rightLabel = card && card.valueRight ? card.valueRight : "—";

  const ap = room.gameActivePlayer;
  const gs = room.gameState || "";
  const localTeam = teamForPlayer(room, localPlayerUuid);
  const showTarget =
    (ap && localPlayerUuid && playerUuid(ap) === localPlayerUuid) ||
    gs === "STATE_04_REVEAL";
  const targetDeg =
    room.gameTargetDegree != null ? Number(room.gameTargetDegree) : NaN;

  const cx = 200;
  const cy = 198;
  const R = 172;
  const guesses = Array.isArray(room.gameGuesses) ? room.gameGuesses : [];
  const localRayColor = TARGET_RED;

  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("viewBox", "0 0 400 228");
  svg.setAttribute("class", "sp-dial-svg");
  svg.style.maxHeight = "260px";
  const capClipId = `spCapClip-${Math.random().toString(36).slice(2, 10)}`;

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

  const rayArrow = document.createElementNS(svgNS, "marker");
  rayArrow.setAttribute("id", "spDialRayArrow");
  rayArrow.setAttribute("viewBox", "0 0 10 10");
  // Tip (x=10) is anchored on the border; marker body sits outside.
  rayArrow.setAttribute("refX", "10");
  rayArrow.setAttribute("refY", "5");
  rayArrow.setAttribute("markerWidth", "4.7");
  rayArrow.setAttribute("markerHeight", "4.7");
  rayArrow.setAttribute("orient", "auto");
  const rayArrowPath = document.createElementNS(svgNS, "path");
  rayArrowPath.setAttribute("d", "M 0 0 L 10 5 L 0 10 z");
  rayArrowPath.setAttribute("fill", localRayColor);
  rayArrow.appendChild(rayArrowPath);
  defs.appendChild(rayArrow);

  defs.appendChild(grad);
  defs.appendChild(createCapClipPath(svgNS, capClipId, cx, cy, R));
  svg.appendChild(defs);

  const capColor = CAP_BLUE;

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
  baseBar.setAttribute("height", "12");
  baseBar.setAttribute("fill", capColor);
  svg.appendChild(baseBar);
  svg.appendChild(createCapSprinkleLayer(svgNS, capClipId));

  if (showTarget && !Number.isNaN(targetDeg)) {
    // 2 points (widest), 3 points, 4 points (narrowest)
    drawTargetZoneSector(svgNS, svg, cx, cy, R, targetDeg, 45, "#f3cc4b", "0.75");
    drawTargetZoneSector(svgNS, svg, cx, cy, R, targetDeg, 27, "#e48a3a", "0.75");
    drawTargetZoneSector(svgNS, svg, cx, cy, R, targetDeg, 9, "#8ec5ff", "0.75");

    // Keep a centerline so the exact target midpoint is still readable.
    const t = gameToDialDeg(targetDeg);
    const p = polar(cx, cy, R * 0.75, t);
    const needle = document.createElementNS(svgNS, "line");
    needle.setAttribute("x1", String(cx));
    needle.setAttribute("y1", String(cy));
    needle.setAttribute("x2", String(p.x));
    needle.setAttribute("y2", String(p.y));
    needle.setAttribute("stroke", TARGET_RED);
    needle.setAttribute("stroke-opacity", "1");
    needle.setAttribute("stroke-width", "4");
    needle.setAttribute("stroke-linecap", "round");
    svg.appendChild(needle);
  }

  const centerDot = document.createElementNS(svgNS, "circle");
  centerDot.setAttribute("cx", String(cx));
  centerDot.setAttribute("cy", String(cy));
  centerDot.setAttribute("r", "30");
  centerDot.setAttribute("fill", TARGET_RED);
  svg.appendChild(centerDot);

  if (room.gameState === "STATE_04_REVEAL") {
    const teamAAvg = averageTeamGuess(room, guesses, "A");
    const teamBAvg = averageTeamGuess(room, guesses, "B");
    if (Number.isFinite(teamAAvg)) {
      const pt = polar(cx, cy, R + 4, gameToDialDeg(teamAAvg));
      svg.appendChild(createWigglyTeamMarker(svgNS, pt.x, pt.y, cx, cy, colorForTeam("A")));
    }
    if (Number.isFinite(teamBAvg)) {
      const pt = polar(cx, cy, R + 4, gameToDialDeg(teamBAvg));
      svg.appendChild(createWigglyTeamMarker(svgNS, pt.x, pt.y, cx, cy, colorForTeam("B")));
    }
  } else {
    for (const g of guesses) {
      const d = g.degree != null ? Number(g.degree) : NaN;
      if (Number.isNaN(d)) continue;
      const cc = gameToDialDeg(d);
      const pt = polar(cx, cy, R + 4, cc);
      if (g.isPreview) {
        const previewColor = colorForTeam(teamForPlayer(room, playerUuid(g.player)));
        const previewArrow = createPreviewArrow(svgNS, pt.x, pt.y, cx, cy, 20, previewColor);
        svg.appendChild(previewArrow);
        continue;
      }
      const lockedColor = colorForTeam(teamForPlayer(room, playerUuid(g.player)));
      const arrow = document.createElementNS(svgNS, "path");
      arrow.setAttribute("d", inwardArrowHeadPath(pt.x, pt.y, cx, cy, 8));
      arrow.setAttribute("fill", lockedColor);
      arrow.setAttribute("opacity", "1");
      svg.appendChild(arrow);
    }
  }

  let clickRay = null;
  function upsertClickRay(edgePoint) {
    if (!clickRay) {
      clickRay = document.createElementNS(svgNS, "line");
      clickRay.setAttribute("stroke", localRayColor);
      clickRay.setAttribute("fill", "none");
      clickRay.setAttribute("stroke-opacity", "1");
      clickRay.setAttribute("stroke-width", "2.75");
      clickRay.setAttribute("stroke-linecap", "round");
      svg.appendChild(clickRay);
    }
    // Draw from edge to center so the outside arrowhead points inward.
    clickRay.setAttribute("x1", String(edgePoint.x));
    clickRay.setAttribute("y1", String(edgePoint.y));
    clickRay.setAttribute("x2", String(cx));
    clickRay.setAttribute("y2", String(cy));
  }

  if (Number.isFinite(localRayGameDegree)) {
    const persistedDialDeg = gameToDialDeg(Number(localRayGameDegree));
    upsertClickRay(polar(cx, cy, R, persistedDialDeg));
  }

  if (typeof onDialDegreeClick === "function") {
    svg.style.cursor = "pointer";
    svg.addEventListener("click", (ev) => {
      const pt = svgPointFromEvent(svg, ev);
      if (!pt) return;
      const dialDeg = dialDegreeFromPoint(cx, cy, pt.x, pt.y);
      const edge = polar(cx, cy, R, dialDeg);

      upsertClickRay(edge);

      const gameDeg = gameDegreeFromDialClick(cx, cy, pt.x, pt.y);
      onDialDegreeClick(gameDeg);
    });
  } else {
    svg.style.cursor = "default";
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

function inwardArrowHeadPath(tipX, tipY, centerX, centerY, size) {
  const dx = centerX - tipX;
  const dy = centerY - tipY;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const px = -uy;
  const py = ux;
  const baseX = tipX - ux * size;
  const baseY = tipY - uy * size;
  const wing = size * 0.55;
  const x1 = baseX + px * wing;
  const y1 = baseY + py * wing;
  const x2 = baseX - px * wing;
  const y2 = baseY - py * wing;
  return `M ${tipX.toFixed(2)} ${tipY.toFixed(2)} L ${x1.toFixed(2)} ${y1.toFixed(2)} L ${x2.toFixed(2)} ${y2.toFixed(2)} Z`;
}

function createPreviewArrow(svgNS, tipX, tipY, centerX, centerY, size, color) {
  const previewLength = size * 1.18;
  const previewWing = size * 0.42;
  const g = document.createElementNS(svgNS, "g");
  const halo = document.createElementNS(svgNS, "path");
  halo.setAttribute("d", inwardArrowHeadPathCustom(tipX, tipY, centerX, centerY, previewLength + 2, previewWing + 1.5));
  halo.setAttribute("fill", "#ffffff");
  halo.setAttribute("opacity", "0.92");
  g.appendChild(halo);

  const arrow = document.createElementNS(svgNS, "path");
  arrow.setAttribute("d", inwardArrowHeadPathCustom(tipX, tipY, centerX, centerY, previewLength, previewWing));
  arrow.setAttribute("fill", color);
  arrow.setAttribute("stroke", "rgba(0,0,0,0.12)");
  arrow.setAttribute("stroke-width", "0.8");
  arrow.setAttribute("stroke-linejoin", "round");
  arrow.setAttribute("opacity", "0.98");
  g.appendChild(arrow);
  return g;
}

function inwardArrowHeadPathCustom(tipX, tipY, centerX, centerY, length, wing) {
  const dx = centerX - tipX;
  const dy = centerY - tipY;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const px = -uy;
  const py = ux;
  const baseX = tipX - ux * length;
  const baseY = tipY - uy * length;
  const x1 = baseX + px * wing;
  const y1 = baseY + py * wing;
  const x2 = baseX - px * wing;
  const y2 = baseY - py * wing;
  return `M ${tipX.toFixed(2)} ${tipY.toFixed(2)} L ${x1.toFixed(2)} ${y1.toFixed(2)} L ${x2.toFixed(2)} ${y2.toFixed(2)} Z`;
}

function createWigglyTeamMarker(svgNS, tipX, tipY, centerX, centerY, color) {
  const g = document.createElementNS(svgNS, "g");
  const dx = centerX - tipX;
  const dy = centerY - tipY;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const px = -uy;
  const py = ux;

  const p0x = tipX - ux * 26;
  const p0y = tipY - uy * 26;
  const c1x = tipX - ux * 18 + px * 5;
  const c1y = tipY - uy * 18 + py * 5;
  const c2x = tipX - ux * 12 - px * 5;
  const c2y = tipY - uy * 12 - py * 5;
  const p1x = tipX - ux * 6;
  const p1y = tipY - uy * 6;

  const wiggle = document.createElementNS(svgNS, "path");
  wiggle.setAttribute(
    "d",
    `M ${p0x.toFixed(2)} ${p0y.toFixed(2)} C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${p1x.toFixed(2)} ${p1y.toFixed(2)}`
  );
  wiggle.setAttribute("fill", "none");
  wiggle.setAttribute("stroke", color);
  wiggle.setAttribute("stroke-width", "3.2");
  wiggle.setAttribute("stroke-linecap", "round");
  wiggle.setAttribute("opacity", "0.95");
  g.appendChild(wiggle);

  const head = document.createElementNS(svgNS, "path");
  head.setAttribute("d", inwardArrowHeadPathCustom(tipX, tipY, centerX, centerY, 9, 4.1));
  head.setAttribute("fill", color);
  head.setAttribute("opacity", "0.98");
  g.appendChild(head);
  return g;
}

function drawTargetZoneSector(svgNS, svg, cx, cy, radius, targetGameDeg, spanGameDeg, color, opacity) {
  const half = spanGameDeg / 2;
  const startGame = Math.max(GAME_DEG_MIN, targetGameDeg - half);
  const endGame = Math.min(GAME_DEG_MAX, targetGameDeg + half);
  if (!(endGame > startGame)) return;
  const startDial = ACTIVE_DIAL_START + startGame;
  const endDial = ACTIVE_DIAL_START + endGame;
  const sector = document.createElementNS(svgNS, "path");
  sector.setAttribute("d", sectorPathD(cx, cy, radius, startDial, endDial));
  sector.setAttribute("fill", color);
  sector.setAttribute("fill-opacity", opacity);
  svg.appendChild(sector);
}

function createCapClipPath(svgNS, clipId, cx, cy, R) {
  const clip = document.createElementNS(svgNS, "clipPath");
  clip.setAttribute("id", clipId);
  const left = document.createElementNS(svgNS, "path");
  left.setAttribute("d", sectorPathD(cx, cy, R, DIAL_DEG_MIN, ACTIVE_DIAL_START));
  clip.appendChild(left);
  const right = document.createElementNS(svgNS, "path");
  right.setAttribute("d", sectorPathD(cx, cy, R, ACTIVE_DIAL_END, DIAL_DEG_MAX));
  clip.appendChild(right);
  const bar = document.createElementNS(svgNS, "rect");
  bar.setAttribute("x", String((cx - R).toFixed(2)));
  bar.setAttribute("y", String(cy.toFixed(2)));
  bar.setAttribute("width", String((2 * R).toFixed(2)));
  bar.setAttribute("height", "12");
  clip.appendChild(bar);
  return clip;
}

function createCapSprinkleLayer(svgNS, clipId) {
  const g = document.createElementNS(svgNS, "g");
  g.setAttribute("clip-path", `url(#${clipId})`);
  let seed = 9371;
  function rand() {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  }
  for (let i = 0; i < 240; i++) {
    const x = rand() * 400;
    const y = rand() * 228;
    const r = 0.75 + rand() * 0.65;
    const alpha = 0.65 + rand() * 0.22;
    const dot = document.createElementNS(svgNS, "circle");
    dot.setAttribute("cx", String(x.toFixed(2)));
    dot.setAttribute("cy", String(y.toFixed(2)));
    dot.setAttribute("r", String(r.toFixed(2)));
    dot.setAttribute("fill", `rgba(255, 255, 255, ${alpha.toFixed(2)})`);
    g.appendChild(dot);
  }
  return g;
}


function averageTeamGuess(room, guesses, team) {
  const perPlayer = new Map();
  for (const g of guesses) {
    const uid = playerUuid(g.player);
    if (!uid) continue;
    if (teamForPlayer(room, uid) !== team) continue;
    const d = g.degree != null ? Number(g.degree) : NaN;
    if (!Number.isFinite(d)) continue;
    perPlayer.set(uid, clampDeg(d));
  }
  if (!perPlayer.size) return NaN;
  let sum = 0;
  for (const v of perPlayer.values()) sum += v;
  return sum / perPlayer.size;
}

function gameDegreeFromDialClick(cx, cy, x, y) {
  const dialDeg = dialDegreeFromPoint(cx, cy, x, y);
  const gameDeg = dialDeg - DIAL_CAP_DEG;
  return clampDeg(gameDeg);
}

function dialDegreeFromPoint(cx, cy, x, y) {
  const up = Math.max(0, cy - y);
  const right = x - cx;
  const angleFromRight = Math.atan2(up, right) * (180 / Math.PI);
  return 180 - angleFromRight;
}

function svgPointFromEvent(svg, ev) {
  const rect = svg.getBoundingClientRect();
  if (!rect.width || !rect.height) return null;
  const viewBox = svg.viewBox && svg.viewBox.baseVal ? svg.viewBox.baseVal : null;
  if (!viewBox) return null;
  const sx = viewBox.width / rect.width;
  const sy = viewBox.height / rect.height;
  return {
    x: (ev.clientX - rect.left) * sx + viewBox.x,
    y: (ev.clientY - rect.top) * sy + viewBox.y,
  };
}

function clampDeg(d) {
  if (d < GAME_DEG_MIN) return GAME_DEG_MIN;
  if (d > GAME_DEG_MAX) return GAME_DEG_MAX;
  return d;
}

function teamForPlayer(room, uid) {
  if (!uid) return "";
  const inA = Array.isArray(room.playersTeamA)
    ? room.playersTeamA.some((p) => playerUuid(p) === uid)
    : false;
  if (inA) return "A";
  const inB = Array.isArray(room.playersTeamB)
    ? room.playersTeamB.some((p) => playerUuid(p) === uid)
    : false;
  if (inB) return "B";
  return "";
}

function colorForTeam(team) {
  if (team === "B") return "#7a99b4";
  return "var(--sp-primary)";
}

function playerUuid(p) {
  return p && p.uuid ? p.uuid : "";
}

function escapeHtml(s) {
  const d = document.createElement("div");
  d.textContent = s;
  return d.innerHTML;
}
