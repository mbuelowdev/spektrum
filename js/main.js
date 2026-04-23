import * as api from "./api.js";
import { normalizeAvatarId, pickRandomAvatarId } from "./avatar-catalog.js";
import { initBackgroundMusic } from "./bg-music.js";
import { startHeartbeat } from "./heartbeat.js";
import { isPlayerInRoom } from "./gameLogic.js";
import { navigateHome, navigateToRoom, parsePath } from "./router.js";
import * as storage from "./storage.js";
import { mountGame } from "./ui/game.js";
import { renderLanding } from "./ui/landing.js";
import { openPlayerProfileModal } from "./ui/player-profile-modal.js";
import { renderPrivacy } from "./ui/privacy.js";
import { showToast } from "./ui/toast.js";

const UUID_RE =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;

/** @type {(() => void) | null} */
let gameCleanup = null;

async function boot() {
  document.documentElement.setAttribute("data-bs-theme", "dark");
  initBackgroundMusic();
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

  applyPlayerOverridesFromQuery();

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

  if (loc.type === "privacy") {
    renderPrivacy(app);
    return;
  }

  const hasRegisteredPlayer = Boolean(
    storage.getPlayerUuid() && storage.getPlayerName()
  );
  if (loc.type === "home" && !hasRegisteredPlayer) {
    // Paint the home background/shell first so onboarding does not feel like a blank load.
    renderLanding(app, {
      playerName: "Player",
      rooms: storage.getLastRooms(),
      onCreateRoom: () => handleCreateRoom(),
    });
    await waitForNextPaint();
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

function applyPlayerOverridesFromQuery() {
  const params = new URLSearchParams(location.search);
  let shouldRewriteUrl = false;

  if (params.has("playerUUID")) {
    const playerUuid = params.get("playerUUID") || "";
    if (UUID_RE.test(playerUuid)) {
      storage.setPlayerUuid(playerUuid);
    }
    params.delete("playerUUID");
    shouldRewriteUrl = true;
  }

  if (params.has("playerName")) {
    storage.setPlayerName(params.get("playerName") || "");
    params.delete("playerName");
    shouldRewriteUrl = true;
  }

  if (shouldRewriteUrl) {
    const nextSearch = params.toString();
    const nextUrl = `${location.pathname}${nextSearch ? `?${nextSearch}` : ""}${location.hash || ""}`;
    history.replaceState(history.state, "", nextUrl);
  }
}

function waitForNextPaint() {
  return new Promise((resolve) => {
    window.requestAnimationFrame(() => resolve());
  });
}

async function ensurePlayer() {
  let uuid = storage.getPlayerUuid();
  let name = storage.getPlayerName();
  const existingAvatar = storage.getAvatar();
  const normalizedAvatar = normalizeAvatarId(existingAvatar);
  if (normalizedAvatar !== existingAvatar) {
    storage.setAvatar(normalizedAvatar);
  }
  if (uuid && name) {
    const normalized = storage.normalizePlayerName(name);
    if (normalized !== name) {
      storage.setPlayer(uuid, normalized);
    }
    return;
  }

  const initialAvatarId = existingAvatar ? normalizeAvatarId(existingAvatar) : pickRandomAvatarId();
  if (!existingAvatar) {
    storage.setAvatar(initialAvatarId);
  }
  const chosenPlayer = await openPlayerProfileModal({
    title: "Welcome",
    submitLabel: "Continue",
    backdropStatic: true,
    showPrivacyLink: false,
    showForgetMe: false,
    onSaved(payload) {
      storage.setAvatar(payload.avatarId);
    },
  });
  if (!chosenPlayer) {
    throw new Error("Could not initialize player profile");
  }
  const chosenName = storage.normalizePlayerName(chosenPlayer.name);
  if (!chosenName) {
    throw new Error("Player name cannot be empty");
  }
  const res = await api.createPlayer(chosenName);
  const newUuid = res.uuid || res.Uuid;
  if (!newUuid) {
    throw new Error("Server did not return player uuid");
  }
  storage.setPlayer(newUuid, chosenName);
  storage.setAvatar(chosenPlayer.avatarId);
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
            <form class="modal-body sp-join-form">
              ${errorHint ? `<div class="alert alert-danger py-2 small">${escapeHtml(errorHint)}</div>` : ""}
              <p class="small text-muted mb-2 font-monospace">${escapeHtml(roomUuid)}</p>
              <label class="form-label small">Room password (if any)</label>
              <input
                type="password"
                class="form-control mb-3 sp-join-pw"
                autocomplete="new-password"
                data-lpignore="true"
                data-1p-ignore="true"
              />
              <div class="d-grid gap-2">
                <button type="submit" class="btn btn-primary sp-join-yes">Join</button>
                <button type="button" class="btn btn-outline-secondary sp-join-no">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      </div>`;
    document.body.appendChild(wrap);
    const el = wrap.querySelector(".modal");
    const modal = new bootstrap.Modal(el);
    modal.show();
    el.addEventListener(
      "shown.bs.modal",
      () => {
        const pwEl = /** @type {HTMLInputElement | null} */ (
          wrap.querySelector(".sp-join-pw")
        );
        pwEl?.focus();
        pwEl?.select();
      },
      { once: true }
    );

    const finish = (payload) => {
      modal.hide();
      resolve(payload);
    };

    wrap.querySelector(".sp-join-form")?.addEventListener("submit", (e) => {
      e.preventDefault();
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
  const { name } = createInput;
  const password = createInput.isPrivate ? createInput.password : undefined;

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
    await api.joinRoom(rid, storage.getPlayerUuid(), password);
    storage.touchRoom(rid, name);
    navigateToRoom(rid);
  } catch (e) {
    showToast(e.message || "Create failed", "danger");
  }
}

/** @returns {Promise<{ password?: string, name: string, isPrivate: boolean } | null>} */
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
              <div class="form-check form-switch mb-2 sp-private-switch">
                <input class="form-check-input sp-cr-private-toggle" type="checkbox" role="switch" id="sp-cr-private-toggle" />
                <label class="form-check-label small d-inline-flex align-items-center gap-1 position-relative pe-3" for="sp-cr-private-toggle">
                  Private room
                  <span
                    class="d-inline-flex align-items-center justify-content-center rounded-circle border border-secondary text-secondary"
                    style="width: 1rem; height: 1rem; font-size: 0.7rem; line-height: 1;"
                    title="Only people with the password will be able to join the room."
                    aria-label="Only people with the password will be able to join the room."
                    >?</span
                  >
                </label>
              </div>
              <div class="sp-cr-pw-wrap d-none mb-3">
                <label class="form-label small" for="sp-cr-pw">Password</label>
                <input type="password" id="sp-cr-pw" class="form-control sp-cr-pw" autocomplete="new-password" />
              </div>
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
    const privateToggle = /** @type {HTMLInputElement} */ (
      wrap.querySelector(".sp-cr-private-toggle")
    );
    const passwordWrap = /** @type {HTMLDivElement} */ (
      wrap.querySelector(".sp-cr-pw-wrap")
    );
    const passwordInput = /** @type {HTMLInputElement} */ (
      wrap.querySelector(".sp-cr-pw")
    );

    const syncPrivateRoomUi = () => {
      const isPrivate = Boolean(privateToggle?.checked);
      passwordWrap.classList.toggle("d-none", !isPrivate);
      passwordInput.required = isPrivate;
      if (!isPrivate) {
        passwordInput.value = "";
        passwordInput.setCustomValidity("");
      }
    };
    privateToggle?.addEventListener("change", syncPrivateRoomUi);
    passwordInput.addEventListener("input", () => {
      passwordInput.setCustomValidity("");
    });
    syncPrivateRoomUi();

    const finish = (/** @type {{ password?: string, name: string, isPrivate: boolean } | null} */ v) => {
      if (settled) return;
      settled = true;
      modal.hide();
      resolve(v);
    };

    wrap.querySelector(".sp-cr-go")?.addEventListener("click", () => {
      const roomNameInput = /** @type {HTMLInputElement} */ (wrap.querySelector(".sp-cr-name"));
      const roomName = storage.normalizeRoomName(roomNameInput?.value || "");
      if (!roomName) {
        roomNameInput.setCustomValidity("Please enter a room name.");
        roomNameInput.reportValidity();
        return;
      }
      roomNameInput.setCustomValidity("");
      const isPrivate = Boolean(privateToggle?.checked);
      const password = (passwordInput.value || "").trim();
      if (isPrivate && password === "") {
        passwordInput.setCustomValidity("Please set a room password.");
        passwordInput.reportValidity();
        return;
      }
      passwordInput.setCustomValidity("");
      finish({
        ...(isPrivate ? { password } : {}),
        name: roomName,
        isPrivate,
      });
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
