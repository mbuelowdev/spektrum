import { navigateToRoom } from "../router.js";
import * as storage from "../storage.js";
import { openSettingsModal } from "./settings-modal.js";

function sortRooms(rooms) {
  return [...rooms].sort(
    (a, b) => new Date(b.joinedAt) - new Date(a.joinedAt)
  );
}

/**
 * @param {HTMLElement} root
 * @param {{
 *   playerName: string;
 *   rooms: { roomUuid: string; joinedAt: string; roomName?: string }[];
 *   onCreateRoom: () => void | Promise<void>;
 * }} opts
 */
export function renderLanding(root, opts) {
  const name = opts.playerName || "Player";
  const rooms = sortRooms(opts.rooms || []);

  const listItems = rooms.length
    ? rooms
        .map(
          (r) => `
      <button type="button" class="list-group-item list-group-item-action d-flex justify-content-between align-items-center sp-room-row" data-room="${escapeAttr(r.roomUuid)}">
        <span class="text-truncate me-2">${escapeHtml(r.roomName || r.roomUuid)}</span>
        <small class="text-muted text-nowrap">${formatDate(r.joinedAt)}</small>
      </button>`
        )
        .join("")
    : `<div class="list-group-item text-muted text-center py-4">No rooms yet. Create one or open a link from a friend.</div>`;

  root.innerHTML = `
    <div class="sp-home-view flex-grow-1 d-flex flex-column justify-content-center">
      <div class="container py-4 py-md-5 d-flex flex-column justify-content-center position-relative" style="max-width: 520px;">
        <div class="text-center mb-3">
          <span class="sp-app-title sp-app-title-home">Spektrum</span>
        </div>
        <h1 class="h4 text-center sp-lead-title mb-4">${escapeHtml(name)}'s last played rooms</h1>
        <div class="list-group shadow-sm mb-3">${listItems}</div>
        <div class="d-grid mb-2">
          <button type="button" class="btn btn-primary w-100 d-inline-flex align-items-center justify-content-center gap-2" id="btn-create-room">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M8 12h8" />
              <path d="M12 8v8" />
              <path d="M21 15V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8" />
              <path d="M3 15h18" />
              <path d="M5 19h14" />
            </svg>
            <span>Create room</span>
          </button>
        </div>
        <div class="d-grid">
          <button type="button" class="btn btn-primary d-inline-flex align-items-center justify-content-center gap-2" id="btn-settings">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.65 1.65 0 0 0 15 19.4a1.65 1.65 0 0 0-1 .6 1.65 1.65 0 0 0-.33 1V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-.33-1 1.65 1.65 0 0 0-1-.6 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-.6-1 1.65 1.65 0 0 0-1-.33H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1-.33 1.65 1.65 0 0 0 .6-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-.6 1.65 1.65 0 0 0 .33-1V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 .33 1 1.65 1.65 0 0 0 1 .6 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9c.26.3.45.65.6 1 .08.32.08.66 0 1-.15.35-.34.7-.6 1z" />
            </svg>
            <span>Settings</span>
          </button>
        </div>
      </div>
    </div>`;

  root.querySelector("#btn-create-room")?.addEventListener("click", () => {
    void opts.onCreateRoom();
  });

  root.querySelector("#btn-settings")?.addEventListener("click", () => {
    void openSettingsModal();
  });

  root.querySelectorAll(".sp-room-row").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-room");
      if (id) navigateToRoom(id);
    });
  });
}

function formatDate(iso) {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const HH = String(d.getHours()).padStart(2, "0");
    const ii = String(d.getMinutes()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd} ${HH}:${ii}`;
  } catch {
    return "";
  }
}

function escapeHtml(s) {
  const d = document.createElement("div");
  d.textContent = s;
  return d.innerHTML;
}

function escapeAttr(s) {
  return String(s).replace(/"/g, "&quot;");
}

