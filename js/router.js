const UUID_RE =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;

export function parsePath(pathname) {
  const path = pathname.replace(/\/+$/, "") || "/";
  if (path === "/" || path === "") {
    return { type: "home" };
  }
  const seg = path.slice(1).split("/")[0];
  if (UUID_RE.test(seg)) {
    return { type: "room", roomUuid: seg };
  }
  return { type: "unknown", path };
}

/** @param {string} roomUuid */
export function navigateToRoom(roomUuid) {
  history.pushState({ room: roomUuid }, "", "/" + roomUuid);
  dispatchEvent(new PopStateEvent("popstate"));
}

export function navigateHome() {
  history.pushState({}, "", "/");
  dispatchEvent(new PopStateEvent("popstate"));
}
