/** @param {{ uuid: string }} p */
export function playerId(p) {
  return p && p.uuid ? p.uuid : "";
}

/** @param {object} room */
export function findPlayerTeam(room, playerUuid) {
  if (!room || !playerUuid) return null;
  const a = room.playersTeamA || [];
  const b = room.playersTeamB || [];
  if (a.some((x) => playerId(x) === playerUuid)) return "A";
  if (b.some((x) => playerId(x) === playerUuid)) return "B";
  return null;
}

/** Whether room lists include this player */
export function isPlayerInRoom(room, playerUuid) {
  return findPlayerTeam(room, playerUuid) != null;
}

/** Backend: even round → A guesses first in STATE_02; odd → B first */
export function firstGuessingTeam(room) {
  const idx = Number(room.gameRoundIndex) || 0;
  return idx % 2 === 0 ? "A" : "B";
}

export function counterTeam(room) {
  return firstGuessingTeam(room) === "A" ? "B" : "A";
}

/** In STATE_02: guessing team is firstGuessingTeam */
export function isGuessingTeamMember(room, playerUuid) {
  const team = findPlayerTeam(room, playerUuid);
  if (!team) return false;
  const state = room.gameState || "";
  if (state === "STATE_02_GUESS_ROUND") {
    return team === firstGuessingTeam(room);
  }
  if (state === "STATE_03_COUNTER_GUESS_ROUND") {
    return team === counterTeam(room);
  }
  return false;
}

export function isCounterTeamMember(room, playerUuid) {
  const team = findPlayerTeam(room, playerUuid);
  if (!team) return false;
  const state = room.gameState || "";
  if (state === "STATE_03_COUNTER_GUESS_ROUND") {
    return team === counterTeam(room);
  }
  return false;
}

export function isActiveCluegiver(room, playerUuid) {
  const ap = room.gameActivePlayer;
  if (!ap || !playerUuid) return false;
  return playerId(ap) === playerUuid;
}

/**
 * Switch team allowed only before a game exists (no gameState from API convention).
 * If backend always sends gameState, try API and surface error.
 */
/** Allowed only before START / CREATE_NEW_GAME (backend: no gameState yet). */
export function canSwitchTeam(room) {
  const gs = room.gameState;
  return gs == null || gs === "";
}

/** Final guesses by player uuid for preview collapse */
export function guessesByPlayer(room) {
  const map = new Map();
  const list = room.gameGuesses || [];
  for (const g of list) {
    const id = playerId(g.player);
    if (!id) continue;
    const prev = map.get(id) || [];
    prev.push(g);
    map.set(id, prev);
  }
  return map;
}
