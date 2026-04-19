import { getConfig } from "./config.js";

/**
 * Subscribe to Mercure topic room-{uuid}. Same payload as GET /room/{uuid}.
 * @param {string} roomUuid
 * @param {(room: object) => void} onRoom
 * @returns {() => void} unsubscribe
 */
export function subscribeRoom(roomUuid, onRoom) {
  const { mercureUrl } = getConfig();
  const topic = `room-${roomUuid}`;
  let urlString;
  try {
    const u = new URL(mercureUrl);
    u.searchParams.append("topic", topic);
    urlString = u.toString();
  } catch {
    urlString = `${mercureUrl}?topic=${encodeURIComponent(topic)}`;
  }

  // Omit credentials so CORS may use Allow-Origin: * (Mercure JWT usually passes via ?authorization=…).
  // If you rely on cookie auth for Mercure, set mercureWithCredentials in __SPEKTRUM_CONFIG__ and fix the hub to echo a specific Origin (not *).
  const cred =
    typeof window !== "undefined" &&
    window.__SPEKTRUM_CONFIG__ &&
    window.__SPEKTRUM_CONFIG__.mercureWithCredentials === true;
  const es = new EventSource(urlString, { withCredentials: cred });

  es.onmessage = (ev) => {
    try {
      const room = JSON.parse(ev.data);
      if (room && typeof room === "object") onRoom(room);
    } catch {
      /* ignore malformed */
    }
  };

  es.onerror = () => {
    /* browser will retry; optional hook */
  };

  return () => {
    es.close();
  };
}
