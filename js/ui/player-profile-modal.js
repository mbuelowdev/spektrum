import { applyMusicVolume, syncBackgroundMusic } from "../bg-music.js";
import { navigatePrivacy } from "../router.js";
import * as storage from "../storage.js";

/**
 * @param {{
 *   title: string;
 *   submitLabel: string;
 *   backdropStatic?: boolean;
 *   showPrivacyLink?: boolean;
 *   showForgetMe?: boolean;
 *   onSaved?: (payload: { name: string }) => void;
 * }} opts
 * @returns {Promise<{ name: string } | null>}
 */
export function openPlayerProfileModal(opts) {
  return new Promise((resolve) => {
    let settled = false;
    const currentName = storage.getPlayerName();
    const musicOn = storage.getBackgroundMusicEnabled();
    const vol = storage.getVolume();
    const wrap = document.createElement("div");
    wrap.innerHTML = `
      <div class="modal fade" tabindex="-1" ${opts.backdropStatic ? 'data-bs-backdrop="static"' : ""}>
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">${escapeHtml(opts.title)}</h5>
              ${opts.backdropStatic ? "" : '<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>'}
            </div>
            <form class="modal-body">
              <label class="form-label">Name</label>
              <input type="text" class="form-control mb-3" id="sp-profile-name" maxlength="64" value="${escapeAttr(currentName)}" required autocomplete="nickname" />
              <div class="mb-3 sp-settings-audio">
                <div class="form-check form-switch">
                  <input class="form-check-input" type="checkbox" role="switch" id="sp-profile-bg-music" ${musicOn ? "checked" : ""} />
                  <label class="form-check-label" for="sp-profile-bg-music">Background music</label>
                </div>
                <label class="form-label small text-muted mt-2 mb-1 d-block" for="sp-profile-music-vol">Volume</label>
                <div class="d-flex align-items-center gap-2">
                  <input type="range" class="form-range flex-grow-1 m-0" id="sp-profile-music-vol" min="0" max="100" step="1" value="${vol}" ${musicOn ? "" : "disabled"} aria-valuemin="0" aria-valuemax="100" aria-valuenow="${vol}" />
                  <span class="small text-muted text-nowrap tabular-nums text-end sp-settings-vol-pct" id="sp-profile-music-vol-pct" style="width: 3.25rem; flex-shrink: 0;">${vol}%</span>
                </div>
              </div>
              ${opts.showPrivacyLink ? `
                <a href="/privacy" id="sp-profile-privacy-link" class="link-underline link-underline-opacity-0 link-underline-opacity-100-hover">
                  Open Privacy notice
                </a>` : ""}
            </form>
            <div class="modal-footer d-flex justify-content-between">
              ${opts.showForgetMe ? '<button type="button" class="btn btn-outline-danger btn-sm" id="sp-profile-forget-me">Forget me</button>' : '<span></span>'}
              <button type="button" class="btn btn-primary" id="sp-profile-save">${escapeHtml(opts.submitLabel)}</button>
            </div>
          </div>
        </div>
      </div>`;
    document.body.appendChild(wrap);

    const el = wrap.querySelector(".modal");
    const modal = new bootstrap.Modal(el);
    const bgMusicToggle = /** @type {HTMLInputElement | null} */ (wrap.querySelector("#sp-profile-bg-music"));
    const volRange = /** @type {HTMLInputElement | null} */ (wrap.querySelector("#sp-profile-music-vol"));
    const volPctEl = wrap.querySelector("#sp-profile-music-vol-pct");

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

    const finish = (payload) => {
      if (settled) return;
      settled = true;
      modal.hide();
      resolve(payload);
    };

    wrap.querySelector("#sp-profile-privacy-link")?.addEventListener("click", (e) => {
      e.preventDefault();
      finish(null);
      navigatePrivacy();
    });

    wrap.querySelector("#sp-profile-forget-me")?.addEventListener("click", () => {
      localStorage.clear();
      modal.hide();
      window.location.reload();
    });

    wrap.querySelector("#sp-profile-save")?.addEventListener("click", () => {
      const nameEl = /** @type {HTMLInputElement | null} */ (wrap.querySelector("#sp-profile-name"));
      const nextName = storage.normalizePlayerName(nameEl?.value || "");
      if (!nextName) {
        if (nameEl) {
          nameEl.setCustomValidity("Please enter your name.");
          nameEl.reportValidity();
        }
        return;
      }
      if (nameEl) nameEl.setCustomValidity("");

      storage.setPlayerName(nextName);
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
      opts.onSaved?.({ name: nextName });
      finish({ name: nextName });
    });

    modal.show();
    el.addEventListener(
      "hidden.bs.modal",
      () => {
        if (!settled) {
          resolve(null);
        }
        wrap.remove();
      },
      { once: true }
    );
  });
}

function escapeAttr(s) {
  return String(s ?? "").replace(/"/g, "&quot;");
}

function escapeHtml(s) {
  const d = document.createElement("div");
  d.textContent = s ?? "";
  return d.innerHTML;
}
