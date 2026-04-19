import {
  gameAction,
  getRoom,
  refreshRoom,
  switchTeam,
} from "../api.js";
import {
  canSwitchTeam,
  counterTeam,
  findPlayerTeam,
  firstGuessingTeam,
  isActiveCluegiver,
  isPlayerInRoom,
  playerId,
} from "../gameLogic.js";
import { subscribeRoom } from "../mercure.js";
import { navigateHome } from "../router.js";
import * as storage from "../storage.js";
import { renderDial } from "./dial.js";
import { showToast } from "./toast.js";

/**
 * @param {HTMLElement} root
 * @param {string} roomUuid
 * @param {{ localUuid: string; localName: string }} player
 * @returns {Promise<() => void>}
 */
export async function mountGame(root, roomUuid, player) {
  let room = await getRoom(roomUuid);
  let unsubMercure = null;

  /** GET /room and repaint (covers missed Mercure or slow hub). */
  async function pullRoomFromServer(showError) {
    try {
      room = await getRoom(roomUuid);
      storage.touchRoom(roomUuid);
      updateContent(room, player);
    } catch (e) {
      if (showError) {
        showToast(e.message || "Could not refresh room", "danger");
      }
    }
  }

  const admin = storage.isRoomCreator(roomUuid);

  function paint() {
    renderShell(room, player, admin);
  }

  function renderShell(roomData, pl, isAdmin) {
    const shortId = shortUuid(roomData.uuid || roomUuid);

    root.innerHTML = `
      <nav class="navbar navbar-expand sp-topbar px-2 px-md-3 py-2 align-items-center shadow-sm">
        <button class="btn btn-outline-secondary btn-sm d-inline-flex align-items-center justify-content-center p-2 me-2 d-md-none" type="button" data-bs-toggle="offcanvas" data-bs-target="#spPlayersOffcanvas" aria-controls="spPlayersOffcanvas" aria-label="Players">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
            <line x1="4" y1="6" x2="20" y2="6" />
            <line x1="4" y1="12" x2="20" y2="12" />
            <line x1="4" y1="18" x2="20" y2="18" />
          </svg>
        </button>
        <span class="navbar-brand mb-0 text-truncate small font-monospace" title="${escapeAttr(roomData.uuid || "")}">Room ${escapeHtml(shortId)}</span>
        <div class="dropdown ms-auto">
          <button class="btn btn-light border btn-sm" type="button" data-bs-toggle="dropdown" aria-expanded="false" aria-label="Menu">⋯</button>
          <ul class="dropdown-menu dropdown-menu-end">
            <li><button class="dropdown-item" type="button" id="sp-copy-link">Copy room link</button></li>
            ${isAdmin ? `<li><button class="dropdown-item" type="button" id="sp-refresh">Refresh room</button></li>` : ""}
            ${isAdmin ? `<li><button class="dropdown-item" type="button" id="sp-new-game">New game</button></li>` : ""}
            <li><hr class="dropdown-divider" /></li>
            <li><button class="dropdown-item" type="button" id="sp-home">Home</button></li>
          </ul>
        </div>
      </nav>
      <div class="container-fluid flex-grow-1 sp-game-main">
        <div class="row g-0">
          <aside class="col-md-4 col-lg-3 sp-sidebar-col pt-3 pb-3 pe-3 ps-0 d-none d-md-block">
            <div id="sp-sidebar-desktop"></div>
          </aside>
          <main class="col-md-8 col-lg-9 px-2 px-md-4 pb-5">
            <div class="mx-auto sp-dial-wrap">
              <div id="sp-clue" class="sp-clue-box small text-muted d-none"></div>
              <div id="sp-dial"></div>
            </div>
            <div id="sp-actions" class="mt-3 mx-auto" style="max-width: 420px"></div>
            <p class="text-center text-muted small mt-2 mb-0" id="sp-state-hint"></p>
          </main>
        </div>
      </div>
      <div class="offcanvas offcanvas-start" tabindex="-1" id="spPlayersOffcanvas" aria-labelledby="spPlayersLabel">
        <div class="offcanvas-header border-bottom">
          <h5 class="offcanvas-title" id="spPlayersLabel">Players</h5>
          <button type="button" class="btn-close" data-bs-dismiss="offcanvas" aria-label="Close"></button>
        </div>
        <div class="offcanvas-body">
          <div id="sp-sidebar-mobile"></div>
        </div>
      </div>
    `;

    wireChrome(roomData, pl, isAdmin);
    updateContent(roomData, pl);
  }

  function wireChrome(roomData, pl, isAdmin) {
    root.querySelector("#sp-copy-link")?.addEventListener("click", async () => {
      const url = `${location.origin}/${roomUuid}`;
      try {
        await navigator.clipboard.writeText(url);
        showToast("Link copied", "success");
      } catch {
        showToast("Could not copy", "danger");
      }
    });

    root.querySelector("#sp-refresh")?.addEventListener("click", async () => {
      try {
        await refreshRoom(roomUuid);
        showToast("Refresh sent", "success");
      } catch (e) {
        showToast(e.message || "Refresh failed", "danger");
      }
    });

    root.querySelector("#sp-new-game")?.addEventListener("click", async () => {
      try {
        await gameAction(roomUuid, pl.localUuid, "CREATE_NEW_GAME", "-");
        showToast("New game started", "success");
      } catch (e) {
        showToast(e.message || "Failed", "danger");
      }
    });

    root.querySelector("#sp-home")?.addEventListener("click", () => {
      navigateHome();
    });
  }

  function updateContent(r, pl) {
    const desk = root.querySelector("#sp-sidebar-desktop");
    const mob = root.querySelector("#sp-sidebar-mobile");
    const html = sidebarHtml(r, pl);
    if (desk) desk.innerHTML = html;
    if (mob) mob.innerHTML = html;
    wireSidebar(r, pl);

    const clueEl = root.querySelector("#sp-clue");
    if (clueEl) {
      const clue = r.gameCluegiverGuessText;
      if (clue && String(clue).trim()) {
        clueEl.textContent = clue;
        clueEl.classList.remove("d-none");
      } else {
        clueEl.textContent = "";
        clueEl.classList.add("d-none");
      }
    }

    const dialMount = root.querySelector("#sp-dial");
    if (dialMount) {
      dialMount.innerHTML = "";
      renderDial(dialMount, r, pl.localUuid);
    }

    const actions = root.querySelector("#sp-actions");
    if (actions) {
      actions.innerHTML = "";
      renderActions(actions, r, pl);
    }

    const hint = root.querySelector("#sp-state-hint");
    if (hint) {
      hint.textContent = stateHint(r, pl);
    }
  }

  function wireSidebar(r, pl) {
    root.querySelectorAll(".sp-switch-team").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const team = btn.getAttribute("data-team");
        if (!team) return;
        try {
          await switchTeam(roomUuid, pl.localUuid, team);
          showToast(`Switched to team ${team}`, "success");
          await pullRoomFromServer(true);
        } catch (e) {
          showToast(e.message || "Could not switch team", "danger");
        }
      });
    });
  }

  paint();

  unsubMercure = subscribeRoom(roomUuid, (incoming) => {
    room = incoming;
    storage.touchRoom(roomUuid);
    updateContent(room, player);
  });

  /** Recover from missed Mercure (e.g. another client switched teams). */
  const onVisibility = () => {
    if (document.visibilityState === "visible") {
      void pullRoomFromServer(false);
    }
  };
  document.addEventListener("visibilitychange", onVisibility);

  return () => {
    document.removeEventListener("visibilitychange", onVisibility);
    if (unsubMercure) unsubMercure();
    unsubMercure = null;
    root.innerHTML = "";
  };
}

function sidebarHtml(room, pl) {
  const my = pl.localUuid;
  const activeId = playerId(room.gameActivePlayer);
  const team = findPlayerTeam(room, my);
  const switchable = canSwitchTeam(room);
  const otherTeam = team === "A" ? "B" : team === "B" ? "A" : null;

  const listA = (room.playersTeamA || [])
    .map((p) => playerRow(p, my, activeId))
    .join("");
  const listB = (room.playersTeamB || [])
    .map((p) => playerRow(p, my, activeId))
    .join("");

  const switchBlock =
    switchable && team && otherTeam
      ? `<button type="button" class="btn btn-outline-primary btn-sm w-100 mt-3 mb-0 sp-switch-team" data-team="${otherTeam}">Switch teams</button>`
      : !switchable
        ? `<p class="small text-muted mt-3 mb-0">Teams are locked while a game is in progress.</p>`
        : `<p class="small text-muted mt-3 mb-0">Join a team from the lobby before the game starts.</p>`;

  return `
    <h6 class="fw-semibold mb-3 text-body sp-sidebar-players-title d-none d-md-block">Players</h6>
    <div class="sp-team-a">
      <h6>Team A</h6>
      ${listA || `<div class="small text-muted">Empty</div>`}
    </div>
    <div class="sp-team-b">
      <h6>Team B</h6>
      ${listB || `<div class="small text-muted">Empty</div>`}
    </div>
    ${switchBlock}
    <hr class="my-3 border-secondary-subtle sp-sidebar-divider" />
    <div class="d-flex flex-wrap gap-2 gap-sm-3 justify-content-between align-items-center small text-muted mb-2">
      <span><strong class="text-body">A</strong> ${room.gamePointsTeamA ?? 0}</span>
      <span><strong class="text-body">B</strong> ${room.gamePointsTeamB ?? 0}</span>
      <span class="text-nowrap ms-auto">Round ${(Number(room.gameRoundIndex) || 0) + 1}</span>
    </div>
    <p class="small text-muted mb-0">State: <code>${escapeHtml(room.gameState || "—")}</code></p>
  `;
}

function playerRow(p, myUuid, activeUuid) {
  const id = playerId(p);
  const you = id === myUuid ? `<span class="sp-you">(you)</span>` : "";
  const cg =
    activeUuid && id === activeUuid
      ? `<span class="sp-cluegiver">Cluegiver</span>`
      : "";
  return `<div class="sp-player">${escapeHtml(p.name || "?")} ${you} ${cg}</div>`;
}

function stateHint(room, pl) {
  const gs = room.gameState || "";
  if (!isPlayerInRoom(room, pl.localUuid)) return "You are not in this room yet.";
  if (gs === "STATE_00_START") {
    const n = room.gameActivePlayer?.name || "Active player";
    return isActiveCluegiver(room, pl.localUuid)
      ? "Your turn: pick a card and spin."
      : `Waiting for ${n}.`;
  }
  if (gs === "STATE_01_SHOW_HIDDEN_VALUE") {
    return isActiveCluegiver(room, pl.localUuid)
      ? "Give a clue that hints at the target."
      : "The cluegiver is writing a clue.";
  }
  if (gs === "STATE_02_GUESS_ROUND" || gs === "STATE_03_COUNTER_GUESS_ROUND") {
    return "";
  }
  if (gs === "STATE_04_REVEAL") {
    return "Round scored — next round when ready.";
  }
  return "";
}

function renderActions(container, room, pl) {
  const gs = room.gameState || "";
  const uid = pl.localUuid;

  if (!isPlayerInRoom(room, uid)) {
    container.innerHTML =
      `<p class="text-muted small text-center">Join this room from the lobby or link prompt.</p>`;
    return;
  }

  if (gs === "STATE_00_START") {
    if (!isActiveCluegiver(room, uid)) {
      container.innerHTML =
        `<p class="text-muted text-center small">Waiting for the active player.</p>`;
      return;
    }
    container.innerHTML = `
      <div class="d-grid gap-2">
        <button type="button" class="btn btn-outline-primary sp-act" data-act="NEW_CARDS">New card</button>
        <button type="button" class="btn btn-outline-primary sp-act" data-act="NEW_OR_OLD_CARDS">New card (allow repeats)</button>
        <button type="button" class="btn btn-primary sp-act" data-act="START_SPINNING">Start spinning</button>
      </div>`;
    wireActs(container, room, uid);
    return;
  }

  if (gs === "STATE_01_SHOW_HIDDEN_VALUE") {
    if (!isActiveCluegiver(room, uid)) {
      container.innerHTML =
        `<p class="text-muted text-center small">Only the cluegiver submits the clue.</p>`;
      return;
    }
    container.innerHTML = `
      <label class="form-label small">Your clue</label>
      <textarea class="form-control mb-2" rows="2" id="sp-clue-input" placeholder="One short phrase…">${escapeHtml(room.gameCluegiverGuessText || "")}</textarea>
      <button type="button" class="btn btn-primary w-100 sp-submit-clue">Submit clue</button>`;
    container.querySelector(".sp-submit-clue")?.addEventListener("click", async () => {
      const v = /** @type {HTMLTextAreaElement} */ (container.querySelector("#sp-clue-input")).value;
      try {
        await gameAction(room.uuid, uid, "SUBMIT_CLUEGIVER_CLUE", v || "-");
        showToast("Clue submitted", "success");
      } catch (e) {
        showToast(e.message || "Failed", "danger");
      }
    });
    return;
  }

  if (gs === "STATE_02_GUESS_ROUND" || gs === "STATE_03_COUNTER_GUESS_ROUND") {
    renderGuessRound(container, room, uid, gs);
    return;
  }

  if (gs === "STATE_04_REVEAL") {
    if (!isActiveCluegiver(room, uid)) {
      container.innerHTML =
        `<p class="text-muted text-center small">Waiting for next round.</p>`;
      return;
    }
    container.innerHTML = `<button type="button" class="btn btn-primary w-100 sp-act" data-act="NEXT_ROUND">Next round</button>`;
    wireActs(container, room, uid);
    return;
  }

  container.innerHTML = `<p class="text-muted small text-center">${escapeHtml(gs)}</p>`;
}

function renderGuessRound(container, room, uid, gs) {
  const team = findPlayerTeam(room, uid);
  const guessing =
    gs === "STATE_02_GUESS_ROUND"
      ? firstGuessingTeam(room)
      : counterTeam(room);
  const canGuess =
    team &&
    ((gs === "STATE_02_GUESS_ROUND" && team === guessing) ||
      (gs === "STATE_03_COUNTER_GUESS_ROUND" && team === guessing));

  if (isActiveCluegiver(room, uid)) {
    container.innerHTML =
      `<p class="text-muted text-center small">You are the cluegiver — sit back while others guess.</p>`;
    if (gs === "STATE_03_COUNTER_GUESS_ROUND") {
      container.innerHTML += `<button type="button" class="btn btn-outline-danger w-100 mt-2 sp-reveal">Reveal</button>`;
      container.querySelector(".sp-reveal")?.addEventListener("click", async () => {
        try {
          await gameAction(room.uuid, uid, "REVEAL", "-");
          showToast("Reveal", "success");
        } catch (e) {
          showToast(e.message || "Failed", "danger");
        }
      });
    }
    return;
  }

  const initialDeg = escapeAttr(guessFieldInitialValue(room, uid));
  container.innerHTML = `
    <label class="form-label small mb-1">Guess (0–160)</label>
    <input type="number" class="form-control mb-2 sp-deg" min="0" max="160" step="0.01" placeholder="e.g. 72.5" value="${initialDeg}" />
    <div class="d-flex flex-wrap gap-2 justify-content-center">
      <button type="button" class="btn btn-outline-secondary btn-sm sp-preview">Save preview</button>
      <button type="button" class="btn btn-outline-secondary btn-sm sp-remove">Remove my preview</button>
      <button type="button" class="btn btn-primary btn-sm sp-final">Lock in guess</button>
    </div>`;

  const deg = container.querySelector(".sp-deg");
  const previewBtn = container.querySelector(".sp-preview");
  const removeBtn = container.querySelector(".sp-remove");
  const finalBtn = container.querySelector(".sp-final");

  const spect = !team;
  if (spect) {
    finalBtn?.classList.add("d-none");
  }
  if (!canGuess && !spect) {
    previewBtn?.classList.add("d-none");
    removeBtn?.classList.add("d-none");
    finalBtn?.classList.add("d-none");
    deg?.setAttribute("disabled", "true");
    container.insertAdjacentHTML(
      "afterbegin",
      `<p class="small text-muted text-center">Your team is not guessing in this phase.</p>`
    );
    return;
  }

  previewBtn?.addEventListener("click", async () => {
    const parsed = parseGuessDegree(deg);
    if (!parsed.ok) {
      showToast("Enter a number between 0 and 160.", "danger");
      return;
    }
    try {
      await gameAction(room.uuid, uid, "SUBMIT_PREVIEW_GUESS", parsed.value);
      showToast("Preview saved", "success");
    } catch (e) {
      showToast(e.message || "Failed", "danger");
    }
  });

  removeBtn?.addEventListener("click", async () => {
    try {
      await gameAction(room.uuid, uid, "REMOVE_PREVIEW_GUESS", "-");
      showToast("Preview removed", "success");
    } catch (e) {
      showToast(e.message || "Failed", "danger");
    }
  });

  finalBtn?.addEventListener("click", async () => {
    const parsed = parseGuessDegree(deg);
    if (!parsed.ok) {
      showToast("Enter a number between 0 and 160.", "danger");
      return;
    }
    try {
      await gameAction(room.uuid, uid, "SUBMIT_GUESS", parsed.value);
      showToast("Guess locked", "success");
    } catch (e) {
      showToast(e.message || "Failed", "danger");
    }
  });

  if (gs === "STATE_03_COUNTER_GUESS_ROUND") {
    container.insertAdjacentHTML(
      "beforeend",
      `<button type="button" class="btn btn-outline-danger w-100 mt-3 sp-reveal-any">Reveal</button>`
    );
    container.querySelector(".sp-reveal-any")?.addEventListener("click", async () => {
      try {
        await gameAction(room.uuid, uid, "REVEAL", "-");
        showToast("Reveal", "success");
      } catch (e) {
        showToast(e.message || "Failed", "danger");
      }
    });
  }
}

/** Last degree this player has in `gameGuesses` (keeps the field filled after submit / Mercure refresh). */
function guessFieldInitialValue(room, playerUuid) {
  const mine = (room.gameGuesses || []).filter(
    (g) => g.player && playerId(g.player) === playerUuid
  );
  if (!mine.length) return "";
  const last = mine[mine.length - 1];
  if (last.degree == null) return "";
  const n = Number(last.degree);
  if (!Number.isFinite(n)) return "";
  return String(n);
}

/**
 * Guess degrees must be a finite number in [0, 160] so the backend never receives "-" or garbage.
 * @returns {{ ok: true, value: string } | { ok: false }}
 */
function parseGuessDegree(input) {
  const raw = input && "value" in input ? String(input.value).trim() : "";
  if (raw === "") {
    return { ok: false };
  }
  const n = Number(raw);
  if (!Number.isFinite(n)) {
    return { ok: false };
  }
  if (n < 0 || n > 160) {
    return { ok: false };
  }
  return { ok: true, value: String(n) };
}

function wireActs(container, room, uid) {
  container.querySelectorAll(".sp-act").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const act = btn.getAttribute("data-act");
      if (!act) return;
      try {
        await gameAction(room.uuid, uid, act, "-");
        showToast("OK", "success");
      } catch (e) {
        showToast(e.message || "Failed", "danger");
      }
    });
  });
}

function shortUuid(uuid) {
  if (!uuid || uuid.length < 12) return uuid || "";
  return uuid.slice(0, 8) + "…";
}

function escapeHtml(s) {
  const d = document.createElement("div");
  d.textContent = s ?? "";
  return d.innerHTML;
}

function escapeAttr(s) {
  return String(s ?? "").replace(/"/g, "&quot;");
}
