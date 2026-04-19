import { navigateToRoom } from "../router.js";

function sortRooms(rooms) {
  return [...rooms].sort(
    (a, b) => new Date(b.joinedAt) - new Date(a.joinedAt)
  );
}

/**
 * @param {HTMLElement} root
 * @param {{
 *   playerName: string;
 *   rooms: { roomUuid: string; joinedAt: string }[];
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
        <span class="text-truncate me-2 font-monospace small">${escapeHtml(r.roomUuid)}</span>
        <small class="text-muted text-nowrap">${formatDate(r.joinedAt)}</small>
      </button>`
        )
        .join("")
    : `<div class="list-group-item text-muted text-center py-4">No rooms yet. Create one or open a link from a friend.</div>`;

  root.innerHTML = `
    <div class="container py-4 py-md-5 flex-grow-1 d-flex flex-column justify-content-center" style="max-width: 520px;">
      <div class="text-center mb-3">
        <span class="sp-app-title sp-app-title-home">Spektrum</span>
      </div>
      <h1 class="h4 text-center sp-lead-title mb-4">${escapeHtml(name)}'s last played rooms</h1>
      <div class="list-group shadow-sm mb-3">${listItems}</div>
      <div class="d-grid gap-2">
        <button type="button" class="btn btn-primary w-100" id="btn-create-room">Create room</button>
        <button type="button" class="btn btn-outline-secondary w-100" id="btn-change-name">Change name</button>
      </div>
    </div>`;

  root.querySelector("#btn-create-room")?.addEventListener("click", () => {
    void opts.onCreateRoom();
  });

  root.querySelector("#btn-change-name")?.addEventListener("click", () => {
    localStorage.clear();
    window.location.reload();
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
    return d.toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
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
