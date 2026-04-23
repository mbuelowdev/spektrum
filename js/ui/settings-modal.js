import { openPlayerProfileModal } from "./player-profile-modal.js";

/**
 * @param {{ onPlayerNameSaved?: (name: string) => void }} [opts]
 */
export function openSettingsModal(opts = {}) {
  void openPlayerProfileModal({
    title: "Settings",
    submitLabel: "Save",
    showPrivacyLink: true,
    showForgetMe: true,
    onSaved(payload) {
      opts.onPlayerNameSaved?.(payload.name);
    },
  });
}
