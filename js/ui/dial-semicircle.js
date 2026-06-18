const GAME_DEG_MIN = 0;
const GAME_DEG_MAX = 160;

/** Reference size of assets/dial-background.png */
export const DIAL_BG_IMAGE = { width: 1536, height: 1024 };

/**
 * Default semicircle in SVG viewBox units (0–100), aligned to dial-background.png.
 * Normalized on 1536×1024 image: cx=0.521, cy=0.677, r=0.475
 */
export const DEFAULT_ARC_GEOMETRY = { cx: 52.1, cy: 67.7, r: 47.5 };

/**
 * @param {Partial<{ cx: number, cy: number, r: number }> | null | undefined} geometry
 * @returns {{ cx: number, cy: number, r: number }}
 */
export function normalizeArcGeometry(geometry) {
  const source = geometry && typeof geometry === "object" ? geometry : DEFAULT_ARC_GEOMETRY;
  return {
    cx: clampNumber(source.cx, DEFAULT_ARC_GEOMETRY.cx, 0, 100),
    cy: clampNumber(source.cy, DEFAULT_ARC_GEOMETRY.cy, 0, 100),
    r: clampNumber(source.r, DEFAULT_ARC_GEOMETRY.r, 1, 50),
  };
}

/**
 * Map viewBox geometry to pixel coordinates on dial-background.png.
 * @param {{ cx: number, cy: number, r: number }} geometry
 */
export function viewBoxToImageCoords(geometry) {
  const arc = normalizeArcGeometry(geometry);
  const { width, height } = DIAL_BG_IMAGE;
  return {
    cx: (arc.cx / 100) * width,
    cy: (arc.cy / 100) * height,
    rX: (arc.r / 100) * width,
    rY: (arc.r / 100) * height,
  };
}

/**
 * @param {{ cx: number, cy: number, r: number }} geometry
 */
export function formatDialArcReadout(geometry) {
  const arc = normalizeArcGeometry(geometry);
  const img = viewBoxToImageCoords(arc);
  const { width, height } = DIAL_BG_IMAGE;
  return {
    viewBox: {
      cx: round(arc.cx, 2),
      cy: round(arc.cy, 2),
      r: round(arc.r, 2),
    },
    imagePx: {
      cx: Math.round(img.cx),
      cy: Math.round(img.cy),
      rX: Math.round(img.rX),
      rY: Math.round(img.rY),
    },
    normalized: {
      cx: round(arc.cx / 100, 4),
      cy: round(arc.cy / 100, 4),
      r: round(arc.r / 100, 4),
    },
    imageSize: { width, height },
    text: [
      `ViewBox (0–100): cx=${round(arc.cx, 2)}, cy=${round(arc.cy, 2)}, r=${round(arc.r, 2)}`,
      `Image (${width}×${height} px): cx=${Math.round(img.cx)}, cy=${Math.round(img.cy)}, rX=${Math.round(img.rX)}, rY=${Math.round(img.rY)}`,
      `Normalized (0–1): cx=${round(arc.cx / 100, 4)}, cy=${round(arc.cy / 100, 4)}, r=${round(arc.r / 100, 4)}`,
    ].join("\n"),
  };
}

/**
 * @param {HTMLElement} container
 * @param {object} room
 * @param {string} localPlayerUuid
 * @param {(degree: number) => void} [onDialDegreeClick]
 * @param {number | null} [localRayGameDegree]
 * @param {{ cx: number, cy: number, r: number }} [arcGeometry]
 */
export function renderDial(
  container,
  room,
  localPlayerUuid,
  onDialDegreeClick,
  localRayGameDegree,
  arcGeometry = DEFAULT_ARC_GEOMETRY,
) {
  const arc = normalizeArcGeometry(arcGeometry);
  const card = room.gameActiveCard;
  const leftLabel = card && card.valueLeft ? card.valueLeft : "—";
  const rightLabel = card && card.valueRight ? card.valueRight : "—";
  const clue = room && room.gameCluegiverGuessText ? String(room.gameCluegiverGuessText).trim() : "";
  const guesses = Array.isArray(room.gameGuesses) ? room.gameGuesses : [];
  const targetDeg = room.gameTargetDegree != null ? Number(room.gameTargetDegree) : NaN;
  const showTarget = shouldShowTarget(room, localPlayerUuid);

  const stage = document.createElement("div");
  stage.className = "sp-dial";

  const overlay = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  overlay.setAttribute("viewBox", "0 0 100 100");
  overlay.setAttribute("class", "sp-dial-overlay");

  const arcOutline = document.createElementNS("http://www.w3.org/2000/svg", "path");
  arcOutline.setAttribute("d", semicircleArcPathD(arc.cx, arc.cy, arc.r));
  arcOutline.setAttribute("class", "sp-dial-hit-outline");
  overlay.appendChild(arcOutline);

  const dialHitArea = document.createElementNS("http://www.w3.org/2000/svg", "path");
  dialHitArea.setAttribute("d", semicircleSectorPathD(arc.cx, arc.cy, arc.r));
  dialHitArea.setAttribute("class", "sp-dial-hit-area");
  overlay.appendChild(dialHitArea);

  const lineLayer = document.createElementNS("http://www.w3.org/2000/svg", "g");
  overlay.appendChild(lineLayer);
  const markerLayer = document.createElementNS("http://www.w3.org/2000/svg", "g");
  overlay.appendChild(markerLayer);

  if (clue) {
    const clueText = document.createElementNS("http://www.w3.org/2000/svg", "text");
    clueText.setAttribute("x", String(arc.cx));
    clueText.setAttribute("y", String(arc.cy - arc.r * 0.35));
    clueText.setAttribute("text-anchor", "middle");
    clueText.setAttribute("dominant-baseline", "middle");
    clueText.setAttribute("class", "sp-dial-clue-text");
    clueText.textContent = clue;
    overlay.appendChild(clueText);
  }

  function markerLine(gameDegree, className) {
    const edge = polar(arc.cx, arc.cy, arc.r, gameToDialDeg(gameDegree));
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", String(arc.cx));
    line.setAttribute("y1", String(arc.cy));
    line.setAttribute("x2", String(edge.x));
    line.setAttribute("y2", String(edge.y));
    line.setAttribute("class", className);
    return line;
  }

  if (showTarget && Number.isFinite(targetDeg)) {
    markerLayer.appendChild(markerLine(targetDeg, "sp-target-dot"));
  }

  const avgGuessDeg = averageCurrentGuessingTeamGuess(room, guesses);
  if (Number.isFinite(avgGuessDeg)) {
    markerLayer.appendChild(markerLine(avgGuessDeg, "sp-team-avg-dot"));
  }

  for (const g of guesses) {
    const degree = g && g.degree != null ? Number(g.degree) : NaN;
    if (!Number.isFinite(degree)) continue;
    markerLayer.appendChild(markerLine(degree, g.isPreview ? "sp-preview-dot" : "sp-guess-dot"));
  }

  let localMarker = null;
  function drawLocalMarker(gameDegree) {
    const edge = polar(arc.cx, arc.cy, arc.r, gameToDialDeg(gameDegree));
    if (!localMarker) {
      localMarker = document.createElementNS("http://www.w3.org/2000/svg", "line");
      localMarker.setAttribute("class", "sp-dial-ray");
      lineLayer.appendChild(localMarker);
    }
    localMarker.setAttribute("x1", String(arc.cx));
    localMarker.setAttribute("y1", String(arc.cy));
    localMarker.setAttribute("x2", String(edge.x));
    localMarker.setAttribute("y2", String(edge.y));
  }

  if (Number.isFinite(localRayGameDegree)) {
    drawLocalMarker(Number(localRayGameDegree));
  }

  if (typeof onDialDegreeClick === "function") {
    overlay.classList.add("is-clickable");
    overlay.addEventListener("click", (ev) => {
      const point = svgPointFromEvent(overlay, ev);
      if (!point) return;
      if (!isPointInsideSemicircle(point.x, point.y, arc)) return;
      const gameDeg = gameDegreeFromPoint(point.x, point.y, arc);
      drawLocalMarker(gameDeg);
      onDialDegreeClick(gameDeg);
    });
  }

  stage.appendChild(overlay);
  container.replaceChildren(stage);

  const labels = document.createElement("div");
  labels.className = "sp-dial-labels";
  labels.innerHTML = `<span class="start">${escapeHtml(leftLabel)}</span><span class="end">${escapeHtml(rightLabel)}</span>`;
  container.appendChild(labels);
}

function shouldShowTarget(room, localPlayerUuid) {
  const ap = room.gameActivePlayer;
  const gs = room.gameState || "";
  return (
    (ap && localPlayerUuid && playerUuid(ap) === localPlayerUuid) ||
    gs === "STATE_04_REVEAL"
  );
}

/** Map dial degree (0–180) along the semicircle (left = 0, right = 180). */
function polar(cx, cy, R, dialDeg) {
  const t = Math.max(0, Math.min(180, dialDeg)) / 180;
  const rad = Math.PI - t * Math.PI;
  return {
    x: cx + R * Math.cos(rad),
    y: cy - R * Math.sin(rad),
  };
}

function gameToDialDeg(gameDeg) {
  return (clampDeg(Number(gameDeg)) / GAME_DEG_MAX) * 180;
}

function semicircleSectorPathD(cx, cy, R) {
  return `M ${(cx - R).toFixed(2)} ${cy.toFixed(2)} A ${R} ${R} 0 0 1 ${(cx + R).toFixed(2)} ${cy.toFixed(2)} Z`;
}

function semicircleArcPathD(cx, cy, R) {
  return `M ${(cx - R).toFixed(2)} ${cy.toFixed(2)} A ${R} ${R} 0 0 1 ${(cx + R).toFixed(2)} ${cy.toFixed(2)}`;
}

function dialDegreeFromPoint(x, y, arc) {
  const up = Math.max(0, arc.cy - y);
  const right = x - arc.cx;
  const angleFromRight = Math.atan2(up, right) * (180 / Math.PI);
  return 180 - angleFromRight;
}

function gameDegreeFromPoint(x, y, arc) {
  const dialDeg = dialDegreeFromPoint(x, y, arc);
  return clampDeg((dialDeg / 180) * GAME_DEG_MAX);
}

function isPointInsideSemicircle(x, y, arc) {
  const dx = x - arc.cx;
  const dy = y - arc.cy;
  if (dy > 0) return false;
  return dx * dx + dy * dy <= arc.r * arc.r;
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
  return averageTeamGuess(room, guesses, first);
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
  for (const value of perPlayer.values()) sum += value;
  return sum / perPlayer.size;
}

function firstGuessingTeamByRound(room) {
  const idx = Number(room && room.gameRoundIndex != null ? room.gameRoundIndex : 0);
  return Number.isFinite(idx) && idx % 2 !== 0 ? "B" : "A";
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

function clampDeg(degree) {
  if (degree < GAME_DEG_MIN) return GAME_DEG_MIN;
  if (degree > GAME_DEG_MAX) return GAME_DEG_MAX;
  return degree;
}

function clampNumber(value, fallback, min, max) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function round(value, digits) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
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

function playerUuid(player) {
  return player && player.uuid ? player.uuid : "";
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
