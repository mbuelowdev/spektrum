import { heartbeat as sendHeartbeat } from "./api.js";

/** @type {number | ReturnType<typeof setInterval> | null} */
let intervalId = null;

export function startHeartbeat(playerUuid, intervalMs = 15000) {
  stopHeartbeat();
  if (!playerUuid) return;

  const tick = async () => {
    try {
      await sendHeartbeat(playerUuid);
    } catch {
      /* ignore — server may be down */
    }
  };

  tick();
  intervalId = setInterval(tick, intervalMs);
}

export function stopHeartbeat() {
  if (intervalId != null) {
    clearInterval(intervalId);
    intervalId = null;
  }
}
