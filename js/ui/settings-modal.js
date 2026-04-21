import { applyMusicVolume, syncBackgroundMusic } from "../bg-music.js";
import { navigatePrivacy } from "../router.js";
import * as storage from "../storage.js";

/**
 * @param {{ onPlayerNameSaved?: (name: string) => void }} [opts]
 */
export function openSettingsModal(opts = {}) {
  const currentName = storage.getPlayerName();
  const musicOn = storage.getBackgroundMusicEnabled();
  const vol = storage.getVolume();
  const wrap = document.createElement("div");
  wrap.innerHTML = `
    <div class="modal fade" tabindex="-1">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Settings</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <label class="form-label">Name</label>
            <input type="text" class="form-control mb-3" id="sp-settings-name" maxlength="64" value="${escapeAttr(currentName)}" readonly aria-readonly="true" />
            <div class="mb-3 sp-settings-audio">
              <div class="form-check form-switch">
                <input class="form-check-input" type="checkbox" role="switch" id="sp-settings-bg-music" ${musicOn ? "checked" : ""} />
                <label class="form-check-label" for="sp-settings-bg-music">Background music</label>
              </div>
              <label class="form-label small text-muted mt-2 mb-1 d-block" for="sp-settings-music-vol">Volume</label>
              <div class="d-flex align-items-center gap-2">
                <input type="range" class="form-range flex-grow-1 m-0" id="sp-settings-music-vol" min="0" max="100" step="1" value="${vol}" ${musicOn ? "" : "disabled"} aria-valuemin="0" aria-valuemax="100" aria-valuenow="${vol}" />
                <span class="small text-muted text-nowrap tabular-nums text-end sp-settings-vol-pct" id="sp-settings-music-vol-pct" style="width: 3.25rem; flex-shrink: 0;">${vol}%</span>
              </div>
            </div>
            <a href="/privacy" id="sp-settings-privacy-link" class="link-underline link-underline-opacity-0 link-underline-opacity-100-hover">
              Open Privacy notice
            </a>
          </div>
          <div class="modal-footer d-flex justify-content-between">
            <button type="button" class="btn btn-outline-danger btn-sm" id="sp-settings-forget-me">Forget me</button>
            <button type="button" class="btn btn-primary" id="sp-settings-save">Save</button>
          </div>
        </div>
      </div>
    </div>`;
  document.body.appendChild(wrap);

  const el = wrap.querySelector(".modal");
  const modal = new bootstrap.Modal(el);
  modal.show();

  wrap.querySelector("#sp-settings-privacy-link")?.addEventListener("click", (e) => {
    e.preventDefault();
    modal.hide();
    navigatePrivacy();
  });

  const bgMusicToggle = /** @type {HTMLInputElement | null} */ (wrap.querySelector("#sp-settings-bg-music"));
  const volRange = /** @type {HTMLInputElement | null} */ (wrap.querySelector("#sp-settings-music-vol"));
  const volPctEl = wrap.querySelector("#sp-settings-music-vol-pct");

  const syncVolUi = () => {
    if (!volRange) return;
    const v = Number(volRange.value);
    const pct = Number.isFinite(v) ? Math.max(0, Math.min(100, Math.round(v))) : 0;
    volRange.setAttribute("aria-valuenow", String(pct));
    if (volPctEl) {
      volPctEl.textContent = `${pct}%`;
    }
  };

  bgMusicToggle?.addEventListener("change", () => {
    const on = Boolean(bgMusicToggle.checked);
    storage.setBackgroundMusicEnabled(on);
    if (volRange) {
      volRange.disabled = !on;
      const n = Number(volRange.value);
      if (Number.isFinite(n)) {
        storage.setVolume(n);
      }
    }
    syncBackgroundMusic();
  });

  volRange?.addEventListener("input", () => {
    const n = Number(volRange.value);
    if (!Number.isFinite(n)) return;
    storage.setVolume(n);
    applyMusicVolume();
    syncVolUi();
  });

  syncVolUi();

  wrap.querySelector("#sp-settings-save")?.addEventListener("click", () => {
    const nameEl = /** @type {HTMLInputElement | null} */ (wrap.querySelector("#sp-settings-name"));
    const next = storage.normalizePlayerName(nameEl?.value || "");
    storage.setPlayerName(next);
    opts.onPlayerNameSaved?.(next);
    if (volRange) {
      const n = Number(volRange.value);
      if (Number.isFinite(n)) {
        storage.setVolume(n);
      }
    }
    if (bgMusicToggle) {
      storage.setBackgroundMusicEnabled(Boolean(bgMusicToggle.checked));
    }
    syncBackgroundMusic();
    modal.hide();
  });

  wrap.querySelector("#sp-settings-forget-me")?.addEventListener("click", () => {
    localStorage.clear();
    modal.hide();
    window.location.reload();
  });

  el.addEventListener(
    "hidden.bs.modal",
    () => {
      wrap.remove();
    },
    { once: true }
  );
}

function escapeAttr(s) {
  return String(s).replace(/"/g, "&quot;");
}
