import { getConfig } from "./config.js";

function joinUrl(base, path) {
  const b = base.replace(/\/$/, "");
  const p = path.startsWith("/") ? path : "/" + path;
  return b + p;
}

/**
 * @param {string} path
 * @param {RequestInit} [opts]
 */
export async function apiFetch(path, opts = {}) {
  const { apiBaseUrl } = getConfig();
  const url = joinUrl(apiBaseUrl, path);
  const headers = {
    Accept: "application/json",
    ...(opts.body ? { "Content-Type": "application/json" } : {}),
    ...opts.headers,
  };
  const res = await fetch(url, { ...opts, headers });
  const text = await res.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }
  if (!res.ok) {
    const err = new Error(
      typeof data === "object" && data && data.message
        ? data.message
        : res.statusText || "Request failed"
    );
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export async function createPlayer(name) {
  return apiFetch("/player/create", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export async function heartbeat(playerUuid) {
  return apiFetch(`/player/${encodeURIComponent(playerUuid)}/heartbeat`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export async function createRoom(password = "", name = "") {
  const body = {
    ...(password ? { password } : {}),
    ...(name ? { name } : {}),
  };
  return apiFetch("/room/create", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function joinRoom(uuidRoom, uuidPlayer, password = "") {
  const body = {
    uuidRoom,
    uuidPlayer,
    ...(password ? { password } : {}),
  };
  return apiFetch("/room/join", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function switchTeam(uuidRoom, uuidPlayer, team) {
  return apiFetch("/room/switch-team", {
    method: "POST",
    body: JSON.stringify({ uuidRoom, uuidPlayer, team }),
  });
}

export async function getRoom(uuid) {
  return apiFetch(`/room/${encodeURIComponent(uuid)}`, { method: "GET" });
}

export async function refreshRoom(uuid) {
  return apiFetch(`/room/${encodeURIComponent(uuid)}/refresh`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export async function gameAction(roomUuid, uuidPlayer, action, value) {
  return apiFetch(`/room/${encodeURIComponent(roomUuid)}/game-action`, {
    method: "POST",
    body: JSON.stringify({
      action,
      uuidPlayer,
      value: value != null && String(value).trim() !== "" ? String(value) : "-",
    }),
  });
}

export async function getCards() {
  return apiFetch("/cards", { method: "GET" });
}
