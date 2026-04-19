const P = "spektrum.";

export function getPlayerUuid() {
  return localStorage.getItem(P + "playerUuid") || "";
}

export function getPlayerName() {
  return localStorage.getItem(P + "playerName") || "";
}

export function setPlayer(uuid, name) {
  localStorage.setItem(P + "playerUuid", uuid);
  localStorage.setItem(P + "playerName", name.trim());
}

export function clearPlayer() {
  localStorage.removeItem(P + "playerUuid");
  localStorage.removeItem(P + "playerName");
}

/** @returns {{ roomUuid: string, joinedAt: string }[]} */
export function getLastRooms() {
  try {
    const raw = localStorage.getItem(P + "lastRooms");
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

/** @param {{ roomUuid: string, joinedAt: string }[]} rooms */
export function setLastRooms(rooms) {
  localStorage.setItem(P + "lastRooms", JSON.stringify(rooms.slice(0, 50)));
}

export function touchRoom(roomUuid) {
  const list = getLastRooms().filter((r) => r.roomUuid !== roomUuid);
  list.unshift({
    roomUuid,
    joinedAt: new Date().toISOString(),
  });
  setLastRooms(list);
}

/** @returns {Set<string>} */
export function getCreatedRooms() {
  try {
    const raw = localStorage.getItem(P + "createdRooms");
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

export function addCreatedRoom(roomUuid) {
  const s = getCreatedRooms();
  s.add(roomUuid);
  localStorage.setItem(P + "createdRooms", JSON.stringify([...s]));
}

export function isRoomCreator(roomUuid) {
  return getCreatedRooms().has(roomUuid);
}
