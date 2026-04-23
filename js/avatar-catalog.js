const RACCOON_IMAGE_URL = "/assets/raccoon.png";
const RACCOON_SELECTED_IMAGE_URL = "/assets/raccon_selected.png";

export const AVATAR_OPTIONS = [
  { id: "avatar_0", label: "Avatar 1", assetKey: "portrait_alpha", imageUrl: RACCOON_IMAGE_URL, imageSelectedUrl: RACCOON_SELECTED_IMAGE_URL, background: "radial-gradient(circle at 50% 45%, #8a8b91 0%, #5d5e64 38%, #2f3034 78%, #1f2023 100%)" },
  { id: "avatar_1", label: "Avatar 2", assetKey: "portrait_bravo", imageUrl: RACCOON_IMAGE_URL, imageSelectedUrl: RACCOON_SELECTED_IMAGE_URL, background: "radial-gradient(circle at 50% 45%, #909198 0%, #63646b 36%, #33343a 76%, #212227 100%)" },
  { id: "avatar_2", label: "Avatar 3", assetKey: "portrait_charlie", imageUrl: RACCOON_IMAGE_URL, imageSelectedUrl: RACCOON_SELECTED_IMAGE_URL, background: "radial-gradient(circle at 50% 45%, #86878e 0%, #595a61 38%, #2e2f34 78%, #1d1e22 100%)" },
  { id: "avatar_3", label: "Avatar 4", assetKey: "portrait_delta", imageUrl: RACCOON_IMAGE_URL, imageSelectedUrl: RACCOON_SELECTED_IMAGE_URL, background: "radial-gradient(circle at 50% 45%, #8f9097 0%, #62636a 37%, #323338 77%, #202126 100%)" },
  { id: "avatar_4", label: "Avatar 5", assetKey: "portrait_echo", imageUrl: RACCOON_IMAGE_URL, imageSelectedUrl: RACCOON_SELECTED_IMAGE_URL, background: "radial-gradient(circle at 50% 45%, #8b8c93 0%, #5f6066 36%, #313238 77%, #202126 100%)" },
  { id: "avatar_5", label: "Avatar 6", assetKey: "portrait_foxtrot", imageUrl: RACCOON_IMAGE_URL, imageSelectedUrl: RACCOON_SELECTED_IMAGE_URL, background: "radial-gradient(circle at 50% 45%, #919299 0%, #65666d 38%, #34353b 78%, #222328 100%)" },
];

export const DEFAULT_AVATAR_ID = AVATAR_OPTIONS[0].id;

export function pickRandomAvatarId() {
  const idx = Math.floor(Math.random() * AVATAR_OPTIONS.length);
  return AVATAR_OPTIONS[idx].id;
}

export function normalizeAvatarId(value) {
  const id = String(value || "");
  return AVATAR_OPTIONS.some((opt) => opt.id === id) ? id : DEFAULT_AVATAR_ID;
}

export function avatarById(id) {
  const normalized = normalizeAvatarId(id);
  return AVATAR_OPTIONS.find((opt) => opt.id === normalized) || AVATAR_OPTIONS[0];
}
