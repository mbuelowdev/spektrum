const GAME_DEG_MIN = 0;
const GAME_DEG_MAX = 160;

// Overlay geometry in normalized coordinates (100 x 100 viewBox).
const OVAL_CX = 52;
const OVAL_CY = 45;
const OVAL_RX = 32;
const OVAL_RY = 21;

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
  const clue = room && room.gameCluegiverGuessText ? String(room.gameCluegiverGuessText).trim() : "";
  const guesses = Array.isArray(room.gameGuesses) ? room.gameGuesses : [];
  const targetDeg = room.gameTargetDegree != null ? Number(room.gameTargetDegree) : NaN;
  const showTarget = shouldShowTarget(room, localPlayerUuid);

  const stage = document.createElement("div");
  stage.className = "sp-elliptical-dial";

  const overlay = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  overlay.setAttribute("viewBox", "0 0 100 100");
  overlay.setAttribute("class", "sp-elliptical-dial-overlay");

  const ellipseOutline = document.createElementNS("http://www.w3.org/2000/svg", "ellipse");
  ellipseOutline.setAttribute("cx", String(OVAL_CX));
  ellipseOutline.setAttribute("cy", String(OVAL_CY));
  ellipseOutline.setAttribute("rx", String(OVAL_RX));
  ellipseOutline.setAttribute("ry", String(OVAL_RY));
  ellipseOutline.setAttribute("class", "sp-elliptical-dial-hit");
  overlay.appendChild(ellipseOutline);

  const dialHitArea = document.createElementNS("http://www.w3.org/2000/svg", "ellipse");
  dialHitArea.setAttribute("cx", String(OVAL_CX));
  dialHitArea.setAttribute("cy", String(OVAL_CY));
  dialHitArea.setAttribute("rx", String(OVAL_RX));
  dialHitArea.setAttribute("ry", String(OVAL_RY));
  dialHitArea.setAttribute("class", "sp-elliptical-dial-hit-area");
  overlay.appendChild(dialHitArea);

  const lineLayer = document.createElementNS("http://www.w3.org/2000/svg", "g");
  overlay.appendChild(lineLayer);
  const markerLayer = document.createElementNS("http://www.w3.org/2000/svg", "g");
  overlay.appendChild(markerLayer);

  if (clue) {
    const clueText = document.createElementNS("http://www.w3.org/2000/svg", "text");
    clueText.setAttribute("x", String(OVAL_CX));
    clueText.setAttribute("y", String(OVAL_CY));
    clueText.setAttribute("text-anchor", "middle");
    clueText.setAttribute("dominant-baseline", "middle");
    clueText.setAttribute("class", "sp-elliptical-clue-text");
    clueText.textContent = clue;
    overlay.appendChild(clueText);
  }

  if (showTarget && Number.isFinite(targetDeg)) {
    const marker = markerLine(targetDeg, "sp-target-dot");
    markerLayer.appendChild(marker);
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
    const x = degreeToX(gameDegree);
    if (!localMarker) {
      localMarker = document.createElementNS("http://www.w3.org/2000/svg", "line");
      localMarker.setAttribute("class", "sp-elliptical-ray");
      lineLayer.appendChild(localMarker);
    }
    localMarker.setAttribute("x1", String(x));
    localMarker.setAttribute("y1", String(OVAL_CY - OVAL_RY));
    localMarker.setAttribute("x2", String(x));
    localMarker.setAttribute("y2", String(OVAL_CY + OVAL_RY));
  }

  if (Number.isFinite(localRayGameDegree)) {
    drawLocalMarker(Number(localRayGameDegree));
  }

  if (typeof onDialDegreeClick === "function") {
    overlay.classList.add("is-clickable");
    overlay.addEventListener("click", (ev) => {
      const point = svgPointFromEvent(overlay, ev);
      if (!point) return;
      if (!isPointInsideEllipse(point.x, point.y)) return;
      const gameDeg = xToGameDegree(point.x);
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

function markerLine(gameDegree, className) {
  const x = degreeToX(gameDegree);
  const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
  line.setAttribute("x1", String(x));
  line.setAttribute("y1", String(OVAL_CY - OVAL_RY));
  line.setAttribute("x2", String(x));
  line.setAttribute("y2", String(OVAL_CY + OVAL_RY));
  line.setAttribute("class", className);
  return line;
}

function degreeToX(gameDegree) {
  const clamped = clampDeg(Number(gameDegree));
  const left = OVAL_CX - OVAL_RX;
  const width = OVAL_RX * 2;
  return left + (clamped / GAME_DEG_MAX) * width;
}

function xToGameDegree(x) {
  const left = OVAL_CX - OVAL_RX;
  const right = OVAL_CX + OVAL_RX;
  const clampedX = Math.max(left, Math.min(right, x));
  const normalized = (clampedX - left) / (right - left);
  return clampDeg(normalized * GAME_DEG_MAX);
}

function isPointInsideEllipse(x, y) {
  const nx = (x - OVAL_CX) / OVAL_RX;
  const ny = (y - OVAL_CY) / OVAL_RY;
  return nx * nx + ny * ny <= 1;
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
