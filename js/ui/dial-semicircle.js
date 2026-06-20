import { counterTeam, findPlayerTeam } from "../gameLogic.js";

export const GAME_DEG_MIN = 0;
export const GAME_DEG_MAX = 160;

/** Reference size of assets/dial-background.png */
export const DIAL_BG_IMAGE = { width: 1536, height: 1024 };

const DIAL_PIN_HREF = "/assets/dial-pin.png";
/** Pin asset is 12×13 px on dial-background.png — size in SVG viewBox units (0–100). */
const DIAL_PIN_ASSET = { w: 12, h: 13 };
const DIAL_PIN_SCALE = 2;
const DIAL_PIN_SIZE = {
  w: (DIAL_PIN_ASSET.w / DIAL_BG_IMAGE.width) * 100 * DIAL_PIN_SCALE,
  h: (DIAL_PIN_ASSET.h / DIAL_BG_IMAGE.height) * 100 * DIAL_PIN_SCALE,
};
/** Nudge pin down in viewBox units so the artwork aligns with the click point. */
const DIAL_PIN_Y_OFFSET = DIAL_PIN_SIZE.h * 0.33;

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
 * @typedef {{ degree: number, distance: number }} DialGuess
 */

/**
 * @param {HTMLElement} container
 * @param {object} room
 * @param {string} localPlayerUuid
 * @param {(guess: DialGuess) => void} [onDialGuessClick]
 * @param {DialGuess | null} [localGuess]
 * @param {{ cx: number, cy: number, r: number }} [arcGeometry]
 */
export function renderDial(
  container,
  room,
  localPlayerUuid,
  onDialGuessClick,
  localGuess,
  arcGeometry = DEFAULT_ARC_GEOMETRY,
) {
  const arc = normalizeArcGeometry(arcGeometry);
  const card = room.gameActiveCard;
  const leftLabel = card?.valueLeft ? String(card.valueLeft).trim() : "";
  const rightLabel = card?.valueRight ? String(card.valueRight).trim() : "";
  const showCardLabels = Boolean(leftLabel || rightLabel);
  const guesses = Array.isArray(room.gameGuesses) ? room.gameGuesses : [];
  const targetDeg = room.gameTargetDegree != null ? Number(room.gameTargetDegree) : NaN;
  const showTarget = shouldShowTarget(room, localPlayerUuid);

  const stage = document.createElement("div");
  stage.className = "sp-dial";

  const overlay = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  overlay.setAttribute("viewBox", "0 0 100 100");
  overlay.setAttribute("class", "sp-dial-overlay");
  ensureTargetStripePattern(overlay);

  const arcGuide = document.createElementNS("http://www.w3.org/2000/svg", "g");
  arcGuide.setAttribute("class", "sp-dial-arc-guide");

  const arcOutline = document.createElementNS("http://www.w3.org/2000/svg", "path");
  arcOutline.setAttribute("d", semicircleArcPathD(arc.cx, arc.cy, arc.r));
  arcOutline.setAttribute("class", "sp-dial-hit-outline");
  arcGuide.appendChild(arcOutline);

  const dialHitArea = document.createElementNS("http://www.w3.org/2000/svg", "path");
  dialHitArea.setAttribute("d", semicircleSectorPathD(arc.cx, arc.cy, arc.r));
  dialHitArea.setAttribute("class", "sp-dial-hit-area");
  arcGuide.appendChild(dialHitArea);

  overlay.appendChild(arcGuide);

  const lineLayer = document.createElementNS("http://www.w3.org/2000/svg", "g");
  overlay.appendChild(lineLayer);
  const pinLayer = document.createElementNS("http://www.w3.org/2000/svg", "g");
  overlay.appendChild(pinLayer);

  const cardTextY = arc.cy - arc.r * DIAL_CARD_TEXT_RADIUS_RATIO;

  if (showCardLabels) {
    const cardGroup = createCardValueGroup(leftLabel, rightLabel);
    cardGroup.setAttribute("transform", `translate(${arc.cx}, ${cardTextY})`);
    overlay.appendChild(cardGroup);
  }

  function appendGuessVisual(point, pinClass, lineClass, counterTeamStyle = false) {
    lineLayer.appendChild(guessStringRay(arc.cx, arc.cy, point, lineClass, counterTeamStyle));
    pinLayer.appendChild(createDialPin(point, pinClass));
  }

  function appendTargetVisual(point) {
    lineLayer.appendChild(guessStringRay(arc.cx, arc.cy, point, "sp-guess-ray sp-target-ray"));
    pinLayer.appendChild(createDialPin(point, "sp-dial-pin sp-dial-pin-guess"));
  }

  for (const g of guesses) {
    const parsed = guessFromRecord(g);
    if (!parsed) continue;
    const uid = playerUuid(g.player);
    if (localGuess && uid && uid === localPlayerUuid) {
      continue;
    }
    const counterTeamStyle = isCounterTeamPlayer(room, uid);
    appendGuessVisual(
      guessPointFromPolar(arc, parsed.degree, parsed.distance),
      g.isPreview ? "sp-dial-pin sp-dial-pin-preview" : "sp-dial-pin sp-dial-pin-guess",
      g.isPreview ? "sp-guess-ray sp-guess-ray-preview" : "sp-guess-ray sp-guess-ray-guess",
      counterTeamStyle,
    );
  }

  function drawLocalPin(guess, point) {
    pinLayer.querySelectorAll(".sp-dial-pin-local").forEach((node) => node.remove());
    lineLayer.querySelectorAll(".sp-guess-ray-local").forEach((node) => node.remove());
    if (!guess) return;
    const pt = point ?? guessPointFromPolar(arc, guess.degree, guess.distance);
    appendGuessVisual(
      pt,
      "sp-dial-pin sp-dial-pin-local",
      "sp-guess-ray sp-guess-ray-local",
      isCounterTeamPlayer(room, localPlayerUuid),
    );
  }

  if (localGuess && Number.isFinite(localGuess.degree) && Number.isFinite(localGuess.distance)) {
    drawLocalPin(localGuess);
  }

  if (showTarget && Number.isFinite(targetDeg)) {
    appendTargetVisual(guessPointFromPolar(arc, targetDeg, 1));
  }

  if (typeof onDialGuessClick === "function") {
    overlay.classList.add("is-clickable");
    overlay.addEventListener("click", (ev) => {
      const point = svgPointFromEvent(overlay, ev);
      if (!point) return;
      if (!isPointInsideSemicircle(point.x, point.y, arc)) return;
      const guess = guessFromPoint(point.x, point.y, arc);
      drawLocalPin(guess, point);
      onDialGuessClick(guess);
    });
  }

  const centerPinLayer = document.createElementNS("http://www.w3.org/2000/svg", "g");
  centerPinLayer.setAttribute("class", "sp-dial-pin-layer-center");
  centerPinLayer.appendChild(
    createDialPin({ x: arc.cx, y: arc.cy }, "sp-dial-pin sp-dial-pin-center", { anchor: "center" }),
  );
  overlay.appendChild(centerPinLayer);

  stage.appendChild(overlay);
  container.replaceChildren(stage);

  const labels = document.createElement("div");
  labels.className = "sp-dial-labels sp-dial-labels-layout-only";
  labels.setAttribute("aria-hidden", "true");
  labels.innerHTML = `<span class="start">&nbsp;</span><span class="end">&nbsp;</span>`;
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

/**
 * Format guess for game-action `value`: angle (0–160) and normalized distance (0–1).
 * @param {{ degree: number, distance: number }} guess
 */
export function formatDialGuessValue(guess) {
  return `${formatDialNumber(guess.degree)},${formatDialNumber(guess.distance)}`;
}

/**
 * Parse game-action `value` or room guess fields into angle + distance.
 * @param {string | number | null | undefined} raw
 * @param {number | null | undefined} [distanceFallback]
 * @returns {{ ok: true, guess: DialGuess } | { ok: false }}
 */
export function parseDialGuessValue(raw, distanceFallback) {
  const text = raw == null ? "" : String(raw).trim();
  if (text === "") {
    return { ok: false };
  }
  const parts = text.split(",");
  const degree = Number(parts[0]);
  if (!Number.isFinite(degree) || degree < GAME_DEG_MIN || degree > GAME_DEG_MAX) {
    return { ok: false };
  }
  let distance = parts.length > 1 ? Number(parts[1]) : Number(distanceFallback);
  if (!Number.isFinite(distance)) {
    distance = 1;
  }
  if (distance < 0 || distance > 1) {
    return { ok: false };
  }
  return {
    ok: true,
    guess: { degree: clampDeg(degree), distance: clampDistance(distance) },
  };
}

/** @param {object | null | undefined} record */
export function guessFromRecord(record) {
  if (!record) return null;
  const degree = record.degree != null ? Number(record.degree) : NaN;
  if (!Number.isFinite(degree)) return null;
  let distance = record.distance != null ? Number(record.distance) : NaN;
  if (!Number.isFinite(distance)) {
    const parsed = parseDialGuessValue(record.value);
    distance = parsed.ok ? parsed.guess.distance : 1;
  }
  return {
    degree: clampDeg(degree),
    distance: clampDistance(distance),
  };
}

export function formatDialNumber(n) {
  const rounded = Math.round(n * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2).replace(/\.?0+$/, "");
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

function distanceFromPoint(x, y, arc) {
  const dx = x - arc.cx;
  const dy = y - arc.cy;
  return clampDistance(Math.sqrt(dx * dx + dy * dy) / arc.r);
}

/** @returns {DialGuess} */
function guessFromPoint(x, y, arc) {
  return {
    degree: gameDegreeFromPoint(x, y, arc),
    distance: distanceFromPoint(x, y, arc),
  };
}

/** @param {{ cx: number, cy: number, r: number }} arc */
function guessPointFromPolar(arc, gameDegree, distance) {
  return polar(arc.cx, arc.cy, arc.r * clampDistance(distance), gameToDialDeg(gameDegree));
}

function guessStringRay(x1, y1, point, className, counterTeamStyle = false) {
  const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
  group.setAttribute(
    "class",
    counterTeamStyle ? `${className} sp-guess-ray-counter` : className,
  );
  group.setAttribute("pointer-events", "none");

  const d = stringPathD(x1, y1, point.x, point.y, 0);
  const dTwist = stringPathD(x1, y1, point.x, point.y, 1);

  const shadow = document.createElementNS("http://www.w3.org/2000/svg", "path");
  shadow.setAttribute("d", d);
  shadow.setAttribute("class", "sp-guess-ray-shadow");
  group.appendChild(shadow);

  if (className.includes("sp-target-ray")) {
    const stripeStrand = document.createElementNS("http://www.w3.org/2000/svg", "path");
    stripeStrand.setAttribute("d", d);
    stripeStrand.setAttribute("class", "sp-guess-ray-stroke sp-target-ray-stripe");
    group.appendChild(stripeStrand);
    return group;
  }

  const darkPath = counterTeamStyle ? dTwist : d;
  const lightPath = counterTeamStyle ? d : dTwist;

  const darkStrand = document.createElementNS("http://www.w3.org/2000/svg", "path");
  darkStrand.setAttribute("d", darkPath);
  darkStrand.setAttribute("class", "sp-guess-ray-stroke sp-guess-ray-strand-dark");

  const lightStrand = document.createElementNS("http://www.w3.org/2000/svg", "path");
  lightStrand.setAttribute("d", lightPath);
  lightStrand.setAttribute("class", "sp-guess-ray-stroke sp-guess-ray-strand-light");

  group.appendChild(darkStrand);
  group.appendChild(lightStrand);
  return group;
}

/** Diagonal stripe tile for target string stroke (fixed screen angle, not path-aligned dashes). */
function ensureTargetStripePattern(svg) {
  let defs = svg.querySelector("defs");
  if (!defs) {
    defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
    svg.insertBefore(defs, svg.firstChild);
  }
  if (defs.querySelector("#sp-target-stripe")) return;

  const pattern = document.createElementNS("http://www.w3.org/2000/svg", "pattern");
  pattern.setAttribute("id", "sp-target-stripe");
  pattern.setAttribute("patternUnits", "userSpaceOnUse");
  pattern.setAttribute("width", "2.6");
  pattern.setAttribute("height", "2.6");
  pattern.setAttribute("patternTransform", "rotate(68)");

  const dark = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  dark.setAttribute("width", "2.6");
  dark.setAttribute("height", "2.6");
  dark.setAttribute("fill", "#242424");

  const light = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  light.setAttribute("x", "1.65");
  light.setAttribute("width", "0.95");
  light.setAttribute("height", "2.6");
  light.setAttribute("fill", "#8a8682");

  pattern.appendChild(dark);
  pattern.appendChild(light);
  defs.appendChild(pattern);
}

/** Hanging-string path with gravity sag (parabolic approx.) — stable across repaints. */
function stringPathD(x1, y1, x2, y2, strand = 0) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  if (len < 0.05) {
    return `M ${x1.toFixed(2)} ${y1.toFixed(2)} L ${x2.toFixed(2)} ${y2.toFixed(2)}`;
  }

  const px = -dy / len;
  const py = dx / len;
  const seed = stringSeed(x1, y1, x2, y2);
  const phase = seed * Math.PI * 2 + strand * 2.35;
  const segments = Math.max(8, Math.min(20, Math.round(len / 1.8)));
  // Downward (+y) sag; grows ~linearly with span (catenary ≈ parabola for small sag).
  const sagAmount = Math.min(3.7, len * 0.07 + len * len * 0.00056);
  const strandSep = 0.09;
  const strandShift = strand === 0 ? -strandSep * 0.58 : strandSep * 0.58;
  const microAmp = 0.028;
  const weaveFreq = 2.1;

  let d = "";
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const baseX = x1 + dx * t;
    const baseY = y1 + dy * t;
    const gravitySag = sagAmount * 4 * t * (1 - t);
    const envelope = Math.sin(t * Math.PI);
    const twist =
      Math.sin(t * Math.PI * weaveFreq + phase) * microAmp * envelope +
      (stringSeed(i, seed, x2, y2) - 0.5) * microAmp * 0.35;
    const offset = strandShift + twist;
    const x = baseX + px * offset;
    const y = baseY + gravitySag + py * offset;
    d += i === 0 ? `M ${x.toFixed(2)} ${y.toFixed(2)}` : ` L ${x.toFixed(2)} ${y.toFixed(2)}`;
  }
  return d;
}

function stringSeed(a, b, c, d) {
  const raw = Math.sin(a * 12.9898 + b * 78.233 + c * 37.719 + d * 19.17) * 43758.5453;
  return raw - Math.floor(raw);
}

function createDialPin(point, className, options = {}) {
  const anchor = options.anchor === "center" ? "center" : "tip";
  const img = document.createElementNS("http://www.w3.org/2000/svg", "image");
  img.setAttribute("href", DIAL_PIN_HREF);
  img.setAttributeNS("http://www.w3.org/1999/xlink", "href", DIAL_PIN_HREF);
  img.setAttribute("x", String(point.x - DIAL_PIN_SIZE.w / 2));
  img.setAttribute(
    "y",
    String(
      anchor === "center"
        ? point.y - DIAL_PIN_SIZE.h / 2
        : point.y - DIAL_PIN_SIZE.h + DIAL_PIN_Y_OFFSET,
    ),
  );
  img.setAttribute("width", String(DIAL_PIN_SIZE.w));
  img.setAttribute("height", String(DIAL_PIN_SIZE.h));
  img.setAttribute("class", className);
  img.setAttribute("pointer-events", "none");
  return img;
}

function isPointInsideSemicircle(x, y, arc) {
  const dx = x - arc.cx;
  const dy = y - arc.cy;
  if (dy > 0) return false;
  return dx * dx + dy * dy <= arc.r * arc.r;
}

function svgPointFromEvent(svg, ev) {
  if (typeof svg.createSVGPoint !== "function") return null;
  const ctm = svg.getScreenCTM && svg.getScreenCTM();
  if (!ctm || typeof ctm.inverse !== "function") return null;
  const point = svg.createSVGPoint();
  point.x = ev.clientX;
  point.y = ev.clientY;
  const local = point.matrixTransform(ctm.inverse());
  return { x: local.x, y: local.y };
}

function clampDeg(degree) {
  if (degree < GAME_DEG_MIN) return GAME_DEG_MIN;
  if (degree > GAME_DEG_MAX) return GAME_DEG_MAX;
  return degree;
}

function clampDistance(distance) {
  if (distance < 0) return 0;
  if (distance > 1) return 1;
  return distance;
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

function playerUuid(player) {
  return player && player.uuid ? player.uuid : "";
}

function isCounterTeamPlayer(room, playerUuid) {
  if (!room || !playerUuid) return false;
  const team = findPlayerTeam(room, playerUuid);
  return team != null && team === counterTeam(room);
}

/** Halfway between the semicircle base (cy) and apex (cy − r). */
const DIAL_CARD_TEXT_RADIUS_RATIO = 0.5;
const DIAL_CARD_FONT_SIZE = 3.4;
const DIAL_CARD_LINE_HEIGHT = DIAL_CARD_FONT_SIZE * 1.12;
const DIAL_CARD_LABEL_MAX_CHARS = 10;
const DIAL_CARD_DIVIDER_HEIGHT = DIAL_CARD_FONT_SIZE * 9;
const DIAL_CARD_LABEL_GUTTER = 4.2;

function wrapDialCardLabel(text, maxChars = DIAL_CARD_LABEL_MAX_CHARS) {
  const normalized = String(text ?? "").trim();
  if (!normalized) return [];
  const words = normalized.split(/\s+/);
  /** @type {string[]} */
  const lines = [];
  let current = "";

  for (const word of words) {
    if (word.length > maxChars) {
      if (current) {
        lines.push(current);
        current = "";
      }
      for (let i = 0; i < word.length; i += maxChars) {
        lines.push(word.slice(i, i + maxChars));
      }
      continue;
    }
    const next = current ? `${current} ${word}` : word;
    if (next.length <= maxChars) {
      current = next;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function createWrappedCardValueText(lines, anchor, x, side) {
  if (!lines.length) return null;
  const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
  text.setAttribute("text-anchor", anchor);
  text.setAttribute("class", `sp-dial-card-text sp-dial-card-value-${side}`);

  const blockOffset = ((lines.length - 1) * DIAL_CARD_LINE_HEIGHT) / 2;
  lines.forEach((line, index) => {
    const tspan = document.createElementNS("http://www.w3.org/2000/svg", "tspan");
    tspan.setAttribute("x", String(x));
    if (index === 0) {
      tspan.setAttribute("y", String(-blockOffset));
    } else {
      tspan.setAttribute("dy", String(DIAL_CARD_LINE_HEIGHT));
    }
    tspan.textContent = line;
    text.appendChild(tspan);
  });
  return text;
}

function createCardValueGroup(leftLabel, rightLabel) {
  const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
  group.setAttribute("class", "sp-dial-card-values");

  const leftLines = wrapDialCardLabel(leftLabel);
  const rightLines = wrapDialCardLabel(rightLabel);

  const leftText = createWrappedCardValueText(leftLines, "end", -DIAL_CARD_LABEL_GUTTER, "left");
  if (leftText) group.appendChild(leftText);

  const divider = document.createElementNS("http://www.w3.org/2000/svg", "line");
  divider.setAttribute("x1", "0");
  divider.setAttribute("y1", String(-DIAL_CARD_DIVIDER_HEIGHT / 2));
  divider.setAttribute("x2", "0");
  divider.setAttribute("y2", String(DIAL_CARD_DIVIDER_HEIGHT / 2));
  divider.setAttribute("class", "sp-dial-card-divider");
  group.appendChild(divider);

  const rightText = createWrappedCardValueText(rightLines, "start", DIAL_CARD_LABEL_GUTTER, "right");
  if (rightText) group.appendChild(rightText);
  return group;
}
