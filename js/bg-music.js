import * as storage from "./storage.js";

const SRC = "/assets/noir-background.mp3";

/** @type {HTMLAudioElement | null} */
let audio = null;

/** @type {boolean} */
let resumeListenersAttached = false;

function ensureAudio() {
  if (audio) return audio;
  audio = new Audio(SRC);
  audio.loop = true;
  audio.preload = "auto";
  return audio;
}

function applyVolumeFromStorage() {
  const a = ensureAudio();
  const pct = storage.getVolume();
  a.volume = Math.max(0, Math.min(1, pct / 100));
}

function detachResumeListeners(tryResume) {
  document.removeEventListener("pointerdown", tryResume);
  document.removeEventListener("keydown", tryResume);
  resumeListenersAttached = false;
}

/** If autoplay is blocked, start playback on the first user gesture. */
function attachResumeOnUserGesture() {
  if (resumeListenersAttached) return;
  resumeListenersAttached = true;
  const tryResume = () => {
    if (!storage.getBackgroundMusicEnabled()) {
      detachResumeListeners(tryResume);
      return;
    }
    const a = ensureAudio();
    void a
      .play()
      .then(() => {
        detachResumeListeners(tryResume);
      })
      .catch(() => {});
  };
  document.addEventListener("pointerdown", tryResume, { passive: true });
  document.addEventListener("keydown", tryResume);
}

/**
 * Call once at startup. Creates the audio element and applies stored enabled/volume state.
 */
export function initBackgroundMusic() {
  ensureAudio();
  syncBackgroundMusic();
}

/** Update volume from storage without changing play/pause. */
export function applyMusicVolume() {
  if (!audio) return;
  applyVolumeFromStorage();
}

/** Start or stop playback and volume from storage. */
export function syncBackgroundMusic() {
  applyVolumeFromStorage();
  const a = ensureAudio();
  if (storage.getBackgroundMusicEnabled()) {
    void a.play().catch(() => {
      attachResumeOnUserGesture();
    });
  } else {
    a.pause();
  }
}
