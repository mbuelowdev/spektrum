import * as api from "./api.js";
import { startHeartbeat } from "./heartbeat.js";
import { isPlayerInRoom } from "./gameLogic.js";
import { navigateHome, navigateToRoom, parsePath } from "./router.js";
import * as storage from "./storage.js";
import { mountGame } from "./ui/game.js";
import { renderLanding } from "./ui/landing.js";
import { showToast } from "./ui/toast.js";

/** @type {(() => void) | null} */
let gameCleanup = null;

async function boot() {
  window.addEventListener("popstate", () => void route());
  await route();
}

async function route() {
  if (gameCleanup) {
    gameCleanup();
    gameCleanup = null;
  }

  const app = document.getElementById("app");
  if (!app) return;

  const loc = parsePath(location.pathname);
  if (loc.type === "unknown") {
    app.innerHTML = `
      <div class="container py-5 text-center">
        <p class="mb-3">This path is not valid.</p>
        <button type="button" class="btn btn-primary sp-go-home">Back home</button>
      </div>`;
    app.querySelector(".sp-go-home")?.addEventListener("click", () => navigateHome());
    return;
  }

  try {
    await ensurePlayer();
  } catch (e) {
    app.innerHTML = `
      <div class="container py-5 text-center">
        <p class="mb-3">Could not register player (${escapeHtml(e.message || "error")}).</p>
        <button type="button" class="btn btn-primary sp-retry">Retry</button>
      </div>`;
    app.querySelector(".sp-retry")?.addEventListener("click", () => void route());
    return;
  }

  const uuid = storage.getPlayerUuid();
  startHeartbeat(uuid);

  if (loc.type === "home") {
    renderLanding(app, {
      playerName: storage.getPlayerName(),
      rooms: storage.getLastRooms(),
      onCreateRoom: () => handleCreateRoom(),
    });
    return;
  }

  if (loc.type === "room") {
    await enterRoomFlow(app, loc.roomUuid);
  }
}

async function ensurePlayer() {
  let uuid = storage.getPlayerUuid();
  let name = storage.getPlayerName();
  if (uuid && name) {
    const normalized = storage.normalizePlayerName(name);
    if (normalized !== name) {
      storage.setPlayer(uuid, normalized);
    }
    return;
  }

  const chosenName = storage.normalizePlayerName(await promptPlayerNameModal());
  if (!chosenName) {
    throw new Error("Player name cannot be empty");
  }
  const res = await api.createPlayer(chosenName);
  const newUuid = res.uuid || res.Uuid;
  if (!newUuid) {
    throw new Error("Server did not return player uuid");
  }
  storage.setPlayer(newUuid, chosenName);
}

/**
 * @returns {Promise<string>}
 */
function promptPlayerNameModal() {
  return new Promise((resolve) => {
    const wrap = document.createElement("div");
    wrap.innerHTML = `
      <div class="modal fade" tabindex="-1" data-bs-backdrop="static">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Welcome</h5>
            </div>
            <form class="modal-body">
              <label class="form-label">Your name</label>
              <input type="text" name="name" class="form-control mb-3" required maxlength="64" autocomplete="nickname" />
              <button type="submit" class="btn btn-primary w-100">Continue</button>
            </form>
          </div>
        </div>
      </div>`;
    document.body.appendChild(wrap);
    const el = wrap.querySelector(".modal");
    const modal = new bootstrap.Modal(el);
    const form = wrap.querySelector("form");
    const input = /** @type {HTMLInputElement} */ (form.querySelector('input[name="name"]'));
    const validateName = () => {
      const v = storage.normalizePlayerName(input.value || "");
      input.setCustomValidity(v ? "" : "Please enter your name.");
      return Boolean(v);
    };
    input.addEventListener("input", () => {
      validateName();
      input.reportValidity();
    });
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      if (!validateName()) {
        input.reportValidity();
        return;
      }
      const v = storage.normalizePlayerName(input.value || "");
      modal.hide();
      resolve(v);
    });
    modal.show();
    el.addEventListener(
      "hidden.bs.modal",
      () => {
        wrap.remove();
      },
      { once: true }
    );
  });
}

async function enterRoomFlow(app, roomUuid) {
  let room;
  try {
    room = await api.getRoom(roomUuid);
  } catch (e) {
    app.innerHTML = `
      <div class="container py-5 text-center">
        <p class="mb-3">Could not load room (${escapeHtml(e.message || "error")}).</p>
        <button type="button" class="btn btn-primary sp-go-home">Home</button>
      </div>`;
    app.querySelector(".sp-go-home")?.addEventListener("click", () => navigateHome());
    return;
  }

  const pid = storage.getPlayerUuid();

  if (!isPlayerInRoom(room, pid)) {
    let errMsg = "";
    let joined = false;
    while (!joined) {
      const decision = await confirmJoinModal(roomUuid, errMsg);
      if (!decision) {
        navigateHome();
        return;
      }
      try {
        await api.joinRoom(roomUuid, pid, decision.password ?? "");
        joined = true;
      } catch (e) {
        errMsg = e.message || "Could not join";
        showToast(errMsg, "danger");
      }
    }
    room = await api.getRoom(roomUuid);
    storage.touchRoom(roomUuid, getRoomDisplayName(room));
  } else {
    storage.touchRoom(roomUuid, getRoomDisplayName(room));
  }

  gameCleanup = await mountGame(app, roomUuid, {
    localUuid: pid,
    localName: storage.getPlayerName(),
  });
}

/**
 * @param {string} roomUuid
 * @param {string} [errorHint]
 */
function confirmJoinModal(roomUuid, errorHint = "") {
  return new Promise((resolve) => {
    const wrap = document.createElement("div");
    wrap.innerHTML = `
      <div class="modal fade" tabindex="-1" data-bs-backdrop="static">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Join room?</h5>
            </div>
            <div class="modal-body">
              ${errorHint ? `<div class="alert alert-danger py-2 small">${escapeHtml(errorHint)}</div>` : ""}
              <p class="small text-muted mb-2 font-monospace">${escapeHtml(roomUuid)}</p>
              <label class="form-label small">Room password (if any)</label>
              <input type="password" class="form-control mb-3 sp-join-pw" autocomplete="current-password" />
              <div class="d-grid gap-2">
                <button type="button" class="btn btn-primary sp-join-yes">Join</button>
                <button type="button" class="btn btn-outline-secondary sp-join-no">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      </div>`;
    document.body.appendChild(wrap);
    const el = wrap.querySelector(".modal");
    const modal = new bootstrap.Modal(el);
    modal.show();

    const finish = (payload) => {
      modal.hide();
      resolve(payload);
    };

    wrap.querySelector(".sp-join-yes")?.addEventListener("click", () => {
      const pwEl = /** @type {HTMLInputElement} */ (
        wrap.querySelector(".sp-join-pw")
      );
      const pw = (pwEl && pwEl.value) || "";
      finish({ password: pw });
    });
    wrap.querySelector(".sp-join-no")?.addEventListener("click", () => finish(null));

    el.addEventListener(
      "hidden.bs.modal",
      () => {
        wrap.remove();
      },
      { once: true }
    );
  });
}

async function handleCreateRoom() {
  const createInput = await createRoomModal();
  if (createInput === null) return;
  const { password, name } = createInput;

  try {
    const created = await api.createRoom(password, name);
    const rid =
      created.uuid ||
      created.id ||
      (created.room && created.room.uuid);
    if (!rid) {
      showToast("Unexpected create response", "danger");
      return;
    }
    storage.addCreatedRoom(rid);
    storage.setRoomName(rid, name);
    await api.joinRoom(rid, storage.getPlayerUuid(), password || "");
    storage.touchRoom(rid, name);
    navigateToRoom(rid);
  } catch (e) {
    showToast(e.message || "Create failed", "danger");
  }
}

/** @returns {Promise<{ password: string, name: string } | null>} */
function createRoomModal() {
  return new Promise((resolve) => {
    let settled = false;
    const fallbackPlayerName = storage.getPlayerName() || "Player";
    const suggestedRoomName = storage.normalizeRoomName(`${fallbackPlayerName}'s room`);
    const wrap = document.createElement("div");
    wrap.innerHTML = `
      <div class="modal fade" tabindex="-1">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Create room</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cancel"></button>
            </div>
            <div class="modal-body">
              <label class="form-label small">Room name</label>
              <input type="text" class="form-control mb-3 sp-cr-name" maxlength="80" value="${escapeAttr(suggestedRoomName)}" />
              <label class="form-label small">Optional password</label>
              <input type="password" class="form-control mb-3 sp-cr-pw" autocomplete="new-password" />
              <div class="d-flex gap-2 justify-content-end">
                <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancel</button>
                <button type="button" class="btn btn-primary sp-cr-go">Create</button>
              </div>
            </div>
          </div>
        </div>
      </div>`;
    document.body.appendChild(wrap);
    const el = wrap.querySelector(".modal");
    const modal = new bootstrap.Modal(el);

    const finish = (/** @type {{ password: string, name: string } | null} */ v) => {
      if (settled) return;
      settled = true;
      modal.hide();
      resolve(v);
    };

    wrap.querySelector(".sp-cr-go")?.addEventListener("click", () => {
      const password =
        /** @type {HTMLInputElement} */ (wrap.querySelector(".sp-cr-pw")).value ||
        "";
      const roomNameInput = /** @type {HTMLInputElement} */ (wrap.querySelector(".sp-cr-name"));
      const roomName = storage.normalizeRoomName(roomNameInput?.value || "");
      if (!roomName) {
        roomNameInput.setCustomValidity("Please enter a room name.");
        roomNameInput.reportValidity();
        return;
      }
      roomNameInput.setCustomValidity("");
      finish({ password, name: roomName });
    });

    el.addEventListener(
      "hidden.bs.modal",
      () => {
        if (!settled) finish(null);
        wrap.remove();
      },
      { once: true }
    );

    modal.show();
  });
}

function getRoomDisplayName(room) {
  return storage.normalizeRoomName(
    (room && (room.name || room.roomName || room.Name)) || ""
  );
}

function escapeHtml(s) {
  const d = document.createElement("div");
  d.textContent = s ?? "";
  return d.innerHTML;
}

function escapeAttr(s) {
  return String(s ?? "").replace(/"/g, "&quot;");
}

void boot();
