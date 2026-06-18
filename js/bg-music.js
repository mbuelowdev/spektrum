import * as storage from "./storage.js";

const SRC = "/assets/noir-background.mp3";
const ROOM_AMBIENCE_SRC = "/assets/background-sounds-01.mp3";

/** @type {HTMLAudioElement | null} */
let audio = null;
/** @type {HTMLAudioElement | null} */
let roomAmbienceAudio = null;
/** @type {boolean} */
let isRoomViewActive = false;

/** @type {boolean} */
let resumeListenersAttached = false;

function ensureAudio() {
  if (audio) return audio;
  audio = new Audio(SRC);
  audio.loop = true;
  audio.preload = "auto";
  return audio;
}

function ensureRoomAmbienceAudio() {
  if (roomAmbienceAudio) return roomAmbienceAudio;
  roomAmbienceAudio = new Audio(ROOM_AMBIENCE_SRC);
  roomAmbienceAudio.loop = true;
  roomAmbienceAudio.preload = "auto";
  roomAmbienceAudio.volume = 1;
  return roomAmbienceAudio;
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
    const a = isRoomViewActive ? ensureRoomAmbienceAudio() : ensureAudio();
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
  ensureRoomAmbienceAudio();
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
  const roomAmbience = ensureRoomAmbienceAudio();
  roomAmbience.volume = 1;

  roomAmbience.pause();
  a.pause();

  if (!storage.getBackgroundMusicEnabled()) {
    return;
  }

  const active = isRoomViewActive ? roomAmbience : a;
  void active.play().catch(() => {
    attachResumeOnUserGesture();
  });
}

/**
 * Enable or disable room ambience based on current route.
 * @param {boolean} inRoomView
 */
export function setRoomViewAudio(inRoomView) {
  isRoomViewActive = Boolean(inRoomView);
  syncBackgroundMusic();
}
