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
const FINGER_SVG_PATH = "M448.159,262.68c-15.36-17.067-46.933-52.907-66.56-88.747c-1.707-1.707-24.747-39.253-50.347-67.413V84.333 C331.253,37.4,292.853-1,245.919-1h-85.333c-36.693,0-75.093,30.72-83.627,67.413c-1.707,9.387-5.12,17.067-8.533,20.48 c-8.533,10.24-18.773,34.133-18.773,65.707v136.533c0,23.893,18.773,42.667,42.667,42.667c9.387,0,18.773-3.413,25.6-8.533v8.533 c0,23.893,18.773,42.667,42.667,42.667c9.387,0,18.773-3.413,25.6-8.533c0,23.893,18.773,42.667,42.667,42.667 c9.387,0,18.773-3.413,25.6-8.533v68.267c0,23.893,18.773,42.667,42.667,42.667c23.893,0,42.667-18.773,43.52-42.667V274.627 c18.773,32.427,62.293,48.64,95.573,36.693c5.12-1.707,9.387-4.267,11.947-5.973c12.8-8.533,11.947-19.627,11.947-23.04 C460.959,277.187,460.106,276.333,448.159,262.68z M437.066,290.84c-3.413,1.707-5.973,3.413-8.533,4.267 c-22.187,7.68-58.88-2.56-75.093-30.72l-15.36-23.04c-0.338-0.676-0.779-1.247-1.291-1.729l-7.242-14.484 c-1.707-3.413-6.827-5.12-11.093-3.413c-3.413,1.707-5.12,6.827-3.413,11.093l7.68,15.36v220.16c0,14.507-11.093,25.6-25.6,25.6 c-14.507,0-25.6-11.093-25.6-25.6v-102.4V331.8V229.4c0-5.12-3.413-8.533-8.533-8.533s-8.533,3.413-8.533,8.533v102.4v34.133 c0,14.507-11.093,25.6-25.6,25.6c-14.507,0-25.6-11.093-25.6-25.6V331.8v-93.867c0-5.12-3.413-8.533-8.533-8.533 s-8.533,3.413-8.533,8.533V331.8c0,14.507-11.093,25.6-25.6,25.6c-14.507,0-25.6-11.093-25.6-25.6v-42.667V229.4 c0-5.12-3.413-8.533-8.533-8.533s-8.533,3.413-8.533,8.533v59.733c0,14.507-11.093,25.6-25.6,25.6s-25.6-11.093-25.6-25.6V152.6 c0-15.895,2.819-28.709,6.349-38.036c0.51-0.64,0.962-1.334,1.331-2.071C77.813,101.4,88.053,98.84,106.826,93.72l5.12-0.853 c4.267-1.707,7.68-6.827,5.973-11.093s-5.973-6.827-11.093-5.973l-4.267,0.853c-3.838,1.047-7.673,2.059-11.409,3.181 c0.982-3.118,1.93-6.46,2.876-10.007c5.973-29.013,37.547-53.76,66.56-53.76h85.333c37.547,0,68.267,30.72,68.267,68.267v7.726 c-1.67-1.209-3.366-2.363-5.12-3.459c-5.12-4.267-9.387-6.827-14.507-11.093c-3.413-3.413-8.533-2.56-11.947,0.853 s-2.56,8.533,0.853,11.947c5.12,5.12,10.24,8.533,15.36,11.947c5.493,3.924,10.986,7.856,16.479,12.443 c0.189,0.41,0.388,0.811,0.587,1.21c25.6,26.453,50.347,66.56,50.347,66.56c20.48,36.693,52.907,73.387,68.267,91.307 c2.56,3.413,5.973,7.68,7.68,9.387C442.186,285.72,441.333,288.28,437.066,290.84z";
const FINGER_TIP_X = 297;
const FINGER_TIP_Y = 494;
const FINGER_BASE_ANGLE_DEG = 90;
const FINGER_DOT_X = 110;
const FINGER_DOT_Y = 60;

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
  const previewRayLayer = document.createElementNS(svgNS, "g");
  svg.appendChild(previewRayLayer);

  if (showTarget && !Number.isNaN(targetDeg)) {
    // 2 points (widest), 3 points, 4 points (narrowest)
    drawTargetZoneSector(svgNS, svg, cx, cy, R, targetDeg, 45, "#f3cc4b", "0.75");
    drawTargetZoneSector(svgNS, svg, cx, cy, R, targetDeg, 27, "#e48a3a", "0.75");
    drawTargetZoneSector(svgNS, svg, cx, cy, R, targetDeg, 9, "#8ec5ff", "0.75");

  }

  const avgGuessDeg = averageCurrentGuessingTeamGuess(room, guesses);
  if (Number.isFinite(avgGuessDeg)) {
    const t = gameToDialDeg(avgGuessDeg);
    const p = polar(cx, cy, R * 0.70, t);
    const avgRay = document.createElementNS(svgNS, "line");
    avgRay.setAttribute("x1", String(cx));
    avgRay.setAttribute("y1", String(cy));
    avgRay.setAttribute("x2", String(p.x));
    avgRay.setAttribute("y2", String(p.y));
    avgRay.setAttribute("stroke", TARGET_RED);
    avgRay.setAttribute("stroke-opacity", "1");
    avgRay.setAttribute("stroke-width", "6");
    avgRay.setAttribute("stroke-linecap", "round");
    svg.appendChild(avgRay);
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
        svg.appendChild(createFingerMarker(svgNS, pt.x, pt.y, cx, cy, 30, previewColor, true));
        continue;
      }
      const lockedColor = colorForTeam(teamForPlayer(room, playerUuid(g.player)));
      svg.appendChild(createFingerMarker(svgNS, pt.x, pt.y, cx, cy, 20, lockedColor, false));
    }
  }

  let clickRay = null;
  function upsertClickRay(edgePoint) {
    if (!clickRay) {
      clickRay = document.createElementNS(svgNS, "line");
      clickRay.setAttribute("stroke", "var(--sp-text-muted)");
      clickRay.setAttribute("fill", "none");
      clickRay.setAttribute("stroke-opacity", "0.25");
      clickRay.setAttribute("stroke-width", "2.75");
      clickRay.setAttribute("stroke-linecap", "round");
      previewRayLayer.appendChild(clickRay);
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

function createFingerMarker(svgNS, tipX, tipY, centerX, centerY, size, color, withHalo) {
  const g = document.createElementNS(svgNS, "g");
  const angle = (Math.atan2(centerY - tipY, centerX - tipX) * 180) / Math.PI;
  const rotateDeg = angle - FINGER_BASE_ANGLE_DEG;
  const scale = size / 560;
  g.setAttribute(
    "transform",
    `translate(${tipX.toFixed(2)} ${tipY.toFixed(2)}) rotate(${rotateDeg.toFixed(2)}) scale(${scale.toFixed(4)}) translate(${-FINGER_TIP_X} ${-FINGER_TIP_Y})`
  );
  if (withHalo) {
    const shadow = document.createElementNS(svgNS, "path");
    shadow.setAttribute("d", FINGER_SVG_PATH);
    shadow.setAttribute("fill", "none");
    shadow.setAttribute("stroke", "rgba(0,0,0,0.18)");
    shadow.setAttribute("stroke-width", "2.2");
    shadow.setAttribute("transform", "scale(1.03)");
    g.appendChild(shadow);
  }
  const finger = document.createElementNS(svgNS, "path");
  finger.setAttribute("d", FINGER_SVG_PATH);
  finger.setAttribute("fill", "#000000");
  finger.setAttribute("fill-rule", "nonzero");
  finger.setAttribute("clip-rule", "nonzero");
  finger.setAttribute("stroke", "#000000");
  finger.setAttribute("stroke-width", withHalo ? "1.2" : "1");
  finger.setAttribute("stroke-linejoin", "round");
  finger.setAttribute("opacity", "0.98");
  g.appendChild(finger);

  const teamDot = document.createElementNS(svgNS, "circle");
  teamDot.setAttribute("cx", String(FINGER_DOT_X));
  teamDot.setAttribute("cy", String(FINGER_DOT_Y));
  teamDot.setAttribute("r", withHalo ? "72" : "60");
  teamDot.setAttribute("fill", color);
  teamDot.setAttribute("stroke", "#000000");
  teamDot.setAttribute("stroke-width", withHalo ? "8" : "6");
  teamDot.setAttribute("opacity", "0.95");
  g.appendChild(teamDot);
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

function averageCurrentGuessingTeamGuess(room, guesses) {
  const gs = room && room.gameState ? String(room.gameState) : "";
  if (
    gs !== "STATE_02_GUESS_ROUND" &&
    gs !== "STATE_03_COUNTER_GUESS_ROUND" &&
    gs !== "STATE_04_REVEAL"
  ) {
    return NaN;
  }
  const first = firstGuessingTeamByRound(room);
  const currentGuessingTeam =
    gs === "STATE_03_COUNTER_GUESS_ROUND" || gs === "STATE_04_REVEAL"
      ? counterTeamName(first)
      : first;
  return averageTeamGuess(room, guesses, currentGuessingTeam);
}

function firstGuessingTeamByRound(room) {
  const idx = Number(room && room.gameRoundIndex != null ? room.gameRoundIndex : 0);
  return Number.isFinite(idx) && idx % 2 !== 0 ? "B" : "A";
}

function counterTeamName(team) {
  return team === "A" ? "B" : "A";
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
