const P = "spektrum.";

export function getPlayerUuid() {
  return localStorage.getItem(P + "playerUuid") || "";
}

export function getPlayerName() {
  return localStorage.getItem(P + "playerName") || "";
}

export function normalizePlayerName(name) {
  const raw = String(name ?? "");
  // Strip HTML-like tags and normalize whitespace for safe, readable names.
  const noTags = raw.replace(/<[^>]*>/g, "");
  const noCtl = noTags.replace(/[\u0000-\u001F\u007F]/g, "");
  const compact = noCtl.replace(/\s+/g, " ").trim();
  return compact.slice(0, 64);
}

export function setPlayer(uuid, name) {
  localStorage.setItem(P + "playerUuid", uuid);
  localStorage.setItem(P + "playerName", normalizePlayerName(name));
}

export function clearPlayer() {
  localStorage.removeItem(P + "playerUuid");
  localStorage.removeItem(P + "playerName");
}

export function normalizeRoomName(name) {
  const raw = String(name ?? "");
  const noTags = raw.replace(/<[^>]*>/g, "");
  const noCtl = noTags.replace(/[\u0000-\u001F\u007F]/g, "");
  const compact = noCtl.replace(/\s+/g, " ").trim();
  return compact.slice(0, 80);
}

/** @returns {{ roomUuid: string, joinedAt: string, roomName?: string }[]} */
export function getLastRooms() {
  try {
    const raw = localStorage.getItem(P + "lastRooms");
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    const roomNames = getRoomNames();
    return arr
      .filter((entry) => entry && typeof entry.roomUuid === "string")
      .map((entry) => {
        const roomUuid = String(entry.roomUuid);
        const fallbackName = roomNames[roomUuid] || "";
        const roomName = normalizeRoomName(entry.roomName || fallbackName);
        return {
          roomUuid,
          joinedAt: String(entry.joinedAt || ""),
          ...(roomName ? { roomName } : {}),
        };
      });
  } catch {
    return [];
  }
}

/** @param {{ roomUuid: string, joinedAt: string, roomName?: string }[]} rooms */
export function setLastRooms(rooms) {
  localStorage.setItem(P + "lastRooms", JSON.stringify(rooms.slice(0, 50)));
}

export function getRoomNames() {
  try {
    const raw = localStorage.getItem(P + "roomNames");
    if (!raw) return {};
    const obj = JSON.parse(raw);
    if (!obj || typeof obj !== "object") return {};
    return Object.fromEntries(
      Object.entries(obj)
        .filter(([k, v]) => typeof k === "string" && typeof v === "string")
        .map(([k, v]) => [k, normalizeRoomName(v)])
    );
  } catch {
    return {};
  }
}

export function getRoomName(roomUuid) {
  return getRoomNames()[roomUuid] || "";
}

export function setRoomName(roomUuid, name) {
  const roomName = normalizeRoomName(name);
  if (!roomUuid || !roomName) return;
  const names = getRoomNames();
  names[roomUuid] = roomName;
  localStorage.setItem(P + "roomNames", JSON.stringify(names));
}

export function touchRoom(roomUuid, roomName = "") {
  const normalizedName = normalizeRoomName(roomName);
  if (normalizedName) {
    setRoomName(roomUuid, normalizedName);
  }
  const savedName = normalizedName || getRoomName(roomUuid);
  const list = getLastRooms().filter((r) => r.roomUuid !== roomUuid);
  list.unshift({
    roomUuid,
    joinedAt: new Date().toISOString(),
    ...(savedName ? { roomName: savedName } : {}),
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
